import { AudioGenre, AudioMood, AudioSynthPreset, MediaAsset } from '../types/studio';
import { audioEngine } from './audioEngine';
import { uid } from './defaults';

import tokyoNightImg from '../assets/images/sample_tokyo_night_1794663235898.jpg';
import coastalCliffsImg from '../assets/images/sample_coastal_cliffs_1794663236304.jpg';
import mountainSummitImg from '../assets/images/sample_mountain_summit_1794663236829.jpg';
import studioPortraitImg from '../assets/images/sample_studio_portrait_1794663237060.jpg';

export function getBuiltInAssets(): MediaAsset[] {
  const synthConfigs: Array<{
    id: string;
    name: string;
    preset: AudioSynthPreset;
    genre: AudioGenre;
    mood: AudioMood;
    category: 'music' | 'sfx';
  }> = [
    { id: 'builtin_audio_lofi', name: 'Warm Rhodes Lo-Fi', preset: 'lofi-chill', genre: 'Lo-Fi', mood: 'Chill', category: 'music' },
    { id: 'builtin_audio_lofi_midnight', name: 'Midnight Tape Beat', preset: 'lofi-midnight', genre: 'Lo-Fi', mood: 'Chill', category: 'music' },
    { id: 'builtin_audio_ambient', name: 'Horizon Ambient Pad', preset: 'ambient-pad', genre: 'Ambient', mood: 'Uplifting', category: 'music' },
    { id: 'builtin_audio_nebula', name: 'Deep Nebula Drone', preset: 'ambient-nebula', genre: 'Ambient', mood: 'Suspense', category: 'music' },
    { id: 'builtin_audio_swell', name: 'Cinematic Swell', preset: 'cinematic-swell', genre: 'Cinematic', mood: 'Dramatic', category: 'music' },
    { id: 'builtin_audio_pulse', name: 'Apex Brass Pulse', preset: 'cinematic-pulse', genre: 'Cinematic', mood: 'Energetic', category: 'music' },
    { id: 'builtin_audio_riser', name: 'Tension Riser', preset: 'cinematic-riser', genre: 'Cinematic', mood: 'Suspense', category: 'sfx' },
    { id: 'builtin_audio_arp', name: 'Neon Synthwave Arp', preset: 'electronic-arp', genre: 'Electronic', mood: 'Energetic', category: 'music' },
    { id: 'builtin_audio_pluck', name: 'Glass Pluck Minimal', preset: 'electronic-pluck', genre: 'Electronic', mood: 'Uplifting', category: 'music' },
    { id: 'builtin_audio_strum', name: 'Sunlit Acoustic Strum', preset: 'acoustic-strum', genre: 'Acoustic', mood: 'Uplifting', category: 'music' },
    { id: 'builtin_audio_piano', name: 'Felt Piano Nocturne', preset: 'acoustic-piano', genre: 'Acoustic', mood: 'Chill', category: 'music' },
    { id: 'builtin_audio_whoosh', name: 'Transition Whoosh', preset: 'whoosh-fx', genre: 'SFX', mood: 'Crisp', category: 'sfx' },
    { id: 'builtin_audio_impact', name: 'Sub Bass Impact', preset: 'sub-impact', genre: 'SFX', mood: 'Dramatic', category: 'sfx' },
    { id: 'builtin_audio_pop', name: 'UI Accent Pop', preset: 'pop-click', genre: 'SFX', mood: 'Crisp', category: 'sfx' },
    { id: 'builtin_audio_shutter', name: 'Camera Shutter Click', preset: 'shutter-click', genre: 'SFX', mood: 'Crisp', category: 'sfx' },
    { id: 'builtin_audio_glitch', name: 'Digital Glitch Spark', preset: 'glitch-spark', genre: 'SFX', mood: 'Energetic', category: 'sfx' },
    { id: 'builtin_audio_wind', name: 'Soft Wind Sweeper', preset: 'wind-sweeper', genre: 'SFX', mood: 'Chill', category: 'sfx' },
    { id: 'builtin_audio_chime', name: 'Success Chime', preset: 'success-chime', genre: 'SFX', mood: 'Uplifting', category: 'sfx' },
  ];

  const audioAssets: MediaAsset[] = synthConfigs.map((cfg) => {
    const generated = audioEngine.generateSynthTrack(cfg.id, cfg.preset);
    return {
      id: cfg.id,
      name: cfg.name,
      kind: 'audio',
      url: generated.url,
      duration: generated.duration,
      waveform: generated.waveform,
      isBuiltIn: true,
      synthPreset: cfg.preset,
      genre: cfg.genre,
      mood: cfg.mood,
      category: cfg.category,
    };
  });

  const visualAssets: MediaAsset[] = [
    {
      id: 'builtin_tokyo_night',
      name: 'Tokyo Rain Dusk',
      kind: 'image',
      url: tokyoNightImg,
      thumbnailUrl: tokyoNightImg,
      duration: 5,
      width: 1920,
      height: 1080,
      isBuiltIn: true,
    },
    {
      id: 'builtin_coastal_cliffs',
      name: 'Mediterranean Cliffs',
      kind: 'image',
      url: coastalCliffsImg,
      thumbnailUrl: coastalCliffsImg,
      duration: 5,
      width: 1920,
      height: 1080,
      isBuiltIn: true,
    },
    {
      id: 'builtin_mountain_summit',
      name: 'Alpine Sunrise Ridge',
      kind: 'image',
      url: mountainSummitImg,
      thumbnailUrl: mountainSummitImg,
      duration: 5,
      width: 1920,
      height: 1080,
      isBuiltIn: true,
    },
    {
      id: 'builtin_studio_portrait',
      name: 'Filmmaker Portrait',
      kind: 'image',
      url: studioPortraitImg,
      thumbnailUrl: studioPortraitImg,
      duration: 4,
      width: 1080,
      height: 1080,
      isBuiltIn: true,
    },
    {
      id: 'builtin_color_obsidian',
      name: 'Obsidian Plate',
      kind: 'color',
      url: '',
      color: '#0b0d11',
      duration: 4,
      isBuiltIn: true,
    },
    {
      id: 'builtin_color_slate',
      name: 'Deep Slate Plate',
      kind: 'color',
      url: '',
      color: '#172030',
      duration: 4,
      isBuiltIn: true,
    },
    {
      id: 'builtin_color_amber',
      name: 'Warm Amber Plate',
      kind: 'color',
      url: '',
      color: '#78350f',
      duration: 4,
      isBuiltIn: true,
    },
  ];

  return [...visualAssets, ...audioAssets];
}

async function extractVideoThumbnails(videoUrl: string, duration: number, count = 4): Promise<{
  width: number;
  height: number;
  thumbnails: string[];
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'auto';

    const thumbnails: string[] = [];
    let currentIdx = 0;

    video.onloadeddata = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = Math.max(90, Math.round((160 * h) / w));
      const ctx = canvas.getContext('2d');

      const captureNext = () => {
        if (currentIdx >= count) {
          resolve({ width: w, height: h, thumbnails });
          return;
        }
        const targetTime = Math.min(Math.max(0.05, (duration * (currentIdx + 0.5)) / count), Math.max(0.1, duration - 0.1));
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
          } catch {
            // ignore tainted canvas
          }
        }
        currentIdx++;
        captureNext();
      };

      captureNext();
    };

    video.onerror = () => {
      resolve({ width: 1280, height: 720, thumbnails: [] });
    };
  });
}

export async function loadLocalMediaFile(
  file: File,
  existingId?: string
): Promise<{ asset: MediaAsset; blob: Blob }> {
  const id = existingId || uid('asset');
  const url = URL.createObjectURL(file);
  const cleanName = file.name.replace(/\.[^/.]+$/, '');

  if (file.type.startsWith('video/')) {
    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = url;
      v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 5);
      v.onerror = () => resolve(5);
    });

    const { width, height, thumbnails } = await extractVideoThumbnails(url, duration, 5);
    return {
      blob: file,
      asset: {
        id,
        name: cleanName,
        kind: 'video',
        url,
        duration,
        width,
        height,
        thumbnailUrl: thumbnails[0],
        thumbnails,
        mimeType: file.type,
      },
    };
  }

  if (file.type.startsWith('audio/')) {
    try {
      const decoded = await audioEngine.decodeUrl(id, url);
      return {
        blob: file,
        asset: {
          id,
          name: cleanName,
          kind: 'audio',
          url,
          duration: decoded.duration,
          waveform: decoded.waveform,
          genre: 'SFX',
          mood: 'Crisp',
          category: 'music',
          mimeType: file.type,
        },
      };
    } catch {
      const duration = await new Promise<number>((resolve) => {
        const a = document.createElement('audio');
        a.src = url;
        a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : 10);
        a.onerror = () => resolve(10);
      });
      return {
        blob: file,
        asset: {
          id,
          name: cleanName,
          kind: 'audio',
          url,
          duration,
          waveform: Array.from({ length: 64 }, () => 0.35),
          genre: 'SFX',
          mood: 'Crisp',
          category: 'music',
          mimeType: file.type,
        },
      };
    }
  }

  const dims = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1280, height: 720 });
  });

  return {
    blob: file,
    asset: {
      id,
      name: cleanName,
      kind: 'image',
      url,
      thumbnailUrl: url,
      duration: 5,
      width: dims.width,
      height: dims.height,
      mimeType: file.type,
    },
  };
}
