import {
  AspectRatio,
  ChromaKeySettings,
  ClipColor,
  ClipTransform,
  FilterPresetId,
  StickerShape,
  TextStyle,
} from '../types/studio';

export { TRANSITION_PRESETS } from './transitionsCatalog';
export type { TransitionPresetItem } from './transitionsCatalog';
export { EFFECT_PRESETS } from './effectsCatalog';
export type { EffectPresetItem } from './effectsCatalog';

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '16:9': { width: 1280, height: 720, label: '16:9 Landscape' },
  '9:16': { width: 720, height: 1280, label: '9:16 Vertical' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square' },
  '4:5': { width: 864, height: 1080, label: '4:5 Portrait' },
};

export function getExportDimensions(
  aspectRatio: AspectRatio,
  resolution: '720p' | '1080p' | '4k'
): { width: number; height: number } {
  const shortSide = resolution === '720p' ? 720 : resolution === '1080p' ? 1080 : 2160;
  switch (aspectRatio) {
    case '16:9':
      return { width: Math.round((shortSide * 16) / 9), height: shortSide };
    case '9:16':
      return { width: shortSide, height: Math.round((shortSide * 16) / 9) };
    case '1:1':
      return { width: shortSide, height: shortSide };
    case '4:5':
      return { width: shortSide, height: Math.round((shortSide * 5) / 4) };
  }
}

export function createDefaultTransform(): ClipTransform {
  return {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    flipH: false,
    flipV: false,
    pivotX: 0,
    pivotY: 0,
  };
}

export function createDefaultColor(): ClipColor {
  return {
    preset: 'none',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    vignette: 0,
    hue: 0,
  };
}

export function createDefaultChromaKey(): ChromaKeySettings {
  return {
    enabled: false,
    color: '#00d148',
    similarity: 35,
    smoothness: 15,
  };
}

export const FILTER_PRESETS: Array<{
  id: FilterPresetId;
  name: string;
  swatch: string;
  values: Omit<ClipColor, 'preset'>;
}> = [
  {
    id: 'none',
    name: 'Original',
    swatch: 'linear-gradient(135deg, #334155, #1e293b)',
    values: { brightness: 0, contrast: 0, saturation: 0, blur: 0, vignette: 0, hue: 0 },
  },
  {
    id: 'cinema',
    name: 'Cinema Grade',
    swatch: 'linear-gradient(135deg, #0f766e, #d97706)',
    values: { brightness: -4, contrast: 18, saturation: 12, blur: 0, vignette: 28, hue: -6 },
  },
  {
    id: 'vintage',
    name: '35mm Film',
    swatch: 'linear-gradient(135deg, #b45309, #451a03)',
    values: { brightness: 4, contrast: 10, saturation: -24, blur: 0, vignette: 35, hue: 12 },
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    swatch: 'linear-gradient(135deg, #e2e8f0, #0f172a)',
    values: { brightness: -2, contrast: 32, saturation: -100, blur: 0, vignette: 40, hue: 0 },
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    swatch: 'linear-gradient(135deg, #f59e0b, #b91c1c)',
    values: { brightness: 8, contrast: 12, saturation: 22, blur: 0, vignette: 18, hue: 10 },
  },
  {
    id: 'cool',
    name: 'Nordic Slate',
    swatch: 'linear-gradient(135deg, #38bdf8, #1e293b)',
    values: { brightness: 2, contrast: 14, saturation: -18, blur: 0, vignette: 20, hue: -16 },
  },
  {
    id: 'vivid',
    name: 'Vivid Punch',
    swatch: 'linear-gradient(135deg, #f97316, #2563eb)',
    values: { brightness: 6, contrast: 20, saturation: 38, blur: 0, vignette: 10, hue: 0 },
  },
];

export const TEXT_PRESETS: Array<{ id: string; label: string; style: TextStyle; x?: number; y?: number }> = [
  {
    id: 'bold-title',
    label: 'Bold Title',
    style: {
      content: 'NOVA STUDIO',
      fontFamily: 'Outfit',
      fontSize: 74,
      fontWeight: 700,
      color: '#ffffff',
      bgColor: '#000000',
      bgOpacity: 0,
      strokeColor: '#000000',
      strokeWidth: 0,
      align: 'center',
      letterSpacing: 3,
    },
    x: 0,
    y: 0,
  },
  {
    id: 'lower-third',
    label: 'Lower Third',
    style: {
      content: 'Tokyo Dusk · 35mm Reel',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 38,
      fontWeight: 600,
      color: '#f8fafc',
      bgColor: '#0f172a',
      bgOpacity: 0.78,
      strokeColor: '#000000',
      strokeWidth: 0,
      align: 'left',
      letterSpacing: 0.5,
    },
    x: -0.18,
    y: 0.32,
  },
  {
    id: 'subtitle',
    label: 'Clean Subtitle',
    style: {
      content: 'Captured at golden hour along the coast.',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 32,
      fontWeight: 500,
      color: '#ffffff',
      bgColor: '#000000',
      bgOpacity: 0.65,
      strokeColor: '#000000',
      strokeWidth: 2,
      align: 'center',
      letterSpacing: 0,
    },
    x: 0,
    y: 0.36,
  },
  {
    id: 'chapter-stamp',
    label: 'Chapter Stamp',
    style: {
      content: 'CHAPTER 01 — SUMMIT',
      fontFamily: 'JetBrains Mono',
      fontSize: 30,
      fontWeight: 600,
      color: '#fbbf24',
      bgColor: '#111827',
      bgOpacity: 0.85,
      strokeColor: '#000000',
      strokeWidth: 0,
      align: 'center',
      letterSpacing: 4,
    },
    x: 0,
    y: -0.32,
  },
  {
    id: 'minimal-caption',
    label: 'Minimal Headline',
    style: {
      content: 'No Watermark. Zero Ads.',
      fontFamily: 'Outfit',
      fontSize: 54,
      fontWeight: 600,
      color: '#f8fafc',
      bgColor: '#000000',
      bgOpacity: 0,
      strokeColor: '#09090b',
      strokeWidth: 4,
      align: 'center',
      letterSpacing: 1,
    },
    x: 0,
    y: 0.04,
  },
];

export const STICKER_PRESETS: Array<{
  shape: StickerShape;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  textLabel?: string;
}> = [
  { shape: 'rec', label: 'REC Indicator', primaryColor: '#ef4444', secondaryColor: '#ffffff', textLabel: 'REC' },
  { shape: 'frame', label: 'Cinema Frame', primaryColor: '#f59e0b', secondaryColor: '#ffffff' },
  { shape: 'badge', label: 'Studio Badge', primaryColor: '#f59e0b', secondaryColor: '#0b0d11', textLabel: '4K HDR' },
  { shape: 'arrow', label: 'Callout Arrow', primaryColor: '#f59e0b', secondaryColor: '#ffffff' },
  { shape: 'star', label: 'Highlight Star', primaryColor: '#fbbf24', secondaryColor: '#78350f' },
  { shape: 'circle', label: 'Focus Ring', primaryColor: '#38bdf8', secondaryColor: '#ffffff' },
  { shape: 'play', label: 'Play Emblem', primaryColor: '#ffffff', secondaryColor: '#f59e0b' },
];

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const hundredths = Math.floor((safe - Math.floor(safe)) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`;
}
