import { EffectCategory, VideoEffectType } from '../types/studio';

export type EffectOverlayKind =
  | 'explicit'
  | 'aura'
  | 'rays'
  | 'particles'
  | 'rain'
  | 'shards'
  | 'matrix'
  | 'glitchBands'
  | 'rgbShift'
  | 'scanlines'
  | 'echo'
  | 'shockwave'
  | 'cracks'
  | 'vortex'
  | 'portalRing'
  | 'lightning'
  | 'smoke'
  | 'filmDamage'
  | 'mirrorGrid';

export interface EffectSpec {
  overlayKind: EffectOverlayKind;
  c1: string;
  c2: string;
  contrast?: number;
  saturation?: number;
  brightness?: number;
  hue?: number;
  blur?: number;
  sepia?: number;
  shake?: number;
  zoom?: number;
  twirl?: number;
  pixelate?: number;
  mirror?: boolean;
  kaleid?: boolean;
  flash?: boolean;
  vignette?: number;
}

export interface EffectPresetItem {
  type: VideoEffectType;
  label: string;
  category: Exclude<EffectCategory, 'All'>;
  description: string;
  swatch: string;
  spec?: EffectSpec;
}

type CategoryNoAll = Exclude<EffectCategory, 'All'>;

function toCamel(label: string): string {
  const words = label.trim().split(/[\s/-]+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function makeEffects(
  labels: string[],
  category: CategoryNoAll,
  c1: string,
  c2: string,
  overrides: Record<string, Partial<EffectSpec>> = {}
): EffectPresetItem[] {
  return labels.map((label) => {
    const low = label.toLowerCase();
    let overlayKind: EffectOverlayKind = 'aura';
    let contrast = 10;
    let saturation = 15;
    let brightness = 0;
    let hue = 0;
    let blur = 0;
    let sepia = 0;
    let shake = 0;
    let zoom = 0;
    let twirl = 0;
    let pixelate = 0;
    let mirror = false;
    let kaleid = false;
    let flash = false;
    let vignette = 0;

    if (low.includes('vhs') || low.includes('film') || low.includes('scratch') || low.includes('damage')) {
      overlayKind = 'filmDamage';
      sepia = low.includes('film') ? 35 : 0;
      contrast = 20;
      shake = low.includes('damage') || low.includes('corruption') ? 8 : 2;
    } else if (low.includes('matrix') || low.includes('code') || low.includes('data')) {
      overlayKind = 'matrix';
      contrast = 22;
      saturation = 25;
    } else if (low.includes('scan') || low.includes('hologram') || low.includes('grid')) {
      overlayKind = 'scanlines';
      contrast = 18;
      saturation = 30;
    } else if (low.includes('rgb')) {
      overlayKind = 'rgbShift';
      contrast = 20;
    } else if (low.includes('glitch') || low.includes('corruption') || low.includes('distortion')) {
      overlayKind = 'glitchBands';
      shake = low.includes('shock') ? 10 : 4;
    } else if (low.includes('pixel')) {
      overlayKind = low.includes('rain') ? 'rain' : 'particles';
      pixelate = low.includes('melt') ? 18 : 26;
    } else if (low.includes('lightning') || low.includes('thunder') || low.includes('electric')) {
      overlayKind = 'lightning';
      flash = low.includes('flash') || low.includes('strike');
      shake = low.includes('shock') || low.includes('impact') ? 12 : 4;
      contrast = 25;
    } else if (low.includes('rain') || low.includes('snow') || low.includes('blizzard')) {
      overlayKind = 'rain';
      blur = low.includes('blizzard') ? 2 : 0;
    } else if (low.includes('shard') || low.includes('crystal') || low.includes('diamond') || low.includes('ice')) {
      overlayKind = low.includes('wave') || low.includes('blast') ? 'shockwave' : 'shards';
      hue = low.includes('ice') || low.includes('frost') ? 16 : 0;
      saturation = low.includes('ice') || low.includes('frost') ? -20 : 25;
      brightness = 6;
    } else if (low.includes('crack') || low.includes('rift')) {
      overlayKind = 'cracks';
      contrast = 28;
      shake = low.includes('reality') ? 8 : 3;
    } else if (low.includes('mirror')) {
      overlayKind = 'mirrorGrid';
      mirror = !low.includes('infinity');
      kaleid = low.includes('infinity');
    } else if (low.includes('hole') || low.includes('vortex') || low.includes('tornado') || low.includes('spiral')) {
      overlayKind = 'vortex';
      twirl = 18;
      vignette = low.includes('black') ? 65 : 25;
    } else if (low.includes('portal')) {
      overlayKind = 'portalRing';
      zoom = 0.08;
    } else if (low.includes('smoke') || low.includes('mist') || low.includes('cloud') || low.includes('nebula')) {
      overlayKind = 'smoke';
      blur = low.includes('dream') ? 2 : 0;
    } else if (low.includes('echo') || low.includes('trail') || low.includes('ghost') || low.includes('phantom') || low.includes('motion')) {
      overlayKind = 'echo';
      blur = low.includes('blur') ? 5 : 1.5;
      flash = low.includes('flash');
    } else if (low.includes('blur')) {
      overlayKind = 'echo';
      blur = 8;
      shake = low.includes('shake') ? 12 : 0;
    } else if (low.includes('shake')) {
      overlayKind = 'shockwave';
      shake = 16;
    } else if (low.includes('flash') || low.includes('flare') || low.includes('ray') || low.includes('beam') || low.includes('prism')) {
      overlayKind = 'rays';
      flash = low.includes('flash') || low.includes('nuclear');
      brightness = 10;
    } else if (low.includes('burst') || low.includes('explosion') || low.includes('blast') || low.includes('impact') || low.includes('pulse') || low.includes('shock') || low.includes('ripple') || low.includes('ring') || low.includes('core')) {
      overlayKind = 'shockwave';
      zoom = low.includes('pulse') || low.includes('explosion') ? 0.12 : 0.05;
      shake = low.includes('explosion') || low.includes('impact') ? 12 : 3;
    } else if (low.includes('spark') || low.includes('dust') || low.includes('ember') || low.includes('star') || low.includes('bubble') || low.includes('splash')) {
      overlayKind = 'particles';
    } else {
      overlayKind = 'aura';
    }

    if (low.includes('dark') || low.includes('shadow')) {
      brightness -= 22;
      contrast += 25;
      vignette = Math.max(vignette, 55);
    }
    if (low.includes('bloom') || low.includes('dream') || low.includes('glow')) {
      brightness += 8;
      saturation += 15;
    }
    if (low.includes('freeze')) {
      hue = 20;
      saturation = -25;
    }

    const spec: EffectSpec = {
      overlayKind,
      c1,
      c2,
      contrast,
      saturation,
      brightness,
      hue,
      blur,
      sepia,
      shake,
      zoom,
      twirl,
      pixelate,
      mirror,
      kaleid,
      flash,
      vignette,
      ...(overrides[label] || {}),
    };

    return {
      type: toCamel(label),
      label,
      category,
      description: `${label} real-time effect`,
      swatch: `linear-gradient(135deg, ${c1}, ${c2})`,
      spec,
    };
  });
}

const CORE_EFFECTS: EffectPresetItem[] = [
  // Retro & Film
  { type: 'vhs', label: 'VHS', category: 'Retro & Film', description: 'Analog tape scanlines & tracking jitter', swatch: 'linear-gradient(135deg, #0f172a, #be123c)' },
  { type: 'noise', label: 'Noise', category: 'Retro & Film', description: 'Animated static sensor noise', swatch: 'linear-gradient(135deg, #334155, #090d16)' },
  { type: 'grain', label: 'Grain', category: 'Retro & Film', description: 'Organic 35mm cinema film grain', swatch: 'linear-gradient(135deg, #78716c, #1c1917)' },
  { type: 'film', label: 'Film', category: 'Retro & Film', description: 'Sprocket gate flicker & warm tones', swatch: 'linear-gradient(135deg, #92400e, #1e1b4b)' },
  { type: 'retro', label: 'Retro', category: 'Retro & Film', description: '90s camcorder tint & soft edge', swatch: 'linear-gradient(135deg, #0d9488, #f59e0b)' },
  { type: 'vintage', label: 'Vintage', category: 'Retro & Film', description: 'Aged sepia dust & film scratches', swatch: 'linear-gradient(135deg, #b45309, #292524)' },
  { type: 'camera', label: 'Camera', category: 'Retro & Film', description: 'Viewfinder frame & focus brackets', swatch: 'linear-gradient(135deg, #1e293b, #475569)' },

  // Glitch & Cyber
  { type: 'glitch', label: 'Glitch', category: 'Glitch & Cyber', description: 'Horizontal tear bands & RGB shift', swatch: 'linear-gradient(135deg, #ec4899, #06b6d4)' },
  { type: 'rgbSplit', label: 'RGB Split', category: 'Glitch & Cyber', description: 'Chromatic red/cyan channel separation', swatch: 'linear-gradient(135deg, #ef4444, #3b82f6)' },
  { type: 'neon', label: 'Neon', category: 'Glitch & Cyber', description: 'High-contrast electric neon rim glow', swatch: 'linear-gradient(135deg, #a855f7, #06b6d4)' },
  { type: 'cyberpunk', label: 'Cyberpunk', category: 'Glitch & Cyber', description: 'Magenta/cyan HUD scan & chromatic glow', swatch: 'linear-gradient(135deg, #d946ef, #0ea5e9)' },
  { type: 'hologram', label: 'Hologram', category: 'Glitch & Cyber', description: 'Sci-fi cyan scanlines & flicker', swatch: 'linear-gradient(135deg, #06b6d4, #0f172a)' },
  { type: 'edgeGlow', label: 'Edge Glow', category: 'Glitch & Cyber', description: 'Illuminated neon perimeter border', swatch: 'linear-gradient(135deg, #f59e0b, #111827)' },
  { type: 'strobe', label: 'Strobe', category: 'Glitch & Cyber', description: 'Rhythmic club strobe pulse', swatch: 'linear-gradient(135deg, #f8fafc, #0f172a)' },
  { type: 'effect3d', label: '3D Anaglyph', category: 'Glitch & Cyber', description: 'Stereoscopic red/blue 3D depth offset', swatch: 'linear-gradient(135deg, #ef4444, #0284c7)' },

  // Camera & Motion
  { type: 'blur', label: 'Blur', category: 'Camera & Motion', description: 'Gaussian optical lens blur', swatch: 'linear-gradient(135deg, #64748b, #1e293b)' },
  { type: 'shake', label: 'Shake', category: 'Camera & Motion', description: 'Handheld kinetic camera shake', swatch: 'linear-gradient(135deg, #f97316, #1e293b)' },
  { type: 'zoom', label: 'Zoom Pulse', category: 'Camera & Motion', description: 'Beat-synced rhythmic zoom pulse', swatch: 'linear-gradient(135deg, #f59e0b, #0f172a)' },
  { type: 'motionBlur', label: 'Motion Blur', category: 'Camera & Motion', description: 'Directional speed trail ghosting', swatch: 'linear-gradient(135deg, #38bdf8, #1e293b)' },
  { type: 'speed', label: 'Speed Lines', category: 'Camera & Motion', description: 'Radial manga action speed lines', swatch: 'linear-gradient(135deg, #e2e8f0, #090d16)' },
  { type: 'ghost', label: 'Ghost', category: 'Camera & Motion', description: 'Ethereal double-exposure trail', swatch: 'linear-gradient(135deg, #94a3b8, #0f172a)' },
  { type: 'echo', label: 'Echo', category: 'Camera & Motion', description: 'Multi-frame trailing shadow echo', swatch: 'linear-gradient(135deg, #818cf8, #1e1b4b)' },
  { type: 'dynamic', label: 'Dynamic', category: 'Camera & Motion', description: 'Punchy sway + contrast energy', swatch: 'linear-gradient(135deg, #fb923c, #7c2d12)' },
  { type: 'freeze', label: 'Freeze', category: 'Fire & Ice', description: 'Icy frost vignette & cool crystal tint', swatch: 'linear-gradient(135deg, #bae6fd, #0369a1)' },

  // Light & Glow
  { type: 'flash', label: 'Flash', category: 'Light & Glow', description: 'Periodic camera flash burst', swatch: 'linear-gradient(135deg, #ffffff, #475569)' },
  { type: 'lightLeak', label: 'Light Leak', category: 'Light & Glow', description: 'Warm amber & coral analog light leak', swatch: 'linear-gradient(135deg, #f97316, #fbbf24)' },
  { type: 'lensFlare', label: 'Lens Flare', category: 'Light & Glow', description: 'Anamorphic optical sun flare streak', swatch: 'linear-gradient(135deg, #fef08a, #0284c7)' },
  { type: 'hdr', label: 'HDR', category: 'Light & Glow', description: 'Crisp high-dynamic-range boost', swatch: 'linear-gradient(135deg, #22c55e, #eab308)' },
  { type: 'bloom', label: 'Bloom', category: 'Light & Glow', description: 'Soft luminous highlight halation', swatch: 'linear-gradient(135deg, #fde68a, #78350f)' },
  { type: 'glow', label: 'Glow', category: 'Light & Glow', description: 'Radiant ambient screen glow', swatch: 'linear-gradient(135deg, #fbbf24, #1e293b)' },
  { type: 'dream', label: 'Dream', category: 'Light & Glow', description: 'Soft pastel dreamy haze', swatch: 'linear-gradient(135deg, #f9a8d4, #a5b4fc)' },
  { type: 'colorBoost', label: 'Color Boost', category: 'Light & Glow', description: 'Rich saturation & punchy vibrance', swatch: 'linear-gradient(135deg, #f43f5e, #f59e0b)' },
  { type: 'colorShift', label: 'Color Shift', category: 'Light & Glow', description: 'Animated spectrum hue cycling', swatch: 'linear-gradient(135deg, #10b981, #8b5cf6)' },
  { type: 'dark', label: 'Dark', category: 'Light & Glow', description: 'Moody low-key shadow vignette', swatch: 'linear-gradient(135deg, #1e293b, #020617)' },
  { type: 'horror', label: 'Horror', category: 'Light & Glow', description: 'Cold desaturated dread & flicker', swatch: 'linear-gradient(135deg, #7f1d1d, #09090b)' },
  { type: 'vignettePulse', label: 'Vignette Pulse', category: 'Light & Glow', description: 'Breathing dark cinema vignette', swatch: 'linear-gradient(135deg, #334155, #020617)' },

  // Particles & Weather
  { type: 'sparkle', label: 'Sparkle', category: 'Particles & Weather', description: 'Twinkling diamond star glints', swatch: 'linear-gradient(135deg, #fef08a, #0f172a)' },
  { type: 'fire', label: 'Fire', category: 'Fire & Ice', description: 'Rising glowing embers & warm heat', swatch: 'linear-gradient(135deg, #ef4444, #f59e0b)' },
  { type: 'smoke', label: 'Smoke', category: 'Particles & Weather', description: 'Drifting atmospheric mist plumes', swatch: 'linear-gradient(135deg, #cbd5e1, #1e293b)' },
  { type: 'rain', label: 'Rain', category: 'Particles & Weather', description: 'Slanted cinematic rainfall streaks', swatch: 'linear-gradient(135deg, #38bdf8, #0f172a)' },
  { type: 'snow', label: 'Snow', category: 'Fire & Ice', description: 'Gentle drifting winter snowflakes', swatch: 'linear-gradient(135deg, #e0f2fe, #334155)' },
  { type: 'lightning', label: 'Lightning', category: 'Particles & Weather', description: 'Electric storm bolt & sky flash', swatch: 'linear-gradient(135deg, #a5f3fc, #1e1b4b)' },
  { type: 'particles', label: 'Particles', category: 'Particles & Weather', description: 'Floating golden bokeh dust motes', swatch: 'linear-gradient(135deg, #fbbf24, #090d16)' },
  { type: 'stars', label: 'Stars', category: 'Cosmic & Portal', description: 'Starfield twinkle overlay', swatch: 'linear-gradient(135deg, #e2e8f0, #020617)' },
  { type: 'bubbles', label: 'Bubbles', category: 'Water & Crystal', description: 'Iridescent rising floating bubbles', swatch: 'linear-gradient(135deg, #67e8f9, #3b82f6)' },
  { type: 'hearts', label: 'Hearts', category: 'Particles & Weather', description: 'Floating romantic glowing hearts', swatch: 'linear-gradient(135deg, #fb7185, #be123c)' },
  { type: 'energy', label: 'Energy', category: 'Cosmic & Portal', description: 'Electric aura arcs & power surge', swatch: 'linear-gradient(135deg, #22d3ee, #6366f1)' },
  { type: 'explosion', label: 'Explosion', category: 'Fire & Ice', description: 'Radial shockwave burst & sparks', swatch: 'linear-gradient(135deg, #f97316, #7f1d1d)' },
  { type: 'magic', label: 'Magic', category: 'Particles & Weather', description: 'Swirling stardust shimmer trail', swatch: 'linear-gradient(135deg, #c084fc, #f472b6)' },

  // Artistic & Distortion
  { type: 'distortion', label: 'Distortion', category: 'Artistic & Distortion', description: 'Dynamic horizontal warp bands', swatch: 'linear-gradient(135deg, #14b8a6, #3b82f6)' },
  { type: 'ripple', label: 'Ripple', category: 'Water & Crystal', description: 'Pulsing water ripple rings', swatch: 'linear-gradient(135deg, #0ea5e9, #0f172a)' },
  { type: 'wave', label: 'Wave', category: 'Water & Crystal', description: 'Fluid sinusoidal wave motion', swatch: 'linear-gradient(135deg, #06b6d4, #1e3a8a)' },
  { type: 'twirl', label: 'Twirl', category: 'Artistic & Distortion', description: 'Hypnotic spiral swirl rotation', swatch: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { type: 'pixel', label: 'Pixel', category: 'Artistic & Distortion', description: '8-bit retro pixelation', swatch: 'linear-gradient(135deg, #10b981, #064e3b)' },
  { type: 'mosaic', label: 'Mosaic', category: 'Artistic & Distortion', description: 'Coarse tile mosaic censor block', swatch: 'linear-gradient(135deg, #64748b, #0f172a)' },
  { type: 'mirror', label: 'Mirror', category: 'Artistic & Distortion', description: 'Symmetrical split horizontal mirror', swatch: 'linear-gradient(135deg, #38bdf8, #818cf8)' },
  { type: 'kaleidoscope', label: 'Kaleidoscope', category: 'Artistic & Distortion', description: 'Quad symmetrical prism reflection', swatch: 'linear-gradient(135deg, #f43f5e, #8b5cf6)' },
  { type: 'fisheye', label: 'Fisheye', category: 'Artistic & Distortion', description: 'Ultra-wide action cam barrel lens', swatch: 'linear-gradient(135deg, #0284c7, #090d16)' },
  { type: 'anime', label: 'Anime', category: 'Artistic & Distortion', description: 'Vibrant cel-shaded saturation + lines', swatch: 'linear-gradient(135deg, #f472b6, #38bdf8)' },
  { type: 'comic', label: 'Comic', category: 'Artistic & Distortion', description: 'Halftone dots & graphic novel ink', swatch: 'linear-gradient(135deg, #facc15, #dc2626)' },
  { type: 'sketch', label: 'Sketch', category: 'Artistic & Distortion', description: 'High-contrast pencil charcoal look', swatch: 'linear-gradient(135deg, #e2e8f0, #334155)' },
  { type: 'ink', label: 'Ink', category: 'Artistic & Distortion', description: 'Crisp black & white graphic ink', swatch: 'linear-gradient(135deg, #f8fafc, #020617)' },
  { type: 'paint', label: 'Paint', category: 'Artistic & Distortion', description: 'Rich impasto oil color saturation', swatch: 'linear-gradient(135deg, #fb923c, #4f46e5)' },
];

const EXPANDED_EFFECTS: EffectPresetItem[] = [
  ...makeEffects(
    [
      'Plasma Glow',
      'Energy Core',
      'Digital Storm',
      'Cyber Pulse',
      'Thunder Aura',
      'Electric Surge',
      'Laser Storm',
      'RGB Shift',
      'RGB Wave',
      'RGB Storm',
      'Pixel Rain',
      'Pixel Explosion',
      'Pixel Melt',
      'Pixel Storm',
      'Matrix Flow',
      'Matrix Decode',
      'Matrix Corruption',
      'Data Stream',
      'Code Rain',
      'Hologram Scan',
      'Hologram Drift',
      'Hologram Break',
      'Cyber Scan',
      'Cyber Grid',
      'Cyber Distortion',
      'Cyber Shock',
      'Neon Beam',
      'Neon Rain',
      'Neon Flare',
      'Neon Wave',
      'Neon Explosion',
      'Neon Pulse',
      'Neon Aura',
      'Synth Glow',
      'Synth Wave',
      'Synth Grid',
    ],
    'Glitch & Cyber',
    '#22d3ee',
    '#d946ef',
    {
      'Matrix Flow': { c1: '#22c55e', c2: '#052e16' },
      'Matrix Decode': { c1: '#4ade80', c2: '#064e3b' },
      'Matrix Corruption': { c1: '#22c55e', c2: '#ef4444' },
      'Data Stream': { c1: '#38bdf8', c2: '#0f172a' },
      'Code Rain': { c1: '#10b981', c2: '#022c22' },
      'RGB Shift': { c1: '#ef4444', c2: '#3b82f6' },
      'RGB Wave': { c1: '#f43f5e', c2: '#06b6d4' },
      'RGB Storm': { c1: '#ef4444', c2: '#22d3ee' },
    }
  ),

  ...makeEffects(
    [
      'Glow Pulse',
      'Glow Ring',
      'Glow Storm',
      'Glow Burst',
      'Bloom Light',
      'Bloom Dream',
      'Bloom Flash',
      'Dream Filter',
      'Dream Cloud',
      'Dream Echo',
      'Dream Stars',
      'Prism Light',
      'Color Blast',
      'Nuclear Flash',
      'Solar Ray',
      'Moonlight Glow',
      'Starlight Sparkle',
      'Aurora Light',
      'Aurora Wave',
      'Aurora Dream',
      'Aurora Burst',
    ],
    'Light & Glow',
    '#fde047',
    '#ec4899',
    {
      'Moonlight Glow': { c1: '#e2e8f0', c2: '#38bdf8' },
      'Aurora Light': { c1: '#10b981', c2: '#8b5cf6' },
      'Aurora Wave': { c1: '#34d399', c2: '#6366f1' },
      'Aurora Dream': { c1: '#2dd4bf', c2: '#a855f7' },
      'Aurora Burst': { c1: '#10b981', c2: '#ec4899' },
      'Solar Ray': { c1: '#f59e0b', c2: '#fef08a' },
    }
  ),

  ...makeEffects(
    [
      'Blur Dream',
      'Blur Motion',
      'Blur Shake',
      'Blur Warp',
      'Blur Wave',
      'Phantom Trail',
      'Phantom Blur',
      'Phantom Echo',
      'Phantom Drift',
      'Ghost Trail',
      'Ghost Flash',
      'Ghost Glitch',
      'Shadow Pulse',
      'Shadow Storm',
      'Shadow Warp',
      'Shadow Flow',
      'Shadow Rift',
      'Lens Warp',
      'Lens Distortion',
      'Camera Shake',
      'Camera Flash',
      'Camera Noise',
      'Infinity Mirror',
      'Mirror Reflection',
      'Mirror Echo',
      'Mirror Warp',
      'Mirror Tunnel',
    ],
    'Camera & Motion',
    '#818cf8',
    '#1e293b'
  ),

  ...makeEffects(
    [
      'VHS Damage',
      'VHS Scanline',
      'VHS Corruption',
      'VHS Static',
      'Film Grain',
      'Film Burn',
      'Film Scratch',
      'Film Damage',
      'Retro Wave',
      'Retro Light',
      'Retro Storm',
    ],
    'Retro & Film',
    '#f59e0b',
    '#7c2d12',
    {
      'VHS Damage': { c1: '#be123c', c2: '#0f172a' },
      'VHS Scanline': { c1: '#38bdf8', c2: '#090d16' },
      'Retro Wave': { c1: '#d946ef', c2: '#f97316' },
    }
  ),

  ...makeEffects(
    [
      'Smoke Explosion',
      'Smoke Trail',
      'Smoke Flow',
      'Smoke Spiral',
      'Smoke Warp',
      'Lightning Strike',
      'Lightning Wave',
      'Lightning Chain',
      'Lightning Aura',
      'Lightning Burst',
      'Thunder Flash',
      'Thunder Wave',
      'Thunder Shock',
      'Storm Burst',
      'Storm Cloud',
      'Storm Energy',
      'Snow Drift',
      'Snow Burst',
      'Snow Trail',
      'Blizzard Storm',
      'Blizzard Echo',
    ],
    'Particles & Weather',
    '#cbd5e1',
    '#38bdf8',
    {
      'Lightning Strike': { c1: '#e0f2fe', c2: '#0284c7' },
      'Thunder Flash': { c1: '#ffffff', c2: '#38bdf8' },
      'Snow Drift': { c1: '#f0f9ff', c2: '#64748b' },
    }
  ),

  ...makeEffects(
    [
      'Volcanic Heat',
      'Fire Burst',
      'Fire Trail',
      'Fire Storm',
      'Fire Aura',
      'Fire Tornado',
      'Lava Flow',
      'Lava Crack',
      'Lava Explosion',
      'Ember Glow',
      'Ember Rain',
      'Ember Storm',
      'Frost Aura',
      'Ice Crystal',
      'Ice Blast',
      'Ice Wave',
      'Ice Storm',
      'Ice Shards',
      'Ice Impact',
    ],
    'Fire & Ice',
    '#f97316',
    '#dc2626',
    {
      'Frost Aura': { c1: '#bae6fd', c2: '#0284c7' },
      'Ice Crystal': { c1: '#e0f2fe', c2: '#38bdf8' },
      'Ice Blast': { c1: '#a5f3fc', c2: '#0369a1' },
      'Ice Wave': { c1: '#67e8f9', c2: '#1d4ed8' },
      'Ice Storm': { c1: '#e0f2fe', c2: '#1e3a8a' },
      'Ice Shards': { c1: '#bae6fd', c2: '#0ea5e9' },
      'Ice Impact': { c1: '#ffffff', c2: '#38bdf8' },
    }
  ),

  ...makeEffects(
    [
      'Water Splash',
      'Water Ripple',
      'Water Tunnel',
      'Water Distortion',
      'Ocean Wave',
      'Ocean Storm',
      'Ocean Mist',
      'Bubble Flow',
      'Bubble Burst',
      'Bubble Trail',
      'Crystal Shine',
      'Diamond Spark',
      'Crystal Bloom',
      'Crystal Wave',
      'Crystal Rift',
      'Crystal Impact',
      'Crystal Aura',
      'Glass Reflection',
      'Glass Distortion',
      'Glass Spark',
    ],
    'Water & Crystal',
    '#0ea5e9',
    '#e0f2fe'
  ),

  ...makeEffects(
    [
      'Gravity Distortion',
      'Magnetic Field',
      'Cosmic Dust',
      'Nebula Cloud',
      'Dark Matter',
      'Time Freeze',
      'Time Echo',
      'Reality Crack',
      'Dimension Rift',
      'Photon Burst',
      'Quantum Glow',
      'Galaxy Dust',
      'Galaxy Warp',
      'Galaxy Storm',
      'Galaxy Tunnel',
      'Star Field',
      'Star Burst',
      'Star Rain',
      'Star Warp',
      'Meteor Trail',
      'Meteor Impact',
      'Meteor Burst',
      'Meteor Storm',
      'Black Hole',
      'White Hole',
      'Space Warp',
      'Space Rift',
      'Space Tunnel',
      'Space Storm',
      'Portal Energy',
      'Portal Rift',
      'Portal Blast',
      'Portal Pulse',
      'Nova Explosion',
      'Nova Core',
      'Nova Energy',
      'Nova Storm',
      'Nova Flash',
      'Nova Pulse',
      'Nova Drift',
      'Nova Rift',
      'Nova Warp',
      'Nova Infinity',
    ],
    'Cosmic & Portal',
    '#8b5cf6',
    '#f59e0b',
    {
      'Black Hole': { c1: '#09090b', c2: '#f59e0b' },
      'White Hole': { c1: '#ffffff', c2: '#bae6fd' },
      'Portal Energy': { c1: '#38bdf8', c2: '#f59e0b' },
      'Quantum Glow': { c1: '#a855f7', c2: '#22d3ee' },
    }
  ),
];

const seenEffects = new Set<string>();
export const EFFECT_PRESETS: EffectPresetItem[] = [
  ...CORE_EFFECTS,
  ...EXPANDED_EFFECTS,
].filter((item) => {
  if (seenEffects.has(item.type)) return false;
  seenEffects.add(item.type);
  return true;
});

export const EFFECT_SPEC_MAP = new Map<string, EffectSpec>(
  EFFECT_PRESETS.filter((p) => p.spec).map((p) => [p.type, p.spec!])
);
