export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type TrackType = 'video' | 'overlay' | 'text' | 'audio';

export type TransitionType = string;

export type TransitionCategory =
  | 'All'
  | 'Basic'
  | 'Zoom & Camera'
  | 'Motion & 3D'
  | 'Swipe & Wipes'
  | 'Flash & Light'
  | 'Break & Liquid'
  | 'Portal & Space'
  | 'Cosmic & Solar'
  | 'Quantum & Cyber'
  | 'Phantom & Shadow';

export type VideoEffectType = string;

export type EffectCategory =
  | 'All'
  | 'Retro & Film'
  | 'Glitch & Cyber'
  | 'Camera & Motion'
  | 'Light & Glow'
  | 'Particles & Weather'
  | 'Cosmic & Portal'
  | 'Fire & Ice'
  | 'Water & Crystal'
  | 'Artistic & Distortion';

export interface ClipEffect {
  id: string;
  type: VideoEffectType;
  /** 0 to 100 */
  intensity: number;
  /** 0.25 to 3 */
  speed: number;
  enabled: boolean;
}

export type AnimationPreset =
  | 'none'
  | 'fade'
  | 'pop'
  | 'slideUp'
  | 'slideDown'
  | 'zoomIn';

export type FilterPresetId =
  | 'none'
  | 'cinema'
  | 'vintage'
  | 'noir'
  | 'golden'
  | 'cool'
  | 'vivid';

export type AudioGenre = 'Lo-Fi' | 'Cinematic' | 'Electronic' | 'Acoustic' | 'Ambient' | 'SFX';

export type AudioMood = 'Chill' | 'Energetic' | 'Dramatic' | 'Uplifting' | 'Suspense' | 'Crisp';

export type AudioSynthPreset =
  | 'lofi-chill'
  | 'lofi-midnight'
  | 'ambient-pad'
  | 'ambient-nebula'
  | 'cinematic-swell'
  | 'cinematic-pulse'
  | 'cinematic-riser'
  | 'electronic-arp'
  | 'electronic-pluck'
  | 'acoustic-strum'
  | 'acoustic-piano'
  | 'whoosh-fx'
  | 'sub-impact'
  | 'pop-click'
  | 'shutter-click'
  | 'glitch-spark'
  | 'wind-sweeper'
  | 'success-chime';

export type StickerShape =
  | 'badge'
  | 'arrow'
  | 'frame'
  | 'star'
  | 'circle'
  | 'play'
  | 'rec';

export interface MediaAsset {
  id: string;
  name: string;
  kind: 'video' | 'image' | 'audio' | 'color';
  url: string;
  duration: number;
  width?: number;
  height?: number;
  color?: string;
  thumbnailUrl?: string;
  thumbnails?: string[];
  waveform?: number[];
  isBuiltIn?: boolean;
  synthPreset?: AudioSynthPreset;
  genre?: AudioGenre;
  mood?: AudioMood;
  category?: 'music' | 'sfx';
  mimeType?: string;
}

export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
}

export interface ClipColor {
  preset: FilterPresetId;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  vignette: number;
  hue: number;
}

export interface ChromaKeySettings {
  enabled: boolean;
  color: string;
  similarity: number;
  smoothness: number;
}

export interface AIMaskSettings {
  enabled: boolean;
  subjectLabel: string;
  polygon: Array<{ x: number; y: number }>;
  feather: number;
  expand: number;
  invert: boolean;
  backgroundColors: string[];
  colorCleanup: number;
}

export interface MotionKeyframe {
  time: number;
  x: number;
  y: number;
  scale: number;
  visible: boolean;
}

export interface MotionTrackSettings {
  enabled: boolean;
  targetLabel: string;
  sourceClipId?: string;
  keyframes: MotionKeyframe[];
}

export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
}

export interface StickerStyle {
  shape: StickerShape;
  primaryColor: string;
  secondaryColor: string;
  label?: string;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId?: string;
  kind: 'video' | 'image' | 'color' | 'text' | 'sticker' | 'audio';
  name: string;
  startTime: number;
  duration: number;
  sourceOffset: number;
  sourceDuration: number;
  speed: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  transform: ClipTransform;
  color: ClipColor;
  chromaKey: ChromaKeySettings;
  aiMask?: AIMaskSettings;
  motionTrack?: MotionTrackSettings;
  effects?: ClipEffect[];
  text?: TextStyle;
  sticker?: StickerStyle;
  inAnimation: AnimationPreset;
  outAnimation: AnimationPreset;
  inAnimDuration: number;
  outAnimDuration: number;
  transitionIn: {
    type: TransitionType;
    duration: number;
  };
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface ProjectState {
  id: string;
  name: string;
  updatedAt: number;
  aspectRatio: AspectRatio;
  fps: number;
  backgroundColor: string;
  tracks: Track[];
  clips: TimelineClip[];
}

export interface ExportOptions {
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  quality: 'standard' | 'high' | 'master';
  format: 'webm' | 'mp4';
}

export interface ExportedVideoRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  duration: number;
  width: number;
  height: number;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  thumbnailUrl?: string;
}
