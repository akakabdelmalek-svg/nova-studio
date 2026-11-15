import { ExportOptions, MediaAsset, ProjectState } from '../types/studio';
import { audioEngine } from './audioEngine';
import { createMediaCache, getOrCreateVideo, renderCompositionFrame } from './canvasRenderer';
import { getExportDimensions } from './defaults';

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
}

export function getSupportedExportMime(preferred: 'webm' | 'mp4'): { mimeType: string; extension: string } {
  if (preferred === 'mp4') {
    const mp4Candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,mp4a',
      'video/mp4',
    ];
    for (const mime of mp4Candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return { mimeType: mime, extension: 'mp4' };
      }
    }
  }

  const webmCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const mime of webmCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return { mimeType: mime, extension: 'webm' };
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

export async function exportProjectVideo(
  project: ProjectState,
  assetsMap: Map<string, MediaAsset>,
  totalDuration: number,
  options: ExportOptions,
  onProgress: (percent: number, currentTime: number) => void,
  signal: AbortSignal
): Promise<ExportResult> {
  if (totalDuration <= 0.05) {
    throw new Error('Timeline is empty. Add at least one clip before exporting.');
  }

  const { width, height } = getExportDimensions(project.aspectRatio, options.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const cache = createMediaCache();

  // Pre-warm images & videos
  for (const clip of project.clips) {
    if (!clip.assetId) continue;
    const asset = assetsMap.get(clip.assetId);
    if (!asset) continue;
    if (asset.kind === 'video') {
      const v = getOrCreateVideo(cache, asset);
      if (v && v.readyState < 2) {
        await new Promise<void>((res) => {
          const onReady = () => {
            v.removeEventListener('loadeddata', onReady);
            res();
          };
          v.addEventListener('loadeddata', onReady);
          setTimeout(res, 1500);
        });
      }
    }
  }

  const fps = options.fps;
  const videoBitrate =
    options.quality === 'master' ? 22_000_000 : options.quality === 'high' ? 10_000_000 : 4_500_000;

  const stream = canvas.captureStream(fps);
  const audioCtx = audioEngine.getContext();
  const audioDest = audioCtx.createMediaStreamDestination();

  // Mix timeline audio into the recording stream
  audioEngine.startPlaybackAt(0, project.clips, project.tracks, false, 1, audioDest);
  for (const track of audioDest.stream.getAudioTracks()) {
    stream.addTrack(track);
  }

  const { mimeType, extension } = getSupportedExportMime(options.format);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: videoBitrate,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingFinished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      audioEngine.stopAll();
      cache.videos.forEach((v) => v.pause());
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      audioEngine.stopAll();
      reject(new Error('MediaRecorder failed while encoding video.'));
    };
  });

  recorder.start(250);

  const startMs = performance.now();
  let rafId = 0;

  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (signal.aborted) {
        cancelAnimationFrame(rafId);
        if (recorder.state !== 'inactive') recorder.stop();
        reject(new DOMException('Export cancelled', 'AbortError'));
        return;
      }

      const elapsedSec = (performance.now() - startMs) / 1000;
      const t = Math.min(totalDuration, elapsedSec);

      // Sync video elements to timeline time
      for (const clip of project.clips) {
        if (clip.kind !== 'video' || !clip.assetId) continue;
        const asset = assetsMap.get(clip.assetId);
        if (!asset) continue;
        const vid = getOrCreateVideo(cache, asset);
        if (!vid) continue;
        if (t >= clip.startTime && t < clip.startTime + clip.duration) {
          const targetVidTime = clip.sourceOffset + (t - clip.startTime) * clip.speed;
          vid.playbackRate = Math.max(0.25, Math.min(4, clip.speed));
          if (vid.paused) {
            vid.currentTime = Math.min(targetVidTime, Math.max(0, vid.duration - 0.05));
            void vid.play().catch(() => {});
          } else if (Math.abs(vid.currentTime - targetVidTime) > 0.25) {
            vid.currentTime = targetVidTime;
          }
        } else if (!vid.paused) {
          vid.pause();
        }
      }

      renderCompositionFrame(ctx, project, assetsMap, t, width, height, cache, null, false);
      onProgress(Math.min(99, (t / totalDuration) * 100), t);

      if (elapsedSec >= totalDuration) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        onProgress(100, totalDuration);
        resolve();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });

  const blob = await recordingFinished;
  return { blob, mimeType, extension, duration: totalDuration };
}
