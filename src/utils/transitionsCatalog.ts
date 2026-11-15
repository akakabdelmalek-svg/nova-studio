import { TransitionCategory, TransitionType } from '../types/studio';

export type TransitionEngine =
  | 'explicit'
  | 'zoom'
  | 'flash'
  | 'swipe'
  | 'portal'
  | 'vortex'
  | 'break'
  | 'liquid'
  | 'cube3d'
  | 'matrix'
  | 'shockwave'
  | 'beam'
  | 'echo'
  | 'meteor'
  | 'starfield'
  | 'fold';

export interface TransitionSpec {
  engine: TransitionEngine;
  c1: string;
  c2: string;
  dir?: 'left' | 'right' | 'up' | 'down' | 'diag';
  spin?: number;
  zoom?: number;
  shake?: number;
  blur?: number;
  rings?: number;
  invert?: boolean;
}

export interface TransitionPresetItem {
  type: TransitionType;
  label: string;
  category: Exclude<TransitionCategory, 'All'>;
  description: string;
  spec?: TransitionSpec;
}

type CategoryNoAll = Exclude<TransitionCategory, 'All'>;

function toCamel(label: string): string {
  const words = label.trim().split(/[\s/-]+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function makePack(
  labels: string[],
  category: CategoryNoAll,
  c1: string,
  c2: string,
  overrides: Record<string, Partial<TransitionSpec>> = {}
): TransitionPresetItem[] {
  return labels.map((label) => {
    const low = label.toLowerCase();
    let engine: TransitionEngine = 'shockwave';
    let spin = 0;
    let zoom = 0.45;
    let shake = 0;
    let blur = 0;
    let rings = 3;
    let invert = false;
    let dir: TransitionSpec['dir'] = 'left';

    if (low.includes('zoom')) {
      engine = 'zoom';
      zoom = low.includes('hyper') || low.includes('infinite') ? 1.8 : 1.1;
      spin = low.includes('spin') || low.includes('spiral') ? 360 : 0;
      shake = low.includes('shock') || low.includes('rocket') ? 16 : 0;
      blur = low.includes('warp') || low.includes('hyper') ? 10 : 4;
    } else if (low.includes('flash')) {
      engine = 'flash';
      shake = low.includes('storm') || low.includes('burst') ? 12 : 0;
    } else if (low.includes('swipe') || low.includes('slice')) {
      engine = 'swipe';
      dir = low.includes('right')
        ? 'right'
        : low.includes('up')
          ? 'up'
          : low.includes('down')
            ? 'down'
            : low.includes('cyber') || low.includes('laser') || low.includes('crystal')
              ? 'diag'
              : 'left';
    } else if (low.includes('portal') || low.includes('hole')) {
      engine = 'portal';
      invert = low.includes('close') || low.includes('collapse') || low.includes('black');
      spin = low.includes('warp') || low.includes('galaxy') ? 220 : 45;
    } else if (low.includes('spin') || low.includes('spiral') || low.includes('tornado') || low.includes('whirl')) {
      engine = 'vortex';
      spin = 360;
      zoom = 0.6;
    } else if (low.includes('break') || low.includes('shatter') || low.includes('tear')) {
      engine = 'break';
      shake = 10;
    } else if (low.includes('liquid') || low.includes('melt') || low.includes('ink') || low.includes('paint') || low.includes('flow')) {
      engine = 'liquid';
    } else if (low.includes('cube') || low.includes('morph') || low.includes('flip')) {
      engine = 'cube3d';
    } else if (low.includes('fold')) {
      engine = 'fold';
    } else if (low.includes('matrix') || low.includes('data') || low.includes('code') || low.includes('scan') || low.includes('cyber')) {
      engine = 'matrix';
      dir = low.includes('rise') ? 'up' : 'down';
    } else if (low.includes('meteor') || low.includes('strike') || low.includes('impact') || low.includes('fall') || low.includes('rush') || low.includes('jump')) {
      engine = 'meteor';
      shake = low.includes('impact') || low.includes('strike') ? 18 : 8;
      zoom = low.includes('jump') || low.includes('rush') ? 0.9 : 0.35;
    } else if (low.includes('beam') || low.includes('flare') || low.includes('glow') || low.includes('fade') || low.includes('aurora')) {
      engine = 'beam';
    } else if (low.includes('echo') || low.includes('drift') || low.includes('blur') || low.includes('shift') || low.includes('pull') || low.includes('push')) {
      engine = 'echo';
      blur = low.includes('blur') ? 14 : 6;
      invert = low.includes('pull');
    } else if (low.includes('tunnel') || low.includes('warp') || low.includes('star') || low.includes('infinity')) {
      engine = 'starfield';
      zoom = 1.3;
      spin = low.includes('warp') ? 120 : 0;
    } else {
      engine = 'shockwave';
      rings = low.includes('storm') || low.includes('ripple') ? 5 : 3;
      shake = low.includes('explosion') || low.includes('blast') || low.includes('shock') ? 14 : 4;
    }

    const spec: TransitionSpec = {
      engine,
      c1,
      c2,
      dir,
      spin,
      zoom,
      shake,
      blur,
      rings,
      invert,
      ...(overrides[label] || {}),
    };

    return {
      type: toCamel(label),
      label,
      category,
      description: `${label} transition with synchronized motion & light FX`,
      spec,
    };
  });
}

const CORE_TRANSITIONS: TransitionPresetItem[] = [
  { type: 'none', label: 'Cut', category: 'Basic', description: 'Instant frame-accurate cut' },
  { type: 'fade', label: 'Fondu / Fade', category: 'Basic', description: 'Classic cinema fade through black' },
  { type: 'dissolve', label: 'Dissolution / Dissolve', category: 'Basic', description: 'Smooth optical cross-dissolve' },
  { type: 'flou', label: 'Flou / Blur Cross', category: 'Basic', description: 'Soft optical defocus blend' },
  { type: 'morph', label: 'Morph', category: 'Basic', description: 'Elastic scale & optical morph blend' },
  { type: 'shadowFade', label: 'Shadow Fade', category: 'Basic', description: 'Deep closing vignette shadow fade' },

  // Zoom & Camera
  { type: 'pullIn', label: 'Zoom / Pull In', category: 'Zoom & Camera', description: 'Camera push-in zoom transition' },
  { type: 'pullOut', label: 'Zoom Out / Pull Out', category: 'Zoom & Camera', description: 'Camera pull-back reveal' },
  { type: 'whipPan', label: 'Caméra / Whip Pan', category: 'Zoom & Camera', description: 'Fast horizontal camera whip pan' },
  { type: 'rotation', label: 'Rotation', category: 'Zoom & Camera', description: 'Tilted camera rotation cut' },
  { type: 'spin', label: 'Spin 360', category: 'Zoom & Camera', description: 'Full 360° spin transition' },
  { type: 'spinBlur', label: 'Tourbillon / Swirl', category: 'Zoom & Camera', description: 'Vortex swirl spin with zoom' },
  { type: 'shakeCut', label: 'Shake', category: 'Zoom & Camera', description: 'High-energy camera impact shake' },
  { type: 'warp', label: 'Warp', category: 'Zoom & Camera', description: 'Hyper-zoom lens warp' },
  { type: 'clockSpin', label: 'Clock Spin', category: 'Zoom & Camera', description: 'Fast 360° clock radial spin' },
  { type: 'cameraSnap', label: 'Camera Snap', category: 'Zoom & Camera', description: 'Mechanical shutter blades snap' },
  { type: 'infiniteZoom', label: 'Infinite Zoom', category: 'Zoom & Camera', description: 'Deep continuous zoom tunnel' },
  { type: 'droneFly', label: 'Drone Fly', category: 'Zoom & Camera', description: 'Aerial forward drone swoop' },
  { type: 'orbit', label: 'Orbit', category: 'Zoom & Camera', description: 'Curved orbital arc sweep' },
  { type: 'parallax', label: 'Parallax', category: 'Zoom & Camera', description: 'Multi-plane depth slide' },

  // Motion & 3D
  { type: 'slideLeft', label: 'Glissement / Slide Left', category: 'Motion & 3D', description: 'Smooth horizontal slide left' },
  { type: 'slideRight', label: 'Slide Right', category: 'Motion & 3D', description: 'Smooth horizontal slide right' },
  { type: 'slideUp', label: 'Slide Up', category: 'Motion & 3D', description: 'Vertical slide upward' },
  { type: 'slideDown', label: 'Slide Down', category: 'Motion & 3D', description: 'Vertical slide downward' },
  { type: 'push', label: 'Poussée / Push', category: 'Motion & 3D', description: 'Incoming clip pushes previous frame' },
  { type: 'roll', label: 'Roll', category: 'Motion & 3D', description: 'Rolling reel shift transition' },
  { type: 'stretch', label: 'Stretch', category: 'Motion & 3D', description: 'Elastic horizontal stretch pull' },
  { type: 'vitesse', label: 'Vitesse / Speed', category: 'Motion & 3D', description: 'High-speed warp glide' },
  { type: 'mouvement', label: 'Mouvement / Motion Blur', category: 'Motion & 3D', description: 'Directional velocity blur sweep' },
  { type: 'dynamic', label: 'Dynamic', category: 'Motion & 3D', description: 'Punchy beat-synced dynamic shift' },
  { type: 'bounce', label: 'Bounce', category: 'Motion & 3D', description: 'Elastic overshoot bounce cut' },
  { type: 'flip', label: 'Flip 3D', category: 'Motion & 3D', description: '3D horizontal card flip' },
  { type: 'cube', label: 'Cube 3D', category: 'Motion & 3D', description: '3D perspective cube turn' },
  { type: 'cubeRotate', label: 'Cube Rotate', category: 'Motion & 3D', description: '3D horizontal cube rotation' },
  { type: 'sphereMorph', label: 'Sphere Morph', category: 'Motion & 3D', description: 'Radial spherical lens morph' },
  { type: 'transition3d', label: '3D Swing', category: 'Motion & 3D', description: 'Depth perspective 3D tilt' },
  { type: 'doorOpen', label: 'Door Open', category: 'Motion & 3D', description: '3D double doors swinging open' },
  { type: 'doorClose', label: 'Door Close', category: 'Motion & 3D', description: 'Double doors closing & opening' },
  { type: 'fold', label: 'Fold', category: 'Motion & 3D', description: '3D origami center fold' },
  { type: 'unfold', label: 'Unfold', category: 'Motion & 3D', description: '3D origami unfold reveal' },
  { type: 'bookPage', label: 'Book Page', category: 'Motion & 3D', description: 'Curling page turn with shadow' },
  { type: 'elastic', label: 'Elastic', category: 'Motion & 3D', description: 'Rubbery elastic overshoot slide' },
  { type: 'swing', label: 'Swing', category: 'Motion & 3D', description: 'Top-hinged door swing cut' },
  { type: 'pendulum', label: 'Pendulum', category: 'Motion & 3D', description: 'Rhythmic pendulum arc sweep' },
  { type: 'rocketLaunch', label: 'Rocket Launch', category: 'Motion & 3D', description: 'Upward thrust shake & flame' },

  // Swipe & Wipes
  { type: 'swipe', label: 'Swipe / Wipe', category: 'Swipe & Wipes', description: 'Directional swipe reveal' },
  { type: 'wipe', label: 'Linear Wipe', category: 'Swipe & Wipes', description: 'Clean edge-to-edge wipe' },
  { type: 'splitHorizontal', label: 'Split Horizontal', category: 'Swipe & Wipes', description: 'Center horizontal split reveal' },
  { type: 'splitVertical', label: 'Split Vertical', category: 'Swipe & Wipes', description: 'Center vertical doors split' },
  { type: 'rideau', label: 'Rideau / Curtain', category: 'Swipe & Wipes', description: 'Stage curtain reveal wipe' },
  { type: 'curtainOpen', label: 'Curtain Open', category: 'Swipe & Wipes', description: 'Center stage curtains parting' },
  { type: 'curtainClose', label: 'Curtain Close', category: 'Swipe & Wipes', description: 'Curtains closing then revealing' },
  { type: 'circleIris', label: 'Cercle / Iris', category: 'Swipe & Wipes', description: 'Circular iris expand reveal' },
  { type: 'circleExpand', label: 'Circle Expand', category: 'Swipe & Wipes', description: 'Crisp expanding circle mask' },
  { type: 'diamondIris', label: 'Diamond Iris', category: 'Swipe & Wipes', description: 'Geometric diamond reveal' },
  { type: 'diamondFlip', label: 'Diamond Flip', category: 'Swipe & Wipes', description: 'Rotating geometric diamond flip' },
  { type: 'hexagonReveal', label: 'Hexagon Reveal', category: 'Swipe & Wipes', description: 'Expanding hexagonal aperture' },
  { type: 'triangleSwipe', label: 'Triangle Swipe', category: 'Swipe & Wipes', description: 'Angular triangle wedge wipe' },
  { type: 'crossReveal', label: 'Cross Reveal', category: 'Swipe & Wipes', description: 'Intersecting cross-bar reveal' },
  { type: 'clockWipe', label: 'Clock Wipe', category: 'Swipe & Wipes', description: 'Radial 360° clock sweep' },
  { type: 'blockFall', label: 'Block Fall', category: 'Swipe & Wipes', description: 'Grid blocks dropping down' },
  { type: 'paperTear', label: 'Paper Tear', category: 'Swipe & Wipes', description: 'Jagged torn paper split reveal' },
  { type: 'laserSwipe', label: 'Laser Swipe', category: 'Swipe & Wipes', description: 'Diagonal neon laser beam cut' },

  // Flash & Light
  { type: 'flashWhite', label: 'Flash White', category: 'Flash & Light', description: 'Beat-sync white flash transition' },
  { type: 'cameraFlash', label: 'Camera Flash', category: 'Flash & Light', description: 'Bright photography strobe flash' },
  { type: 'fadeWarm', label: 'Lumière / Light Fade', category: 'Flash & Light', description: 'Warm sunlit flare transition' },
  { type: 'burnFilm', label: 'Film Burn', category: 'Flash & Light', description: 'Organic 35mm amber film burn' },
  { type: 'cinematique', label: 'Cinématique', category: 'Flash & Light', description: 'Anamorphic letterbox dissolve' },
  { type: 'lightBeam', label: 'Light Beam', category: 'Flash & Light', description: 'Sweeping volumetric spotlight beam' },
  { type: 'particules', label: 'Particules', category: 'Flash & Light', description: 'Glowing particle burst transition' },
  { type: 'energy', label: 'Energy', category: 'Flash & Light', description: 'High-voltage cyan/amber surge' },
  { type: 'energyBurst', label: 'Energy Burst', category: 'Flash & Light', description: 'Radial plasma energy shockwave' },
  { type: 'explosion', label: 'Explosion', category: 'Flash & Light', description: 'Fiery shockwave blast & sparks' },
  { type: 'lightningStrike', label: 'Lightning Strike', category: 'Flash & Light', description: 'Jagged electric bolt flash cut' },
  { type: 'plasmaShift', label: 'Plasma Shift', category: 'Flash & Light', description: 'Iridescent neon plasma sweep' },

  // Break & Liquid
  { type: 'crystalBreak', label: 'Crystal Break', category: 'Break & Liquid', description: 'Faceted crystal shard fracture' },
  { type: 'glassShatter', label: 'Glass Shatter', category: 'Break & Liquid', description: 'Shattering triangular glass shards' },
  { type: 'liquid', label: 'Liquid', category: 'Break & Liquid', description: 'Fluid undulating wave reveal' },
  { type: 'waterWave', label: 'Water Wave', category: 'Break & Liquid', description: 'Curved ocean crest sweep' },
  { type: 'melt', label: 'Melt', category: 'Break & Liquid', description: 'Dripping vertical melt transition' },
  { type: 'inkSpread', label: 'Ink Spread', category: 'Break & Liquid', description: 'Organic expanding ink blot reveal' },
  { type: 'smokeReveal', label: 'Smoke Reveal', category: 'Break & Liquid', description: 'Soft billowing smoke cloud reveal' },
  { type: 'fireReveal', label: 'Fire Reveal', category: 'Break & Liquid', description: 'Rising flame edge burn reveal' },
  { type: 'paintSplash', label: 'Paint Splash', category: 'Break & Liquid', description: 'Radial paint splatter reveal' },
  { type: 'distorsion', label: 'Distorsion', category: 'Break & Liquid', description: 'Skewed optical wave distortion' },
  { type: 'ripple', label: 'Ripple', category: 'Break & Liquid', description: 'Concentric water ripple reveal' },

  // Portal & Space
  { type: 'portal', label: 'Portal', category: 'Portal & Space', description: 'Glowing dimensional ring portal reveal' },
  { type: 'tornado', label: 'Tornado', category: 'Portal & Space', description: 'Swirling vortex funnel spin' },
  { type: 'whirlpool', label: 'Whirlpool', category: 'Portal & Space', description: 'Concentric aquatic vortex swirl' },
  { type: 'galaxyWarp', label: 'Galaxy Warp', category: 'Portal & Space', description: 'Spiral nebula & star warp' },
  { type: 'blackHole', label: 'Black Hole', category: 'Portal & Space', description: 'Gravitational singularity pull & expand' },
  { type: 'starTunnel', label: 'Star Tunnel', category: 'Portal & Space', description: 'Hyperspace starlight streak tunnel' },
  { type: 'timeWarp', label: 'Time Warp', category: 'Portal & Space', description: 'Chromatic temporal echo tunnel' },
  { type: 'auroraFlow', label: 'Aurora Flow', category: 'Portal & Space', description: 'Shimmering aurora borealis veil' },

  // Quantum & Cyber
  { type: 'glitchCut', label: 'Glitch', category: 'Quantum & Cyber', description: 'RGB slice digital glitch cut' },
  { type: 'vhs', label: 'VHS', category: 'Quantum & Cyber', description: 'Analog VHS static tracking cut' },
  { type: 'pixelate', label: 'Pixel', category: 'Quantum & Cyber', description: 'Retro mosaic pixel dissolve' },
  { type: 'neon', label: 'Néon', category: 'Quantum & Cyber', description: 'Electric neon edge pulse cut' },
  { type: 'cyberpunk', label: 'Cyberpunk', category: 'Quantum & Cyber', description: 'Chromatic RGB aberration flash' },
  { type: 'chromaticFlash', label: 'RGB Split Flash', category: 'Quantum & Cyber', description: 'Prism RGB split burst' },
  { type: 'anime', label: 'Anime', category: 'Quantum & Cyber', description: 'Action speed-lines manga cut' },
  { type: 'gaming', label: 'Gaming', category: 'Quantum & Cyber', description: 'Diagonal HUD scan wipe' },
  { type: 'digitalScan', label: 'Digital Scan', category: 'Quantum & Cyber', description: 'Cyan laser scanner sweep' },
  { type: 'matrixDrop', label: 'Matrix Drop', category: 'Quantum & Cyber', description: 'Cascading digital rain columns' },
  { type: 'cyberSlice', label: 'Cyber Slice', category: 'Quantum & Cyber', description: 'High-speed diagonal cyber blade' },
  { type: 'hologramShift', label: 'Hologram Shift', category: 'Quantum & Cyber', description: 'Sci-fi hologram phase glitch' },
  { type: 'pixelBurst', label: 'Pixel Burst', category: 'Quantum & Cyber', description: 'Exploding pixel grid burst' },
  { type: 'pixelAssemble', label: 'Pixel Assemble', category: 'Quantum & Cyber', description: 'Tiles assembling into next frame' },
];

const EXPANDED_TRANSITIONS: TransitionPresetItem[] = [
  ...makePack(
    [
      'Spin Zoom',
      'Zoom Burst',
      'Zoom Tunnel',
      'Zoom Shock',
      'Lens Zoom',
      'Hyper Zoom',
      'Warp Zoom',
      'Spiral Zoom',
      'Rocket Zoom',
    ],
    'Zoom & Camera',
    '#38bdf8',
    '#f59e0b'
  ),

  ...makePack(
    [
      'Flash Black',
      'Flash Color',
      'Flash RGB',
      'Flash Wave',
      'Flash Burst',
      'Flash Storm',
      'Flash Lens',
      'Flash Neon',
      'Flash Energy',
    ],
    'Flash & Light',
    '#ffffff',
    '#38bdf8',
    {
      'Flash Black': { c1: '#05070a', c2: '#1e293b' },
      'Flash Color': { c1: '#f43f5e', c2: '#f59e0b' },
      'Flash RGB': { c1: '#ef4444', c2: '#06b6d4' },
      'Flash Neon': { c1: '#d946ef', c2: '#22d3ee' },
      'Flash Energy': { c1: '#22d3ee', c2: '#a855f7' },
    }
  ),

  ...makePack(
    [
      'Swipe Left',
      'Swipe Right',
      'Swipe Up',
      'Swipe Down',
      'Cyber Swipe',
      'Energy Swipe',
      'Neon Swipe',
      'Crystal Swipe',
      'Smoke Swipe',
    ],
    'Swipe & Wipes',
    '#22d3ee',
    '#d946ef',
    {
      'Crystal Swipe': { c1: '#e0f2fe', c2: '#38bdf8' },
      'Smoke Swipe': { c1: '#cbd5e1', c2: '#475569' },
    }
  ),

  ...makePack(
    [
      'Portal Open',
      'Portal Close',
      'Portal Collapse',
      'Portal Expand',
      'Portal Shock',
      'Portal Warp',
      'Portal Galaxy',
      'Portal Energy',
      'Portal Neon',
      'Portal Quantum',
    ],
    'Portal & Space',
    '#38bdf8',
    '#f59e0b',
    {
      'Portal Neon': { c1: '#d946ef', c2: '#22d3ee' },
      'Portal Quantum': { c1: '#8b5cf6', c2: '#06b6d4' },
    }
  ),

  ...makePack(
    [
      'Galaxy Tunnel',
      'Galaxy Spin',
      'Galaxy Collapse',
      'Galaxy Burst',
      'Galaxy Shift',
      'Galaxy Hole',
      'Galaxy Ripple',
      'Galaxy Storm',
      'Galaxy Nova',
      'White Hole',
      'Time Hole',
      'Gravity Pull',
      'Gravity Push',
      'Space Bend',
      'Space Tear',
      'Space Shift',
      'Space Tunnel',
      'Cosmic Jump',
    ],
    'Portal & Space',
    '#818cf8',
    '#ec4899',
    {
      'White Hole': { c1: '#ffffff', c2: '#bae6fd', invert: false },
      'Time Hole': { c1: '#38bdf8', c2: '#f59e0b', invert: true },
    }
  ),

  ...makePack(
    [
      'Ice Break',
      'Glass Break',
      'Diamond Break',
      'Mirror Break',
      'Energy Break',
      'Pixel Break',
      'Neon Break',
      'Fire Break',
      'Shock Break',
    ],
    'Break & Liquid',
    '#bae6fd',
    '#ffffff',
    {
      'Energy Break': { c1: '#22d3ee', c2: '#6366f1' },
      'Neon Break': { c1: '#d946ef', c2: '#06b6d4' },
      'Fire Break': { c1: '#f97316', c2: '#fde047' },
      'Diamond Break': { c1: '#e0f2fe', c2: '#a5f3fc' },
    }
  ),

  ...makePack(
    [
      'Liquid Flow',
      'Liquid Melt',
      'Liquid Split',
      'Liquid Warp',
      'Liquid Ripple',
      'Ink Flow',
      'Ink Splash',
      'Paint Wave',
      'Paint Burst',
    ],
    'Break & Liquid',
    '#06b6d4',
    '#3b82f6',
    {
      'Ink Flow': { c1: '#0f172a', c2: '#334155' },
      'Ink Splash': { c1: '#1e293b', c2: '#6366f1' },
      'Paint Wave': { c1: '#f43f5e', c2: '#f59e0b' },
      'Paint Burst': { c1: '#ec4899', c2: '#eab308' },
    }
  ),

  ...makePack(
    [
      'Cube Flip',
      'Cube Fold',
      'Cube Open',
      'Cube Close',
      'Cube Spin',
      'Cube Morph',
      'Hexagon Morph',
      'Diamond Morph',
    ],
    'Motion & 3D',
    '#f59e0b',
    '#38bdf8'
  ),

  ...makePack(
    [
      'Matrix Rise',
      'Matrix Scan',
      'Matrix Dissolve',
      'Matrix Warp',
      'Data Stream',
      'Code Rain',
      'Cyber Scan',
      'Cyber Jump',
      'Thunder Strike',
      'Plasma Burst',
      'Shockwave',
      'Sonic Wave',
      'Quantum Shift',
      'Quantum Jump',
      'Quantum Tunnel',
      'Quantum Warp',
      'Quantum Collapse',
    ],
    'Quantum & Cyber',
    '#22c55e',
    '#06b6d4',
    {
      'Cyber Scan': { c1: '#22d3ee', c2: '#d946ef' },
      'Cyber Jump': { c1: '#0ea5e9', c2: '#ec4899' },
      'Thunder Strike': { c1: '#e0f2fe', c2: '#38bdf8' },
      'Plasma Burst': { c1: '#d946ef', c2: '#f59e0b' },
      'Shockwave': { c1: '#f8fafc', c2: '#38bdf8' },
      'Sonic Wave': { c1: '#38bdf8', c2: '#818cf8' },
    }
  ),

  ...makePack(
    [
      'Quantum Burst',
      'Quantum Pulse',
      'Quantum Flash',
      'Quantum Fold',
      'Quantum Drift',
      'Quantum Storm',
      'Quantum Portal',
      'Quantum Rush',
      'Quantum Beam',
    ],
    'Quantum & Cyber',
    '#8b5cf6',
    '#22d3ee'
  ),

  ...makePack(
    [
      'Nova Burst',
      'Nova Flash',
      'Nova Warp',
      'Nova Portal',
      'Nova Shift',
      'Nova Collapse',
      'Nova Explosion',
      'Nova Pulse',
      'Nova Tunnel',
      'Nova Ripple',
    ],
    'Cosmic & Solar',
    '#f59e0b',
    '#f43f5e'
  ),

  ...makePack(
    [
      'Star Burst',
      'Star Jump',
      'Star Warp',
      'Star Collapse',
      'Star Merge',
      'Star Flow',
      'Star Rush',
      'Star Spin',
      'Star Impact',
    ],
    'Cosmic & Solar',
    '#fef08a',
    '#38bdf8'
  ),

  ...makePack(
    [
      'Cosmic Wave',
      'Cosmic Shift',
      'Cosmic Portal',
      'Cosmic Storm',
      'Cosmic Flash',
      'Cosmic Energy',
      'Cosmic Flow',
      'Cosmic Burst',
      'Cosmic Fold',
    ],
    'Cosmic & Solar',
    '#a855f7',
    '#38bdf8'
  ),

  ...makePack(
    [
      'Solar Flare',
      'Solar Pulse',
      'Solar Explosion',
      'Solar Wave',
      'Solar Impact',
      'Solar Blast',
      'Solar Spin',
      'Solar Tunnel',
      'Solar Warp',
      'Solar Storm',
    ],
    'Cosmic & Solar',
    '#f97316',
    '#fde047'
  ),

  ...makePack(
    [
      'Meteor Strike',
      'Meteor Fall',
      'Meteor Impact',
      'Meteor Trail',
      'Meteor Warp',
      'Meteor Burst',
      'Meteor Flash',
      'Meteor Rush',
      'Meteor Jump',
      'Meteor Spin',
    ],
    'Cosmic & Solar',
    '#fb923c',
    '#e2e8f0'
  ),

  ...makePack(
    [
      'Lunar Fade',
      'Lunar Glow',
      'Lunar Shift',
      'Lunar Flash',
      'Lunar Portal',
      'Lunar Echo',
      'Lunar Drift',
      'Lunar Collapse',
      'Lunar Beam',
      'Lunar Wave',
    ],
    'Phantom & Shadow',
    '#e2e8f0',
    '#64748b'
  ),

  ...makePack(
    [
      'Aurora Shift',
      'Aurora Beam',
      'Aurora Wave',
      'Aurora Ripple',
      'Aurora Flash',
      'Aurora Drift',
      'Aurora Burst',
      'Aurora Glow',
      'Aurora Storm',
    ],
    'Phantom & Shadow',
    '#10b981',
    '#8b5cf6'
  ),

  ...makePack(
    [
      'Phantom Fade',
      'Phantom Shift',
      'Phantom Warp',
      'Phantom Echo',
      'Phantom Pulse',
      'Phantom Storm',
      'Phantom Portal',
      'Phantom Blur',
      'Phantom Rush',
      'Phantom Jump',
    ],
    'Phantom & Shadow',
    '#94a3b8',
    '#818cf8'
  ),

  ...makePack(
    [
      'Shadow Slice',
      'Shadow Warp',
      'Shadow Portal',
      'Shadow Burst',
      'Shadow Glow',
      'Shadow Pull',
      'Shadow Push',
      'Shadow Storm',
      'Shadow Rush',
      'Shadow Collapse',
    ],
    'Phantom & Shadow',
    '#1e293b',
    '#6366f1'
  ),

  ...makePack(
    [
      'Diamond Flash',
      'Diamond Wave',
      'Diamond Warp',
      'Diamond Burst',
      'Diamond Tunnel',
      'Diamond Portal',
      'Diamond Spin',
      'Diamond Drift',
      'Diamond Glow',
    ],
    'Flash & Light',
    '#e0f2fe',
    '#38bdf8'
  ),

  ...makePack(
    [
      'Infinity Warp',
      'Infinity Jump',
      'Infinity Zoom',
      'Infinity Portal',
      'Infinity Pulse',
      'Infinity Rush',
      'Infinity Tunnel',
      'Infinity Wave',
      'Infinity Flow',
      'Infinity Spin',
    ],
    'Portal & Space',
    '#22d3ee',
    '#a855f7'
  ),
];

// Deduplicate by type preserving insertion order
const seenTypes = new Set<string>();
export const TRANSITION_PRESETS: TransitionPresetItem[] = [
  ...CORE_TRANSITIONS,
  ...EXPANDED_TRANSITIONS,
].filter((item) => {
  if (seenTypes.has(item.type)) return false;
  seenTypes.add(item.type);
  return true;
});

export const TRANSITION_SPEC_MAP = new Map<string, TransitionSpec>(
  TRANSITION_PRESETS.filter((p) => p.spec).map((p) => [p.type, p.spec!])
);
