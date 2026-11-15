import { AIMaskSettings, MediaAsset, MotionKeyframe, ProjectState, TimelineClip } from '../types/studio';
import { audioEngine } from './audioEngine';
import { MediaElementCache, getOrCreateImage, getOrCreateVideo, renderCompositionFrame } from './canvasRenderer';
import { ASPECT_RATIO_DIMENSIONS } from './defaults';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function captureClipFrameBase64(
  clip: TimelineClip,
  asset: MediaAsset,
  cache: MediaElementCache,
  localTime: number
): Promise<{ imageBase64: string; mimeType: string }> {
  const canvas = document.createElement('canvas');
  let src: HTMLImageElement | HTMLVideoElement | null = null;
  let sw = 640;
  let sh = 360;

  if (clip.kind === 'image') {
    const img = getOrCreateImage(cache, asset);
    if (!img) throw new Error('Image is still loading.');
    src = img;
    sw = img.naturalWidth;
    sh = img.naturalHeight;
  } else if (clip.kind === 'video') {
    const vid = getOrCreateVideo(cache, asset);
    if (!vid) throw new Error('Video could not be read.');
    const target = Math.min(Math.max(0, clip.sourceOffset + localTime * clip.speed), Math.max(0, (vid.duration || 1) - 0.05));
    await new Promise<void>((resolve) => {
      const onSeek = () => {
        vid.removeEventListener('seeked', onSeek);
        resolve();
      };
      vid.addEventListener('seeked', onSeek);
      vid.currentTime = target;
      setTimeout(resolve, 600);
    });
    src = vid;
    sw = vid.videoWidth || 640;
    sh = vid.videoHeight || 360;
  } else {
    throw new Error('Background removal supports image and video clips.');
  }

  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  canvas.width = Math.max(2, Math.round(sw * scale));
  canvas.height = Math.max(2, Math.round(sh * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return {
    imageBase64: dataUrl.split(',')[1],
    mimeType: 'image/jpeg',
  };
}

export async function runAIBackgroundRemoval(
  clip: TimelineClip,
  asset: MediaAsset,
  cache: MediaElementCache,
  localTime: number
): Promise<AIMaskSettings> {
  const { imageBase64, mimeType } = await captureClipFrameBase64(clip, asset, cache, localTime);
  const res = await fetch('/api/ai/remove-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Background removal failed.');
  }

  return {
    enabled: true,
    subjectLabel: data.subjectLabel || 'Foreground Subject',
    polygon: Array.isArray(data.polygon) ? data.polygon : [],
    feather: 8,
    expand: 0.02,
    invert: false,
    backgroundColors: Array.isArray(data.backgroundColors) ? data.backgroundColors : [],
    colorCleanup: 20,
  };
}

async function renderDownsampledWav(buffer: AudioBuffer, offsetSec: number, durationSec: number): Promise<string> {
  const targetRate = 16000;
  const clampedDur = Math.max(0.4, Math.min(35, durationSec));
  const frameCount = Math.max(1, Math.floor(clampedDur * targetRate));
  const offline = new OfflineAudioContext(1, frameCount, targetRate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0, Math.max(0, offsetSec % buffer.duration), clampedDur);
  const rendered = await offline.startRendering();
  const wavBlob = audioEngine.audioBufferToWav(rendered);
  return blobToBase64(wavBlob);
}

export async function runAISubtitlesFromClip(
  clip: TimelineClip,
  asset: MediaAsset
): Promise<{ transcript: string; cues: Array<{ startSec: number; endSec: number; text: string }> }> {
  let audioBase64 = '';
  let mimeType = 'audio/wav';

  if (clip.kind === 'audio') {
    let buffer = audioEngine.getBuffer(asset.id);
    if (!buffer) {
      const decoded = await audioEngine.decodeUrl(asset.id, asset.url);
      buffer = decoded.buffer;
    }
    audioBase64 = await renderDownsampledWav(buffer, clip.sourceOffset, clip.duration);
  } else if (clip.kind === 'video') {
    const res = await fetch(asset.url);
    const arr = await res.arrayBuffer();
    const ctx = audioEngine.getContext();
    try {
      const decoded = await ctx.decodeAudioData(arr);
      audioBase64 = await renderDownsampledWav(decoded, clip.sourceOffset, clip.duration);
    } catch {
      const blob = new Blob([arr], { type: asset.mimeType || 'video/mp4' });
      audioBase64 = await blobToBase64(blob);
      mimeType = asset.mimeType || 'video/mp4';
    }
  } else {
    throw new Error('Select an audio or video clip with speech to generate subtitles.');
  }

  const res = await fetch('/api/ai/generate-subtitles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      duration: clip.duration,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Subtitle generation failed.');
  }

  return {
    transcript: data.transcript || '',
    cues: Array.isArray(data.cues) ? data.cues : [],
  };
}

export async function runAIObjectTracking(
  project: ProjectState,
  assetsMap: Map<string, MediaAsset>,
  cache: MediaElementCache,
  trackedClip: TimelineClip,
  targetX: number,
  targetY: number,
  targetHint?: string
): Promise<{ targetLabel: string; keyframes: MotionKeyframe[] }> {
  const dims = ASPECT_RATIO_DIMENSIONS[project.aspectRatio];
  const sampleCount = 6;
  const offscreen = document.createElement('canvas');
  const maxW = 480;
  offscreen.width = maxW;
  offscreen.height = Math.round((maxW * dims.height) / dims.width);
  const ctx = offscreen.getContext('2d')!;

  // Temporarily hide the tracked overlay itself so we track the underlying scene cleanly
  const cleanProject: ProjectState = {
    ...project,
    clips: project.clips.filter((c) => c.id !== trackedClip.id),
  };

  const frames: Array<{ timeSec: number; imageBase64: string; mimeType: string }> = [];
  for (let i = 0; i < sampleCount; i++) {
    const ratio = i / (sampleCount - 1);
    const t = trackedClip.startTime + ratio * trackedClip.duration;

    // Seek any active video on main track to t
    for (const c of cleanProject.clips) {
      if (c.kind === 'video' && c.assetId && t >= c.startTime && t < c.startTime + c.duration) {
        const asset = assetsMap.get(c.assetId);
        if (asset) {
          const vid = getOrCreateVideo(cache, asset);
          if (vid) {
            const target = Math.min(Math.max(0, c.sourceOffset + (t - c.startTime) * c.speed), Math.max(0, (vid.duration || 1) - 0.05));
            await new Promise<void>((resolve) => {
              const onSeek = () => {
                vid.removeEventListener('seeked', onSeek);
                resolve();
              };
              vid.addEventListener('seeked', onSeek);
              vid.currentTime = target;
              setTimeout(resolve, 450);
            });
          }
        }
      }
    }

    renderCompositionFrame(
      ctx,
      cleanProject,
      assetsMap,
      t,
      offscreen.width,
      offscreen.height,
      cache,
      null,
      false
    );
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.8);
    frames.push({
      timeSec: Number(t.toFixed(2)),
      imageBase64: dataUrl.split(',')[1],
      mimeType: 'image/jpeg',
    });
  }

  const res = await fetch('/api/ai/track-object', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frames,
      targetX,
      targetY,
      targetHint,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Object tracking failed.');
  }

  return {
    targetLabel: data.targetLabel || 'Tracked Element',
    keyframes: Array.isArray(data.keyframes) ? data.keyframes : [],
  };
}
