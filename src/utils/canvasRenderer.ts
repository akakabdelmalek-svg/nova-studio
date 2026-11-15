import {
  AIMaskSettings,
  AnimationPreset,
  ChromaKeySettings,
  ClipColor,
  ClipEffect,
  MediaAsset,
  MotionTrackSettings,
  ProjectState,
  TimelineClip,
} from '../types/studio';
import { EFFECT_SPEC_MAP, EffectSpec } from './effectsCatalog';
import { TRANSITION_SPEC_MAP, TransitionSpec } from './transitionsCatalog';

export interface MediaElementCache {
  images: Map<string, HTMLImageElement>;
  videos: Map<string, HTMLVideoElement>;
  chromaBufferCanvas?: HTMLCanvasElement;
  aiMaskSourceCanvas?: HTMLCanvasElement;
  aiMaskAlphaCanvas?: HTMLCanvasElement;
  fxCanvasA?: HTMLCanvasElement;
  fxCanvasB?: HTMLCanvasElement;
  transCanvas?: HTMLCanvasElement;
}

export function createMediaCache(): MediaElementCache {
  return {
    images: new Map(),
    videos: new Map(),
  };
}

export function getOrCreateImage(cache: MediaElementCache, asset: MediaAsset): HTMLImageElement | null {
  if (!asset.url) return null;
  let img = cache.images.get(asset.id);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = asset.url;
    cache.images.set(asset.id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function getOrCreateVideo(cache: MediaElementCache, asset: MediaAsset): HTMLVideoElement | null {
  if (!asset.url) return null;
  let vid = cache.videos.get(asset.id);
  if (!vid) {
    vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.src = asset.url;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.muted = true;
    cache.videos.set(asset.id, vid);
  }
  return vid;
}

function getOffscreen(cache: MediaElementCache, slot: 'fxCanvasA' | 'fxCanvasB' | 'transCanvas', w: number, h: number): HTMLCanvasElement {
  if (!cache[slot]) {
    cache[slot] = document.createElement('canvas');
  }
  const c = cache[slot]!;
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

function buildFilterString(color: ClipColor, effects: ClipEffect[] = [], timeSec = 0): string {
  let b = 100 + color.brightness;
  let c = 100 + color.contrast;
  let s = 100 + color.saturation;
  let hue = color.hue;
  let blur = color.blur;
  let sepia = 0;
  let grayscale = 0;

  for (const fx of effects) {
    if (!fx.enabled || fx.intensity <= 0) continue;
    const k = fx.intensity / 100;
    const t = timeSec * fx.speed;
    switch (fx.type) {
      case 'blur':
        blur += k * 14;
        break;
      case 'hdr':
        c += k * 38;
        s += k * 28;
        b += k * 6;
        break;
      case 'colorBoost':
        s += k * 65;
        c += k * 15;
        break;
      case 'dark':
        b -= k * 38;
        c += k * 18;
        break;
      case 'horror':
        s -= k * 65;
        c += k * 35;
        b -= k * 22;
        hue -= k * 25;
        break;
      case 'vintage':
        sepia += k * 65;
        s -= k * 25;
        c += k * 10;
        break;
      case 'retro':
        sepia += k * 30;
        c += k * 18;
        hue += k * 12;
        break;
      case 'film':
        c += k * 22;
        b += Math.sin(t * 24) * 4 * k;
        break;
      case 'anime':
        s += k * 60;
        c += k * 28;
        break;
      case 'comic':
        c += k * 55;
        s += k * 45;
        break;
      case 'sketch':
        grayscale += k * 100;
        c += k * 65;
        b += k * 15;
        break;
      case 'ink':
        grayscale += 100;
        c += k * 95;
        break;
      case 'paint':
        s += k * 50;
        c += k * 25;
        blur += k * 1.2;
        break;
      case 'dream':
        b += k * 14;
        s -= k * 15;
        blur += k * 2.5;
        break;
      case 'colorShift':
        hue += Math.round((t * 140 * k) % 360);
        break;
      case 'freeze':
        s -= k * 35;
        hue += k * 18;
        b += k * 12;
        c += k * 14;
        break;
      case 'neon':
      case 'cyberpunk':
        c += k * 32;
        s += k * 45;
        break;
      case 'dynamic':
        c += k * 22;
        s += k * 20;
        break;
      default: {
        const spec = EFFECT_SPEC_MAP.get(fx.type);
        if (spec) {
          if (spec.brightness) b += spec.brightness * k;
          if (spec.contrast) c += spec.contrast * k;
          if (spec.saturation) s += spec.saturation * k;
          if (spec.hue) hue += spec.hue * k;
          if (spec.blur) blur += spec.blur * k;
          if (spec.sepia) sepia += spec.sepia * k;
        }
        break;
      }
    }
  }

  const parts: string[] = [];
  if (b !== 100) parts.push(`brightness(${Math.max(10, b)}%)`);
  if (c !== 100) parts.push(`contrast(${Math.max(10, c)}%)`);
  if (s !== 100) parts.push(`saturate(${Math.max(0, s)}%)`);
  if (sepia > 0) parts.push(`sepia(${Math.min(100, sepia)}%)`);
  if (grayscale > 0) parts.push(`grayscale(${Math.min(100, grayscale)}%)`);
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
  if (blur > 0) parts.push(`blur(${blur.toFixed(1)}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (Number.isNaN(num)) return [0, 209, 72];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function renderProceduralEffectOverlay(
  ctx: CanvasRenderingContext2D,
  spec: EffectSpec,
  k: number,
  t: number,
  width: number,
  height: number,
  cache: MediaElementCache
) {
  if (spec.pixelate && spec.pixelate > 0) {
    const div = Math.max(4, Math.round(spec.pixelate * k));
    const sw = Math.max(8, Math.round(width / div));
    const sh = Math.max(8, Math.round(height / div));
    const buf = getOffscreen(cache, 'fxCanvasA', sw, sh);
    const bctx = buf.getContext('2d')!;
    bctx.clearRect(0, 0, sw, sh);
    bctx.drawImage(ctx.canvas, 0, 0, sw, sh);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, width, height);
    ctx.restore();
  }

  if (spec.mirror || spec.kaleid) {
    const buf = getOffscreen(cache, 'fxCanvasA', width, height);
    const bctx = buf.getContext('2d')!;
    bctx.clearRect(0, 0, width, height);
    bctx.drawImage(ctx.canvas, 0, 0, width, height);
    const hw = width / 2;
    const hh = height / 2;
    ctx.save();
    if (spec.kaleid) {
      ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
      ctx.restore();
      ctx.save();
      ctx.translate(0, height);
      ctx.scale(1, -1);
      ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
      ctx.restore();
      ctx.save();
      ctx.translate(width, height);
      ctx.scale(-1, -1);
      ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
      ctx.restore();
    } else {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(buf, 0, 0, hw, height, 0, 0, hw, height);
    }
    ctx.restore();
  }

  if (spec.flash) {
    const pulse = Math.pow(Math.max(0, Math.sin(t * 5)), 6) * 0.72 * k;
    if (pulse > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba(spec.c1, pulse);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  switch (spec.overlayKind) {
    case 'rgbShift':
    case 'glitchBands': {
      const buf = getOffscreen(cache, 'fxCanvasA', width, height);
      const bctx = buf.getContext('2d')!;
      bctx.clearRect(0, 0, width, height);
      bctx.drawImage(ctx.canvas, 0, 0, width, height);
      const shift = 16 * k * (0.65 + 0.35 * Math.sin(t * 9));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.4 * k;
      ctx.drawImage(buf, shift, 0);
      ctx.drawImage(buf, -shift, 0);
      ctx.restore();
      if (spec.overlayKind === 'glitchBands') {
        const bands = 14;
        const bh = Math.ceil(height / bands);
        const seed = Math.floor(t * 16);
        for (let i = 0; i < bands; i++) {
          if (pseudoRand(seed * 31 + i) > 0.56) {
            const dx = (pseudoRand(seed * 19 + i) - 0.5) * 85 * k;
            ctx.drawImage(buf, 0, i * bh, width, bh, dx, i * bh, width, bh);
          }
        }
        ctx.save();
        ctx.fillStyle = rgba(spec.c1, 0.22 * k);
        ctx.fillRect(0, pseudoRand(seed + 7) * height, width, 6 + 14 * k);
        ctx.restore();
      }
      break;
    }

    case 'matrix': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cols = 22;
      const cw = width / cols;
      for (let i = 0; i < cols; i++) {
        const speed = 130 + pseudoRand(i * 11) * 140;
        const headY = ((t * speed + pseudoRand(i * 23) * height) % (height + 120)) - 60;
        for (let seg = 0; seg < 6; seg++) {
          const sy = headY - seg * 18;
          if (sy < 0 || sy > height) continue;
          ctx.fillStyle = rgba(seg === 0 ? '#ffffff' : spec.c1, (0.7 - seg * 0.1) * k);
          ctx.fillRect(i * cw + 4, sy, Math.max(4, cw * 0.45), 11);
        }
      }
      ctx.restore();
      break;
    }

    case 'scanlines': {
      ctx.save();
      ctx.fillStyle = rgba(spec.c1, 0.16 * k);
      for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1.5);
      const scanY = ((t * 160) % (height + 40)) - 20;
      ctx.fillStyle = rgba(spec.c2, 0.32 * k);
      ctx.fillRect(0, scanY, width, 6);
      ctx.strokeStyle = rgba(spec.c1, 0.22 * k);
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += Math.round(width / 10)) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'echo': {
      const buf = getOffscreen(cache, 'fxCanvasA', width, height);
      const bctx = buf.getContext('2d')!;
      bctx.clearRect(0, 0, width, height);
      bctx.drawImage(ctx.canvas, 0, 0, width, height);
      ctx.save();
      for (let c = 1; c <= 3; c++) {
        ctx.globalAlpha = (0.3 / c) * k;
        const ox = Math.sin(t * 3 - c * 0.7) * 26 * k;
        const sc = 1 + c * 0.045 * k;
        ctx.drawImage(buf, (width - width * sc) / 2 + ox, (height - height * sc) / 2, width * sc, height * sc);
      }
      ctx.restore();
      break;
    }

    case 'rain': {
      ctx.save();
      ctx.strokeStyle = rgba(spec.c1, 0.52 * k);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 65; i++) {
        const rx = (pseudoRand(i * 17) * width + t * 140) % width;
        const ry = (pseudoRand(i * 31) * height + t * 500) % height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 9, ry + 26);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'particles': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 34; i++) {
        const px = (pseudoRand(i * 29) * width + Math.sin(t * 1.4 + i) * 32) % width;
        const rawY = pseudoRand(i * 41) * height - t * 48;
        const py = ((rawY % height) + height) % height;
        ctx.fillStyle = rgba(i % 2 === 0 ? spec.c1 : spec.c2, (0.4 + 0.5 * Math.abs(Math.sin(t * 3 + i))) * k);
        ctx.beginPath();
        ctx.arc(px < 0 ? px + width : px, py, 2 + pseudoRand(i * 5) * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'shards': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 16; i++) {
        const sx = pseudoRand(i * 19) * width;
        const sy = (pseudoRand(i * 37) * height + t * 35) % height;
        const sz = (16 + pseudoRand(i * 7) * 28) * k;
        ctx.fillStyle = rgba(i % 2 === 0 ? spec.c1 : spec.c2, 0.28 * k);
        ctx.strokeStyle = rgba('#ffffff', 0.45 * k);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - sz);
        ctx.lineTo(sx + sz * 0.7, sy);
        ctx.lineTo(sx, sy + sz);
        ctx.lineTo(sx - sz * 0.7, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'cracks': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = rgba(spec.c1, 0.72 * k);
      ctx.shadowColor = spec.c2;
      ctx.shadowBlur = 12 * k;
      ctx.lineWidth = 2.5;
      for (let b = 0; b < 5; b++) {
        let cx = width * (0.2 + b * 0.15);
        let cy = height * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) {
          cx += (pseudoRand(b * 13 + s) - 0.5) * 140;
          cy += (pseudoRand(b * 7 + s * 3) - 0.5) * 140;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'lightning': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = rgba(spec.c1, 0.85 * k);
      ctx.shadowColor = spec.c2;
      ctx.shadowBlur = 18 * k;
      ctx.lineWidth = 3;
      const seed = Math.floor(t * 8);
      for (let b = 0; b < 2; b++) {
        let lx = width * (0.25 + b * 0.45 + (pseudoRand(seed + b) - 0.5) * 0.2);
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        for (let s = 1; s <= 6; s++) {
          lx += (pseudoRand(seed * 11 + s + b * 31) - 0.5) * 90;
          ctx.lineTo(lx, (s / 6) * height);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'vortex':
    case 'portalRing': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const maxR = Math.min(width, height) * (spec.overlayKind === 'portalRing' ? 0.38 : 0.46);
      for (let r = 1; r <= 4; r++) {
        ctx.strokeStyle = rgba(r % 2 === 0 ? spec.c2 : spec.c1, 0.55 * k);
        ctx.lineWidth = (5 - r) * 2.2 * k;
        ctx.beginPath();
        const a0 = t * (2.5 + r * 0.5);
        ctx.arc(width / 2, height / 2, maxR * (0.3 + r * 0.18), a0, a0 + Math.PI * 1.45);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'rays': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const fxX = width * (0.5 + 0.3 * Math.sin(t * 0.8));
      const fxY = height * 0.3;
      const grad = ctx.createRadialGradient(fxX, fxY, 4, fxX, fxY, width * 0.55);
      grad.addColorStop(0, rgba(spec.c1, 0.65 * k));
      grad.addColorStop(0.45, rgba(spec.c2, 0.28 * k));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = rgba(spec.c1, 0.28 * k);
      ctx.fillRect(0, fxY - 3, width, 6);
      ctx.restore();
      break;
    }

    case 'smoke': {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const px = ((i / 5) * width + t * 35) % (width + 180) - 90;
        const py = height * (0.45 + 0.25 * Math.sin(t + i * 1.4));
        const grad = ctx.createRadialGradient(px, py, 8, px, py, width * 0.32);
        grad.addColorStop(0, rgba(i % 2 === 0 ? spec.c1 : spec.c2, 0.32 * k));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
      break;
    }

    case 'filmDamage': {
      ctx.save();
      const seed = Math.floor(t * 16);
      ctx.strokeStyle = rgba(spec.c1, 0.32 * k);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const sx = pseudoRand(seed * 19 + i) * width;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + (pseudoRand(seed + i) - 0.5) * 12, height);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(spec.c2, 0.14 * k);
      ctx.fillRect(0, ((t * 110) % height), width, 12);
      ctx.restore();
      break;
    }

    case 'shockwave': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const p = (t * 0.8) % 1;
      const r = p * Math.max(width, height) * 0.68;
      ctx.strokeStyle = rgba(spec.c1, (1 - p) * 0.78 * k);
      ctx.lineWidth = 7 * k;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(spec.c2, (1 - p * 0.6) * 0.55 * k);
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'mirrorGrid':
    case 'aura':
    default: {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pulse = 0.7 + 0.3 * Math.sin(t * 3);
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.15, width / 2, height / 2, width * 0.72);
      grad.addColorStop(0, rgba(spec.c1, 0.12 * k * pulse));
      grad.addColorStop(0.65, rgba(spec.c2, 0.24 * k * pulse));
      grad.addColorStop(1, rgba(spec.c1, 0.42 * k * pulse));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      break;
    }
  }

  if (spec.vignette && spec.vignette > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${(spec.vignette / 100) * 0.85 * k})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function applyChromaKey(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  chroma: ChromaKeySettings,
  cache: MediaElementCache
): HTMLCanvasElement {
  if (!cache.chromaBufferCanvas) {
    cache.chromaBufferCanvas = document.createElement('canvas');
  }
  const buf = cache.chromaBufferCanvas;
  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));
  if (buf.width !== w || buf.height !== h) {
    buf.width = w;
    buf.height = h;
  }
  const bctx = buf.getContext('2d', { willReadFrequently: true })!;
  bctx.clearRect(0, 0, w, h);
  bctx.drawImage(source, 0, 0, w, h);

  const imgData = bctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const [kr, kg, kb] = hexToRgb(chroma.color);
  const threshold = (chroma.similarity / 100) * 260;
  const smooth = Math.max(4, (chroma.smoothness / 100) * 120);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt((r - kr) * (r - kr) + (g - kg) * (g - kg) + (b - kb) * (b - kb));
    if (dist < threshold) {
      data[i + 3] = 0;
    } else if (dist < threshold + smooth) {
      const alphaFactor = (dist - threshold) / smooth;
      data[i + 3] = Math.round(data[i + 3] * alphaFactor);
    }
  }
  bctx.putImageData(imgData, 0, 0);
  return buf;
}

function applyAIMask(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  srcW: number,
  srcH: number,
  aiMask: AIMaskSettings,
  cache: MediaElementCache
): HTMLCanvasElement {
  if (!cache.aiMaskSourceCanvas) {
    cache.aiMaskSourceCanvas = document.createElement('canvas');
  }
  if (!cache.aiMaskAlphaCanvas) {
    cache.aiMaskAlphaCanvas = document.createElement('canvas');
  }

  const maxDim = 720;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));

  const outCanvas = cache.aiMaskSourceCanvas;
  const maskCanvas = cache.aiMaskAlphaCanvas;
  if (outCanvas.width !== w || outCanvas.height !== h) {
    outCanvas.width = w;
    outCanvas.height = h;
  }
  if (maskCanvas.width !== w || maskCanvas.height !== h) {
    maskCanvas.width = w;
    maskCanvas.height = h;
  }

  const mctx = maskCanvas.getContext('2d')!;
  mctx.clearRect(0, 0, w, h);

  if (aiMask.polygon && aiMask.polygon.length >= 3) {
    let cx = 0;
    let cy = 0;
    for (const pt of aiMask.polygon) {
      cx += pt.x;
      cy += pt.y;
    }
    cx /= aiMask.polygon.length;
    cy /= aiMask.polygon.length;

    const expandFactor = 1 + (aiMask.expand || 0);
    mctx.save();
    if (aiMask.feather > 0) {
      mctx.filter = `blur(${aiMask.feather}px)`;
    }
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    aiMask.polygon.forEach((pt, idx) => {
      const px = ((cx + (pt.x - cx) * expandFactor) / 1000) * w;
      const py = ((cy + (pt.y - cy) * expandFactor) / 1000) * h;
      if (idx === 0) mctx.moveTo(px, py);
      else mctx.lineTo(px, py);
    });
    mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  const octx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  octx.clearRect(0, 0, w, h);
  octx.save();
  octx.drawImage(source, 0, 0, w, h);
  octx.globalCompositeOperation = aiMask.invert ? 'destination-out' : 'destination-in';
  octx.drawImage(maskCanvas, 0, 0, w, h);
  octx.restore();

  if (aiMask.colorCleanup > 0 && aiMask.backgroundColors.length > 0) {
    const imgData = octx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const bgRgbs = aiMask.backgroundColors.map(hexToRgb);
    const thresh = (aiMask.colorCleanup / 100) * 140;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0 || a === 255) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      for (const [br, bg, bb] of bgRgbs) {
        const dist = Math.sqrt((r - br) * (r - br) + (g - bg) * (g - bg) + (b - bb) * (b - bb));
        if (dist < thresh) {
          data[i + 3] = Math.round(a * (dist / thresh));
          break;
        }
      }
    }
    octx.putImageData(imgData, 0, 0);
  }

  return outCanvas;
}

export function evaluateMotionTrack(
  track: MotionTrackSettings | undefined,
  timelineTime: number
): { x: number; y: number; scale: number; visible: boolean } | null {
  if (!track || !track.enabled || track.keyframes.length === 0) return null;
  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);

  if (timelineTime <= kfs[0].time) {
    return { x: kfs[0].x, y: kfs[0].y, scale: kfs[0].scale, visible: kfs[0].visible };
  }
  const last = kfs[kfs.length - 1];
  if (timelineTime >= last.time) {
    return { x: last.x, y: last.y, scale: last.scale, visible: last.visible };
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (timelineTime >= a.time && timelineTime <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const t = (timelineTime - a.time) / span;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        scale: a.scale + (b.scale - a.scale) * t,
        visible: a.visible || b.visible,
      };
    }
  }
  return null;
}

function computeAnimState(
  clip: TimelineClip,
  localTime: number,
  canvasH: number
): { alpha: number; scale: number; offsetY: number } {
  let alpha = 1;
  let scale = 1;
  let offsetY = 0;

  const evalPreset = (preset: AnimationPreset, progress: number, isOut: boolean) => {
    const p = isOut ? 1 - progress : progress;
    const ease = 1 - Math.pow(1 - p, 3);
    switch (preset) {
      case 'fade':
        alpha *= ease;
        break;
      case 'pop':
        alpha *= Math.min(1, ease * 1.4);
        scale *= 0.65 + 0.35 * ease;
        break;
      case 'zoomIn':
        alpha *= ease;
        scale *= 1.35 - 0.35 * ease;
        break;
      case 'slideUp':
        alpha *= ease;
        offsetY += (1 - ease) * (canvasH * 0.12) * (isOut ? -1 : 1);
        break;
      case 'slideDown':
        alpha *= ease;
        offsetY -= (1 - ease) * (canvasH * 0.12) * (isOut ? -1 : 1);
        break;
      case 'none':
        break;
    }
  };

  if (clip.inAnimation !== 'none' && clip.inAnimDuration > 0 && localTime < clip.inAnimDuration) {
    evalPreset(clip.inAnimation, Math.max(0, localTime / clip.inAnimDuration), false);
  }
  const timeFromEnd = clip.duration - localTime;
  if (clip.outAnimation !== 'none' && clip.outAnimDuration > 0 && timeFromEnd < clip.outAnimDuration) {
    evalPreset(clip.outAnimation, Math.max(0, 1 - timeFromEnd / clip.outAnimDuration), true);
  }

  return { alpha, scale, offsetY };
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.15, x, y + size);
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.15, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, points = 4) {
  const innerR = outerR * 0.25;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function applyPostClipEffects(
  ctx: CanvasRenderingContext2D,
  effects: ClipEffect[],
  localTime: number,
  width: number,
  height: number,
  cache: MediaElementCache
) {
  const active = effects.filter((e) => e.enabled && e.intensity > 0);
  if (active.length === 0) return;

  for (const fx of active) {
    const k = fx.intensity / 100;
    const t = localTime * fx.speed;

    switch (fx.type) {
      case 'pixel':
      case 'mosaic': {
        const div = Math.max(4, Math.round((fx.type === 'mosaic' ? 42 : 28) * k));
        const sw = Math.max(8, Math.round(width / div));
        const sh = Math.max(8, Math.round(height / div));
        const buf = getOffscreen(cache, 'fxCanvasA', sw, sh);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, sw, sh);
        bctx.drawImage(ctx.canvas, 0, 0, sw, sh);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, width, height);
        ctx.restore();
        break;
      }

      case 'mirror': {
        const buf = getOffscreen(cache, 'fxCanvasA', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(buf, 0, 0, width / 2, height, 0, 0, width / 2, height);
        ctx.restore();
        break;
      }

      case 'kaleidoscope': {
        const buf = getOffscreen(cache, 'fxCanvasA', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        const hw = width / 2;
        const hh = height / 2;
        ctx.save();
        ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
        ctx.restore();
        ctx.save();
        ctx.translate(0, height);
        ctx.scale(1, -1);
        ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
        ctx.restore();
        ctx.save();
        ctx.translate(width, height);
        ctx.scale(-1, -1);
        ctx.drawImage(buf, 0, 0, hw, hh, 0, 0, hw, hh);
        ctx.restore();
        ctx.restore();
        break;
      }

      case 'rgbSplit':
      case 'effect3d':
      case 'cyberpunk': {
        const shift = (fx.type === 'effect3d' ? 14 : 18) * k * (0.7 + 0.3 * Math.sin(t * 8));
        const buf = getOffscreen(cache, 'fxCanvasA', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.42 * k;
        ctx.drawImage(buf, shift, 0);
        ctx.drawImage(buf, -shift, 0);
        if (fx.type === 'cyberpunk') {
          ctx.fillStyle = `rgba(217, 70, 239, ${0.12 * k})`;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
        break;
      }

      case 'glitch':
      case 'distortion':
      case 'wave': {
        const buf = getOffscreen(cache, 'fxCanvasA', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        const bands = fx.type === 'wave' ? 24 : 12;
        const bh = Math.ceil(height / bands);
        const frameSeed = Math.floor(t * 16);
        for (let i = 0; i < bands; i++) {
          let dx = 0;
          if (fx.type === 'wave') {
            dx = Math.sin(t * 6 + i * 0.55) * 26 * k;
          } else if (fx.type === 'distortion') {
            dx = Math.sin(t * 10 + i * 1.1) * 32 * k * (pseudoRand(frameSeed + i) > 0.35 ? 1 : 0.2);
          } else if (pseudoRand(frameSeed * 31 + i) > 0.58) {
            dx = (pseudoRand(frameSeed * 17 + i) - 0.5) * 90 * k;
          }
          if (Math.abs(dx) > 0.5) {
            ctx.drawImage(buf, 0, i * bh, width, bh, dx, i * bh, width, bh);
          }
        }
        if (fx.type === 'glitch') {
          ctx.save();
          ctx.fillStyle = `rgba(6, 182, 212, ${0.14 * k})`;
          const barY = pseudoRand(frameSeed + 99) * height;
          ctx.fillRect(0, barY, width, 6 + 18 * k);
          ctx.restore();
        }
        break;
      }

      case 'motionBlur':
      case 'ghost':
      case 'echo': {
        const buf = getOffscreen(cache, 'fxCanvasA', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.save();
        const copies = fx.type === 'echo' ? 4 : 3;
        for (let c = 1; c <= copies; c++) {
          ctx.globalAlpha = (0.35 / c) * k;
          const ox =
            fx.type === 'motionBlur'
              ? c * 14 * k
              : Math.sin(t * 3 - c * 0.6) * 28 * k;
          const sc = fx.type === 'ghost' || fx.type === 'echo' ? 1 + c * 0.04 * k : 1;
          const dw = width * sc;
          const dh = height * sc;
          ctx.drawImage(buf, (width - dw) / 2 + ox, (height - dh) / 2, dw, dh);
        }
        ctx.restore();
        break;
      }

      case 'vhs':
      case 'hologram':
      case 'retro': {
        ctx.save();
        ctx.fillStyle = fx.type === 'hologram' ? `rgba(6, 182, 212, ${0.18 * k})` : `rgba(0, 0, 0, ${0.22 * k})`;
        const step = fx.type === 'hologram' ? 4 : 5;
        for (let y = 0; y < height; y += step) {
          ctx.fillRect(0, y, width, 1.5);
        }
        if (fx.type === 'vhs') {
          const barY = ((t * 90) % (height + 80)) - 40;
          ctx.fillStyle = `rgba(255,255,255,${0.12 * k})`;
          ctx.fillRect(0, barY, width, 18);
          ctx.font = `600 ${Math.round(height * 0.032)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = `rgba(255,255,255,${0.65 * k})`;
          ctx.fillText('PLAY ▶', width * 0.05, height * 0.09);
        }
        ctx.restore();
        break;
      }

      case 'noise':
      case 'grain': {
        ctx.save();
        const count = Math.round((fx.type === 'noise' ? 520 : 320) * k);
        const seed = Math.floor(t * 24);
        for (let i = 0; i < count; i++) {
          const rx = pseudoRand(seed * 97 + i * 3) * width;
          const ry = pseudoRand(seed * 53 + i * 7) * height;
          const bright = pseudoRand(seed + i) > 0.5 ? 255 : 0;
          ctx.fillStyle = `rgba(${bright},${bright},${bright},${(fx.type === 'noise' ? 0.25 : 0.14) * k})`;
          ctx.fillRect(rx, ry, 2, 2);
        }
        ctx.restore();
        break;
      }

      case 'vintage':
      case 'film': {
        ctx.save();
        const seed = Math.floor(t * 14);
        ctx.strokeStyle = `rgba(255, 240, 210, ${0.22 * k})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          if (pseudoRand(seed + i * 11) > 0.45) {
            const sx = pseudoRand(seed * 19 + i) * width;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + (pseudoRand(i + seed) - 0.5) * 8, height);
            ctx.stroke();
          }
        }
        ctx.restore();
        break;
      }

      case 'camera': {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * k})`;
        ctx.lineWidth = 2;
        const pad = Math.min(width, height) * 0.06;
        const len = Math.min(width, height) * 0.07;
        // 4 viewfinder corners
        ctx.beginPath();
        ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad);
        ctx.moveTo(width - pad - len, pad); ctx.lineTo(width - pad, pad); ctx.lineTo(width - pad, pad + len);
        ctx.moveTo(pad, height - pad - len); ctx.lineTo(pad, height - pad); ctx.lineTo(pad + len, height - pad);
        ctx.moveTo(width - pad - len, height - pad); ctx.lineTo(width - pad, height - pad); ctx.lineTo(width - pad, height - pad - len);
        ctx.stroke();
        // Center reticle
        ctx.beginPath();
        ctx.moveTo(width / 2 - 14, height / 2); ctx.lineTo(width / 2 + 14, height / 2);
        ctx.moveTo(width / 2, height / 2 - 14); ctx.lineTo(width / 2, height / 2 + 14);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'speed': {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.38 * k})`;
        const lines = 36;
        const seed = Math.floor(t * 20);
        for (let i = 0; i < lines; i++) {
          const angle = (i / lines) * Math.PI * 2 + pseudoRand(seed + i) * 0.1;
          const r1 = Math.min(width, height) * (0.28 + pseudoRand(i + seed) * 0.15);
          const r2 = Math.max(width, height) * 0.85;
          ctx.lineWidth = 1 + pseudoRand(i * 5 + seed) * 2.5;
          ctx.beginPath();
          ctx.moveTo(width / 2 + Math.cos(angle) * r1, height / 2 + Math.sin(angle) * r1);
          ctx.lineTo(width / 2 + Math.cos(angle) * r2, height / 2 + Math.sin(angle) * r2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'edgeGlow':
      case 'neon': {
        ctx.save();
        ctx.strokeStyle = fx.type === 'neon' ? `rgba(168, 85, 247, ${0.75 * k})` : `rgba(245, 158, 11, ${0.8 * k})`;
        ctx.lineWidth = 12 * k;
        ctx.shadowColor = fx.type === 'neon' ? '#22d3ee' : '#f59e0b';
        ctx.shadowBlur = 28 * k;
        ctx.strokeRect(6, 6, width - 12, height - 12);
        ctx.restore();
        break;
      }

      case 'lightLeak':
      case 'fire': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const px = width * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4)));
        const grad = ctx.createRadialGradient(px, height * 0.85, 10, px, height * 0.7, width * 0.65);
        grad.addColorStop(0, `rgba(251, 146, 60, ${0.65 * k})`);
        grad.addColorStop(0.5, `rgba(239, 68, 68, ${0.3 * k})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        if (fx.type === 'fire') {
          for (let i = 0; i < 32; i++) {
            const ex = pseudoRand(i * 13) * width;
            const ey = height - ((t * 140 + i * 45) % height);
            ctx.fillStyle = `rgba(251, 191, 36, ${0.75 * k})`;
            ctx.beginPath();
            ctx.arc(ex + Math.sin(t * 4 + i) * 14, ey, 2 + pseudoRand(i) * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        break;
      }

      case 'lensFlare': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const fxX = width * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.9)));
        const fxY = height * 0.25;
        const grad = ctx.createRadialGradient(fxX, fxY, 4, fxX, fxY, width * 0.45);
        grad.addColorStop(0, `rgba(255, 250, 210, ${0.85 * k})`);
        grad.addColorStop(0.25, `rgba(56, 189, 248, ${0.28 * k})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        // Anamorphic horizontal streak
        ctx.fillStyle = `rgba(186, 230, 253, ${0.35 * k})`;
        ctx.fillRect(0, fxY - 3, width, 6);
        ctx.restore();
        break;
      }

      case 'bloom':
      case 'glow': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.7);
        grad.addColorStop(0, `rgba(255, 244, 214, ${0.28 * k})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;
      }

      case 'flash':
      case 'strobe':
      case 'lightning': {
        ctx.save();
        const pulse =
          fx.type === 'strobe'
            ? (Math.sin(t * 28) > 0.35 ? 0.65 * k : 0)
            : Math.pow(Math.max(0, Math.sin(t * 4.5)), 6) * 0.8 * k;
        if (pulse > 0.02) {
          ctx.fillStyle = fx.type === 'lightning' ? `rgba(186, 230, 253, ${pulse})` : `rgba(255, 255, 255, ${pulse})`;
          ctx.fillRect(0, 0, width, height);
        }
        if (fx.type === 'lightning' && pulse > 0.25) {
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 3;
          ctx.beginPath();
          let lx = width * (0.3 + 0.4 * pseudoRand(Math.floor(t * 4)));
          let ly = 0;
          ctx.moveTo(lx, ly);
          for (let s = 1; s <= 7; s++) {
            lx += (pseudoRand(s * 17 + Math.floor(t * 10)) - 0.5) * 90;
            ly = (s / 7) * height * 0.8;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'sparkle':
      case 'stars':
      case 'magic': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const count = fx.type === 'stars' ? 42 : 24;
        for (let i = 0; i < count; i++) {
          const sx = pseudoRand(i * 19 + 3) * width;
          const sy = pseudoRand(i * 37 + 7) * height;
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 4 + i * 1.3));
          ctx.fillStyle =
            fx.type === 'magic'
              ? `rgba(${i % 2 === 0 ? '216,180,254' : '244,114,182'}, ${twinkle * k})`
              : `rgba(255, 250, 220, ${twinkle * k})`;
          drawStar(ctx, sx, sy, (4 + pseudoRand(i) * 10) * twinkle, 4);
        }
        ctx.restore();
        break;
      }

      case 'particles': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 30; i++) {
          const px = (pseudoRand(i * 29) * width + Math.sin(t + i) * 35) % width;
          const py = (pseudoRand(i * 41) * height - t * 30) % height;
          const normY = py < 0 ? py + height : py;
          ctx.fillStyle = `rgba(251, 191, 36, ${(0.3 + 0.5 * pseudoRand(i)) * k})`;
          ctx.beginPath();
          ctx.arc(px, normY, 2 + pseudoRand(i * 3) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'snow': {
        ctx.save();
        for (let i = 0; i < 45; i++) {
          const sx = (pseudoRand(i * 23) * width + Math.sin(t * 1.5 + i) * 24) % width;
          const sy = (pseudoRand(i * 47) * height + t * (60 + pseudoRand(i) * 50)) % height;
          ctx.fillStyle = `rgba(240, 249, 255, ${0.75 * k})`;
          ctx.beginPath();
          ctx.arc(sx < 0 ? sx + width : sx, sy, 1.8 + pseudoRand(i) * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'rain': {
        ctx.save();
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.48 * k})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 65; i++) {
          const rx = (pseudoRand(i * 17) * width + t * 120) % width;
          const ry = (pseudoRand(i * 31) * height + t * 520) % height;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 8, ry + 26);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'bubbles': {
        ctx.save();
        for (let i = 0; i < 20; i++) {
          const bx = (pseudoRand(i * 19) * width + Math.sin(t * 2 + i) * 20) % width;
          const rawY = pseudoRand(i * 43) * height - t * (55 + pseudoRand(i) * 40);
          const by = ((rawY % height) + height) % height;
          const r = 6 + pseudoRand(i * 7) * 16;
          ctx.strokeStyle = `rgba(165, 243, 252, ${0.6 * k})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'hearts': {
        ctx.save();
        for (let i = 0; i < 16; i++) {
          const hx = (pseudoRand(i * 23) * width + Math.sin(t * 2 + i) * 24) % width;
          const rawY = pseudoRand(i * 59) * height - t * (65 + pseudoRand(i) * 35);
          const hy = ((rawY % height) + height) % height;
          ctx.fillStyle = `rgba(251, 113, 133, ${0.75 * k})`;
          drawHeart(ctx, hx, hy, 14 + pseudoRand(i) * 16);
        }
        ctx.restore();
        break;
      }

      case 'smoke': {
        ctx.save();
        for (let i = 0; i < 6; i++) {
          const px = ((i / 6) * width + t * 30) % (width + 200) - 100;
          const py = height * (0.65 + 0.15 * Math.sin(t + i));
          const grad = ctx.createRadialGradient(px, py, 10, px, py, width * 0.28);
          grad.addColorStop(0, `rgba(203, 213, 225, ${0.26 * k})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
        break;
      }

      case 'energy':
      case 'explosion': {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const r = ((t * 0.85) % 1) * Math.max(width, height) * 0.7;
        ctx.strokeStyle =
          fx.type === 'explosion'
            ? `rgba(249, 115, 22, ${(1 - r / (width * 0.8)) * k})`
            : `rgba(34, 211, 238, ${0.7 * k})`;
        ctx.lineWidth = 6 * k;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'ripple': {
        ctx.save();
        const r = ((t * 0.55) % 1) * Math.max(width, height) * 0.65;
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.35 * k})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'comic': {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.14 * k})`;
        for (let y = 8; y < height; y += 18) {
          for (let x = 8; x < width; x += 18) {
            ctx.beginPath();
            ctx.arc(x, y, 2.2 * k, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        break;
      }

      case 'fisheye':
      case 'vignettePulse': {
        ctx.save();
        const pulse = fx.type === 'vignettePulse' ? 0.55 + 0.45 * Math.sin(t * 5) : 0.85;
        const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.68);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${0.78 * k * pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;
      }

      default: {
        const spec = EFFECT_SPEC_MAP.get(fx.type);
        if (spec) {
          renderProceduralEffectOverlay(ctx, spec, k, t, width, height, cache);
        }
        break;
      }
    }
  }
}

function drawVisualClip(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  asset: MediaAsset | undefined,
  localTime: number,
  timelineTime: number,
  width: number,
  height: number,
  cache: MediaElementCache,
  isMainTrack: boolean,
  extraAlpha = 1,
  extraOffsetX = 0,
  extraScale = 1,
  extraOffsetY = 0,
  extraRotDeg = 0,
  extraScaleX = 1,
  extraScaleY = 1,
  extraBlurPx = 0
) {
  const anim = computeAnimState(clip, localTime, height);
  const tracked = evaluateMotionTrack(clip.motionTrack, timelineTime);
  if (tracked && !tracked.visible) return;

  const totalAlpha = Math.max(0, Math.min(1, clip.transform.opacity * anim.alpha * extraAlpha));
  if (totalAlpha <= 0.002) return;

  // Motion-style clip effects (shake, zoom, twirl, dynamic)
  let fxOffsetX = 0;
  let fxOffsetY = 0;
  let fxScale = 1;
  let fxRot = 0;
  for (const fx of clip.effects || []) {
    if (!fx.enabled || fx.intensity <= 0) continue;
    const k = fx.intensity / 100;
    const t = localTime * fx.speed;
    if (fx.type === 'shake') {
      fxOffsetX += Math.sin(t * 38) * 18 * k;
      fxOffsetY += Math.cos(t * 43) * 14 * k;
      fxRot += Math.sin(t * 25) * 2.5 * k;
    } else if (fx.type === 'zoom') {
      fxScale *= 1 + Math.abs(Math.sin(t * 4.5)) * 0.24 * k;
    } else if (fx.type === 'twirl') {
      fxRot += Math.sin(t * 2.5) * 16 * k;
      fxScale *= 1 + 0.1 * k;
    } else if (fx.type === 'dynamic') {
      fxOffsetX += Math.sin(t * 5) * 10 * k;
      fxRot += Math.sin(t * 3.5) * 3 * k;
      fxScale *= 1 + 0.08 * k;
    } else if (fx.type === 'fisheye') {
      fxScale *= 1 + 0.14 * k;
    } else {
      const spec = EFFECT_SPEC_MAP.get(fx.type);
      if (spec) {
        if (spec.shake) {
          fxOffsetX += Math.sin(t * 36) * spec.shake * k;
          fxOffsetY += Math.cos(t * 41) * spec.shake * 0.8 * k;
        }
        if (spec.zoom) {
          fxScale *= 1 + Math.abs(Math.sin(t * 4)) * spec.zoom * k;
        }
        if (spec.twirl) {
          fxRot += Math.sin(t * 2.5) * spec.twirl * k;
        }
      }
    }
  }

  ctx.save();
  ctx.globalAlpha = totalAlpha;
  const baseFilter = buildFilterString(clip.color, clip.effects, localTime);
  ctx.filter =
    extraBlurPx > 0
      ? `${baseFilter === 'none' ? '' : baseFilter + ' '}blur(${extraBlurPx.toFixed(1)}px)`.trim()
      : baseFilter;

  const posX = tracked ? tracked.x : clip.transform.x;
  const posY = tracked ? tracked.y : clip.transform.y;
  const trackScale = tracked ? tracked.scale : 1;

  const cx = width / 2 + posX * (width / 2) + extraOffsetX + fxOffsetX;
  const cy = height / 2 + posY * (height / 2) + anim.offsetY + extraOffsetY + fxOffsetY;
  ctx.translate(cx, cy);
  ctx.rotate(((clip.transform.rotation + extraRotDeg + fxRot) * Math.PI) / 180);
  const sx =
    clip.transform.scale *
    anim.scale *
    trackScale *
    extraScale *
    extraScaleX *
    fxScale *
    (clip.transform.flipH ? -1 : 1);
  const sy =
    clip.transform.scale *
    anim.scale *
    trackScale *
    extraScale *
    extraScaleY *
    fxScale *
    (clip.transform.flipV ? -1 : 1);
  ctx.scale(sx, sy);

  if (clip.kind === 'color') {
    const fill = asset?.color || '#111827';
    ctx.fillStyle = fill;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  } else if (clip.kind === 'image' && asset) {
    const img = getOrCreateImage(cache, asset);
    if (img) {
      const targetScale = isMainTrack
        ? Math.max(width / img.naturalWidth, height / img.naturalHeight)
        : Math.min((width * 0.45) / img.naturalWidth, (height * 0.45) / img.naturalHeight);
      const dw = img.naturalWidth * targetScale;
      const dh = img.naturalHeight * targetScale;
      let drawable: HTMLImageElement | HTMLCanvasElement = img;
      if (clip.aiMask?.enabled && clip.aiMask.polygon.length >= 3) {
        drawable = applyAIMask(drawable, img.naturalWidth, img.naturalHeight, clip.aiMask, cache);
      }
      if (clip.chromaKey.enabled) {
        drawable = applyChromaKey(
          drawable,
          drawable instanceof HTMLCanvasElement ? drawable.width : img.naturalWidth,
          drawable instanceof HTMLCanvasElement ? drawable.height : img.naturalHeight,
          clip.chromaKey,
          cache
        );
      }
      ctx.drawImage(drawable, -dw / 2, -dh / 2, dw, dh);
    }
  } else if (clip.kind === 'video' && asset) {
    const vid = getOrCreateVideo(cache, asset);
    if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
      const targetScale = isMainTrack
        ? Math.max(width / vid.videoWidth, height / vid.videoHeight)
        : Math.min((width * 0.48) / vid.videoWidth, (height * 0.48) / vid.videoHeight);
      const dw = vid.videoWidth * targetScale;
      const dh = vid.videoHeight * targetScale;
      let drawable: HTMLVideoElement | HTMLCanvasElement = vid;
      if (clip.aiMask?.enabled && clip.aiMask.polygon.length >= 3) {
        drawable = applyAIMask(drawable, vid.videoWidth, vid.videoHeight, clip.aiMask, cache);
      }
      if (clip.chromaKey.enabled) {
        drawable = applyChromaKey(
          drawable,
          drawable instanceof HTMLCanvasElement ? drawable.width : vid.videoWidth,
          drawable instanceof HTMLCanvasElement ? drawable.height : vid.videoHeight,
          clip.chromaKey,
          cache
        );
      }
      ctx.drawImage(drawable, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#181c24';
      ctx.fillRect(-width / 4, -height / 4, width / 2, height / 2);
    }
  } else if (clip.kind === 'sticker' && clip.sticker) {
    drawSticker(ctx, clip, width, height);
  } else if (clip.kind === 'text' && clip.text) {
    drawText(ctx, clip, width, height);
  }

  ctx.restore();

  if (clip.effects && clip.effects.length > 0 && isMainTrack) {
    applyPostClipEffects(ctx, clip.effects, localTime, width, height, cache);
  }

  if (clip.color.vignette > 0 && (clip.kind === 'video' || clip.kind === 'image')) {
    ctx.save();
    const strength = (clip.color.vignette / 100) * 0.85 * totalAlpha;
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.25,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawText(ctx: CanvasRenderingContext2D, clip: TimelineClip, width: number, _height: number) {
  const t = clip.text!;
  const scaleFactor = width / 1280;
  const fontSize = Math.max(12, Math.round(t.fontSize * scaleFactor));
  ctx.font = `${t.fontWeight} ${fontSize}px "${t.fontFamily}", sans-serif`;
  ctx.textAlign = t.align;
  ctx.textBaseline = 'middle';

  const lines = (t.content || '').split('\n');
  const lineHeight = fontSize * 1.24;
  const totalH = lines.length * lineHeight;

  let maxW = 0;
  for (const line of lines) {
    const m = ctx.measureText(line);
    if (m.width > maxW) maxW = m.width;
  }

  if (t.bgOpacity > 0) {
    const padX = fontSize * 0.55;
    const padY = fontSize * 0.3;
    const boxW = maxW + padX * 2;
    const boxH = totalH + padY * 1.4;
    let boxX = -boxW / 2;
    if (t.align === 'left') boxX = -padX;
    if (t.align === 'right') boxX = -maxW - padX;

    ctx.save();
    ctx.globalAlpha *= t.bgOpacity;
    ctx.fillStyle = t.bgColor;
    ctx.beginPath();
    ctx.roundRect(boxX, -boxH / 2, boxW, boxH, Math.max(6, fontSize * 0.18));
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, idx) => {
    const yPos = (idx - (lines.length - 1) / 2) * lineHeight;
    if (t.strokeWidth > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = t.strokeWidth * scaleFactor * 2;
      ctx.strokeStyle = t.strokeColor;
      ctx.strokeText(line, 0, yPos);
    }
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10 * scaleFactor;
    ctx.shadowOffsetY = 2 * scaleFactor;
    ctx.fillStyle = t.color;
    ctx.fillText(line, 0, yPos);
  });
}

function drawSticker(ctx: CanvasRenderingContext2D, clip: TimelineClip, width: number, _height: number) {
  const s = clip.sticker!;
  const size = width * 0.16;

  switch (s.shape) {
    case 'rec': {
      const w = size * 1.15;
      const h = size * 0.44;
      ctx.fillStyle = 'rgba(11, 13, 17, 0.78)';
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.arc(-w * 0.24, 0, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.secondaryColor;
      ctx.font = `700 ${Math.round(h * 0.5)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label || 'REC', -w * 0.04, 1);
      break;
    }
    case 'badge': {
      const w = size * 1.25;
      const h = size * 0.46;
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();
      ctx.fillStyle = s.secondaryColor;
      ctx.font = `700 ${Math.round(h * 0.48)}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label || '4K HDR', 0, 1);
      break;
    }
    case 'frame': {
      const fw = size * 2.4;
      const fh = size * 1.45;
      const corner = size * 0.26;
      ctx.strokeStyle = s.primaryColor;
      ctx.lineWidth = Math.max(3, size * 0.04);
      ctx.lineCap = 'square';
      const corners: Array<[number, number, number, number]> = [
        [-fw / 2, -fh / 2, 1, 1],
        [fw / 2, -fh / 2, -1, 1],
        [-fw / 2, fh / 2, 1, -1],
        [fw / 2, fh / 2, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * corner);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * corner, cy);
        ctx.stroke();
      }
      break;
    }
    case 'arrow': {
      ctx.fillStyle = s.primaryColor;
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = 3;
      const aw = size * 0.9;
      const ah = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(-aw / 2, -ah * 0.25);
      ctx.lineTo(aw * 0.08, -ah * 0.25);
      ctx.lineTo(aw * 0.08, -ah * 0.65);
      ctx.lineTo(aw / 2, 0);
      ctx.lineTo(aw * 0.08, ah * 0.65);
      ctx.lineTo(aw * 0.08, ah * 0.25);
      ctx.lineTo(-aw / 2, ah * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'star': {
      ctx.fillStyle = s.primaryColor;
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = 3;
      const outer = size * 0.52;
      const inner = size * 0.23;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'circle': {
      ctx.strokeStyle = s.primaryColor;
      ctx.lineWidth = Math.max(4, size * 0.055);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'play': {
      ctx.fillStyle = s.secondaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.primaryColor;
      ctx.beginPath();
      ctx.moveTo(-size * 0.14, -size * 0.22);
      ctx.lineTo(size * 0.24, 0);
      ctx.lineTo(-size * 0.14, size * 0.22);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function renderMainTransition(
  ctx: CanvasRenderingContext2D,
  prevClip: TimelineClip | null,
  prevAsset: MediaAsset | undefined,
  clip: TimelineClip,
  asset: MediaAsset | undefined,
  localTime: number,
  playheadTime: number,
  progress: number,
  width: number,
  height: number,
  cache: MediaElementCache
) {
  const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const drawPrev = (
    alpha = 1,
    ox = 0,
    sc = 1,
    oy = 0,
    rot = 0,
    sx = 1,
    sy = 1,
    blur = 0
  ) => {
    if (prevClip) {
      drawVisualClip(
        ctx,
        prevClip,
        prevAsset,
        prevClip.duration,
        playheadTime,
        width,
        height,
        cache,
        true,
        alpha,
        ox,
        sc,
        oy,
        rot,
        sx,
        sy,
        blur
      );
    }
  };
  const drawCurr = (
    alpha = 1,
    ox = 0,
    sc = 1,
    oy = 0,
    rot = 0,
    sx = 1,
    sy = 1,
    blur = 0
  ) => {
    drawVisualClip(
      ctx,
      clip,
      asset,
      localTime,
      playheadTime,
      width,
      height,
      cache,
      true,
      alpha,
      ox,
      sc,
      oy,
      rot,
      sx,
      sy,
      blur
    );
  };

  const tType = clip.transitionIn.type;
  switch (tType) {
    case 'dissolve':
    case 'morph':
      drawPrev(1 - ease, 0, tType === 'morph' ? 1 + ease * 0.15 : 1);
      drawCurr(ease, 0, tType === 'morph' ? 0.9 + ease * 0.1 : 1);
      return;

    case 'fade':
      if (progress < 0.5) drawPrev(1 - progress * 2);
      else drawCurr((progress - 0.5) * 2);
      return;

    case 'flashWhite':
    case 'fadeWarm': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const flashAlpha = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.fillStyle =
        tType === 'flashWhite'
          ? `rgba(255,255,255,${flashAlpha})`
          : `rgba(251,146,60,${flashAlpha * 0.92})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'flou': {
      const blur = Math.sin(progress * Math.PI) * 18;
      drawPrev(1 - ease, 0, 1, 0, 0, 1, 1, blur);
      drawCurr(ease, 0, 1, 0, 0, 1, 1, blur);
      return;
    }

    case 'slideLeft':
    case 'push':
    case 'roll':
      drawPrev(1, -ease * width);
      drawCurr(1, (1 - ease) * width);
      return;

    case 'slideRight':
      drawPrev(1, ease * width);
      drawCurr(1, -(1 - ease) * width);
      return;

    case 'slideUp':
      drawPrev(1, 0, 1, -ease * height);
      drawCurr(1, 0, 1, (1 - ease) * height);
      return;

    case 'slideDown':
      drawPrev(1, 0, 1, ease * height);
      drawCurr(1, 0, 1, -(1 - ease) * height);
      return;

    case 'whipPan':
    case 'mouvement':
    case 'vitesse': {
      const blur = Math.sin(progress * Math.PI) * 12;
      drawPrev(1 - progress * 0.3, -ease * width, 1, 0, 0, 1.15, 1, blur);
      drawCurr(1, (1 - ease) * width, 1, 0, 0, 1.15, 1, blur);
      return;
    }

    case 'pullIn':
    case 'warp':
      drawPrev(1 - ease, 0, 1 + ease * (tType === 'warp' ? 1.4 : 0.45));
      drawCurr(ease, 0, 0.72 + ease * 0.28);
      return;

    case 'pullOut':
      drawPrev(1 - ease, 0, 1 - ease * 0.35);
      drawCurr(ease, 0, 1.45 - ease * 0.45);
      return;

    case 'stretch': {
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1, 0, 1, 0, 0, 1 + p * 0.8, 1 - p * 0.2, p * 6);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(1, 0, 1, 0, 0, 1.8 - p * 0.8, 0.8 + p * 0.2, (1 - p) * 6);
      }
      return;
    }

    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let t = progress;
      let b = 1;
      if (t < 1 / d1) b = n1 * t * t;
      else if (t < 2 / d1) b = n1 * (t -= 1.5 / d1) * t + 0.75;
      else if (t < 2.5 / d1) b = n1 * (t -= 2.25 / d1) * t + 0.9375;
      else b = n1 * (t -= 2.625 / d1) * t + 0.984375;
      drawPrev(1 - progress);
      drawCurr(1, 0, 0.5 + b * 0.5);
      return;
    }

    case 'rotation':
    case 'spin':
    case 'spinBlur': {
      const deg = tType === 'rotation' ? 28 : 360;
      const blur = tType === 'spinBlur' ? Math.sin(progress * Math.PI) * 10 : 0;
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1 - p * 0.3, 0, 1 + p * 0.25, 0, p * (deg / 2), 1, 1, blur);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(0.7 + p * 0.3, 0, 1.25 - p * 0.25, 0, -(1 - p) * (deg / 2), 1, 1, blur);
      }
      return;
    }

    case 'flip':
    case 'cube':
    case 'transition3d': {
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1, tType === 'cube' ? -p * width * 0.5 : 0, 1, 0, tType === 'transition3d' ? -p * 12 : 0, 1 - p, 1 - p * 0.08);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(1, tType === 'cube' ? (1 - p) * width * 0.5 : 0, 1, 0, tType === 'transition3d' ? (1 - p) * 12 : 0, p, 0.92 + p * 0.08);
      }
      return;
    }

    case 'shakeCut':
    case 'dynamic': {
      const amp = Math.sin(progress * Math.PI) * 32;
      const ox = Math.sin(progress * 42) * amp;
      const oy = Math.cos(progress * 37) * amp * 0.6;
      if (progress < 0.5) drawPrev(1, ox, 1 + Math.sin(progress * Math.PI) * 0.12, oy);
      else drawCurr(1, ox, 1 + Math.sin(progress * Math.PI) * 0.12, oy);
      return;
    }

    case 'wipe':
    case 'swipe':
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * ease, height);
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;

    case 'splitHorizontal':
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const sh = (height / 2) * ease;
      ctx.rect(0, height / 2 - sh, width, sh * 2);
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;

    case 'splitVertical':
    case 'rideau':
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const sw = (width / 2) * ease;
      ctx.rect(width / 2 - sw, 0, sw * 2, height);
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;

    case 'circleIris':
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const maxR = Math.hypot(width, height) * 0.55;
      ctx.arc(width / 2, height / 2, maxR * ease, 0, Math.PI * 2);
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;

    case 'diamondIris': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const rx = width * 1.1 * ease;
      const ry = height * 1.1 * ease;
      ctx.moveTo(width / 2, height / 2 - ry);
      ctx.lineTo(width / 2 + rx, height / 2);
      ctx.lineTo(width / 2, height / 2 + ry);
      ctx.lineTo(width / 2 - rx, height / 2);
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'clockWipe': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2);
      const startAngle = -Math.PI / 2;
      ctx.arc(width / 2, height / 2, Math.hypot(width, height), startAngle, startAngle + Math.PI * 2 * ease);
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'glitchCut':
    case 'vhs':
    case 'cyberpunk':
    case 'chromaticFlash': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const intensity = Math.sin(progress * Math.PI);
      const buf = getOffscreen(cache, 'transCanvas', width, height);
      const bctx = buf.getContext('2d')!;
      bctx.clearRect(0, 0, width, height);
      bctx.drawImage(ctx.canvas, 0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.55 * intensity;
      ctx.drawImage(buf, 22 * intensity, 0);
      ctx.drawImage(buf, -22 * intensity, 0);
      ctx.restore();
      for (let i = 0; i < 8; i++) {
        const y = pseudoRand(Math.floor(progress * 20) + i * 7) * height;
        const h = 10 + pseudoRand(i) * 35;
        const dx = (pseudoRand(i * 13 + Math.floor(progress * 30)) - 0.5) * 90 * intensity;
        ctx.drawImage(buf, 0, y, width, h, dx, y, width, h);
      }
      return;
    }

    case 'pixelate': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const block = Math.max(1, Math.round(Math.sin(progress * Math.PI) * 34));
      if (block > 2) {
        const sw = Math.max(8, Math.round(width / block));
        const sh = Math.max(8, Math.round(height / block));
        const buf = getOffscreen(cache, 'transCanvas', sw, sh);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, sw, sh);
        bctx.drawImage(ctx.canvas, 0, 0, sw, sh);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, width, height);
        ctx.restore();
      }
      return;
    }

    case 'neon':
    case 'energy': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const glow = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.strokeStyle = tType === 'neon' ? `rgba(217, 70, 239, ${glow})` : `rgba(34, 211, 238, ${glow})`;
      ctx.lineWidth = 18 * glow;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'cinematique': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const barH = Math.sin(progress * Math.PI) * (height * 0.16);
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, barH);
      ctx.fillRect(0, height - barH, width, barH);
      ctx.restore();
      return;
    }

    case 'burnFilm': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const burn = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createRadialGradient(width * progress, height * 0.5, 10, width * progress, height * 0.5, width * 0.65);
      grad.addColorStop(0, `rgba(255, 220, 120, ${burn})`);
      grad.addColorStop(0.5, `rgba(234, 88, 12, ${burn * 0.7})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'anime': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const a = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.85})`;
      for (let i = 0; i < 42; i++) {
        const ang = (i / 42) * Math.PI * 2;
        const r1 = Math.min(width, height) * (0.15 + (1 - a) * 0.35);
        const r2 = Math.max(width, height);
        ctx.lineWidth = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(width / 2 + Math.cos(ang) * r1, height / 2 + Math.sin(ang) * r1);
        ctx.lineTo(width / 2 + Math.cos(ang) * r2, height / 2 + Math.sin(ang) * r2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    case 'gaming': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const x = width * ease * 1.25;
      ctx.moveTo(0, 0);
      ctx.lineTo(x, 0);
      ctx.lineTo(x - width * 0.25, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - width * 0.25, height);
      ctx.stroke();
      ctx.restore();
      return;
    }

    case 'particules': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const pAlpha = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 36; i++) {
        const ang = pseudoRand(i * 11) * Math.PI * 2;
        const dist = progress * Math.max(width, height) * (0.3 + pseudoRand(i * 5) * 0.5);
        const px = width / 2 + Math.cos(ang) * dist;
        const py = height / 2 + Math.sin(ang) * dist;
        ctx.fillStyle = `rgba(251, 191, 36, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 3 + pseudoRand(i) * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    case 'portal':
    case 'circleExpand': {
      drawPrev(1);
      const maxR = Math.hypot(width, height) * 0.56 * ease;
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, maxR, 0, Math.PI * 2);
      ctx.clip();
      drawCurr(1, 0, tType === 'portal' ? 1.25 - 0.25 * ease : 1);
      ctx.restore();
      if (tType === 'portal') {
        const ringAlpha = Math.sin(progress * Math.PI);
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha})`;
        ctx.lineWidth = 14 * ringAlpha;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, maxR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    case 'tornado':
    case 'whirlpool': {
      const spin = progress * 540;
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1 - p * 0.25, 0, 1 - p * 0.55, 0, spin * 0.5);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(0.75 + p * 0.25, 0, 0.45 + p * 0.55, 0, -(1 - p) * 270);
      }
      const vortexA = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.strokeStyle = tType === 'whirlpool' ? `rgba(56,189,248,${vortexA * 0.65})` : `rgba(226,232,240,${vortexA * 0.55})`;
      ctx.lineWidth = 4;
      for (let r = 1; r <= 5; r++) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r * 70 * vortexA, progress * 10 + r, progress * 10 + r + Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    case 'explosion':
    case 'energyBurst': {
      if (progress < 0.45) drawPrev(1, Math.sin(progress * 45) * 16, 1 + progress * 0.25);
      else drawCurr(1, 0, 1.15 - ease * 0.15);
      const blast = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createRadialGradient(width / 2, height / 2, 4, width / 2, height / 2, width * 0.7 * progress);
      grad.addColorStop(0, `rgba(255, 248, 220, ${blast})`);
      grad.addColorStop(0.45, tType === 'explosion' ? `rgba(249, 115, 22, ${blast * 0.85})` : `rgba(34, 211, 238, ${blast * 0.85})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'liquid':
    case 'waterWave': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const baseX = width * ease;
      ctx.moveTo(0, 0);
      for (let y = 0; y <= height; y += 20) {
        const wave = Math.sin((y / height) * Math.PI * 4 + progress * 12) * 38 * Math.sin(progress * Math.PI);
        ctx.lineTo(baseX + wave, y);
      }
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      if (tType === 'waterWave') {
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let y = 0; y <= height; y += 20) {
          const wave = Math.sin((y / height) * Math.PI * 4 + progress * 12) * 38 * Math.sin(progress * Math.PI);
          if (y === 0) ctx.moveTo(baseX + wave, y);
          else ctx.lineTo(baseX + wave, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    case 'melt': {
      drawPrev(1);
      const cols = 16;
      const cw = width / cols;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        const dripDelay = pseudoRand(i * 19) * 0.35;
        const localP = Math.max(0, Math.min(1, (progress - dripDelay) / 0.65));
        ctx.rect(i * cw, 0, cw + 1, height * localP);
      }
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'inkSpread':
    case 'paintSplash':
    case 'smokeReveal':
    case 'fireReveal': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const blobs = tType === 'paintSplash' ? 14 : 9;
      for (let i = 0; i < blobs; i++) {
        const bx = i === 0 ? width / 2 : pseudoRand(i * 29) * width;
        const by = i === 0 ? height / 2 : pseudoRand(i * 43) * height;
        const br = Math.max(width, height) * (i === 0 ? 0.85 : 0.45) * Math.max(0, progress - i * 0.03);
        ctx.moveTo(bx + br, by);
        ctx.arc(bx, by, br, 0, Math.PI * 2);
      }
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      if (tType === 'fireReveal') {
        const glow = Math.sin(progress * Math.PI);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(249, 115, 22, ${glow * 0.35})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      return;
    }

    case 'lightningStrike': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const flash = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.fillStyle = `rgba(224, 242, 254, ${flash * 0.7})`;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 5 * flash;
      ctx.beginPath();
      let lx = width * 0.52;
      ctx.moveTo(lx, 0);
      for (let s = 1; s <= 8; s++) {
        lx += (pseudoRand(s * 31 + Math.floor(progress * 12)) - 0.5) * 140;
        ctx.lineTo(lx, (s / 8) * height);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    case 'crystalBreak':
    case 'glassShatter': {
      drawCurr(1);
      if (progress < 0.95) {
        const buf = getOffscreen(cache, 'transCanvas', width, height);
        const bctx = buf.getContext('2d')!;
        bctx.clearRect(0, 0, width, height);
        drawPrev(1);
        bctx.drawImage(ctx.canvas, 0, 0, width, height);
        // Re-draw curr base, then scatter shards of prev
        drawCurr(1);
        const cols = 5;
        const rows = 4;
        const sw = width / cols;
        const sh = height / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const dx = (pseudoRand(r * 7 + c) - 0.5) * width * 0.9 * ease;
            const dy = (tType === 'glassShatter' ? height * 0.85 : (pseudoRand(c * 11 + r) - 0.5) * height) * ease;
            ctx.save();
            ctx.globalAlpha = 1 - ease;
            ctx.translate(c * sw + sw / 2 + dx, r * sh + sh / 2 + dy);
            ctx.rotate((pseudoRand(r * 13 + c) - 0.5) * ease * 1.4);
            ctx.drawImage(buf, c * sw, r * sh, sw, sh, -sw / 2, -sh / 2, sw, sh);
            ctx.restore();
          }
        }
      }
      return;
    }

    case 'paperTear': {
      drawCurr(1);
      const split = ease * (width * 0.6);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width / 2 - split, 0);
      for (let y = 0; y <= height; y += 24) {
        ctx.lineTo(width / 2 - split + (pseudoRand(y) - 0.5) * 26, y);
      }
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      drawPrev(1, -split);
      ctx.restore();
      return;
    }

    case 'galaxyWarp':
    case 'blackHole':
    case 'starTunnel':
    case 'timeWarp':
    case 'infiniteZoom': {
      const zoomIn = tType === 'blackHole' ? 1 - progress * 0.85 : 1 + progress * 1.4;
      if (progress < 0.5) {
        drawPrev(1 - progress * 0.4, 0, zoomIn, 0, tType === 'galaxyWarp' ? progress * 180 : 0);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(0.6 + p * 0.4, 0, tType === 'blackHole' ? 0.25 + p * 0.75 : 0.65 + p * 0.35, 0, tType === 'galaxyWarp' ? -(1 - p) * 90 : 0);
      }
      if (tType === 'blackHole') {
        const holeR = Math.sin(progress * Math.PI) * Math.min(width, height) * 0.42;
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, holeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const a = Math.sin(progress * Math.PI);
        ctx.save();
        ctx.strokeStyle = tType === 'timeWarp' ? `rgba(56,189,248,${a * 0.7})` : `rgba(255,255,255,${a * 0.8})`;
        for (let i = 0; i < 32; i++) {
          const ang = (i / 32) * Math.PI * 2;
          const r1 = 40 + progress * 120;
          const r2 = r1 + 140 * a;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width / 2 + Math.cos(ang) * r1, height / 2 + Math.sin(ang) * r1);
          ctx.lineTo(width / 2 + Math.cos(ang) * r2, height / 2 + Math.sin(ang) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }
      return;
    }

    case 'clockSpin': {
      drawPrev(1 - ease, 0, 1, 0, ease * 180);
      drawCurr(ease, 0, 1, 0, -(1 - ease) * 180);
      return;
    }

    case 'digitalScan':
    case 'laserSwipe':
    case 'cyberSlice': {
      drawPrev(1);
      const sx = width * ease;
      ctx.save();
      ctx.beginPath();
      if (tType === 'digitalScan') {
        ctx.rect(0, 0, sx, height);
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(sx * 1.2, 0);
        ctx.lineTo(sx * 1.2 - width * 0.22, height);
        ctx.lineTo(0, height);
        ctx.closePath();
      }
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = tType === 'laserSwipe' ? '#f43f5e' : '#22d3ee';
      ctx.shadowColor = tType === 'laserSwipe' ? '#f43f5e' : '#22d3ee';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (tType === 'digitalScan') {
        ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
      } else {
        ctx.moveTo(sx * 1.2, 0); ctx.lineTo(sx * 1.2 - width * 0.22, height);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    case 'matrixDrop': {
      drawPrev(1);
      const cols = 20;
      const cw = width / cols;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        const delay = pseudoRand(i * 17) * 0.4;
        const p = Math.max(0, Math.min(1, (progress - delay) / 0.6));
        ctx.rect(i * cw, 0, cw + 1, height * p);
      }
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.75)';
      for (let i = 0; i < cols; i++) {
        const delay = pseudoRand(i * 17) * 0.4;
        const p = Math.max(0, Math.min(1, (progress - delay) / 0.6));
        if (p > 0 && p < 1) {
          ctx.fillRect(i * cw, height * p - 14, cw - 2, 14);
        }
      }
      ctx.restore();
      return;
    }

    case 'hologramShift': {
      drawPrev(1 - ease, Math.sin(progress * 40) * 12 * Math.sin(progress * Math.PI));
      drawCurr(ease, -Math.sin(progress * 40) * 12 * Math.sin(progress * Math.PI));
      ctx.save();
      ctx.fillStyle = `rgba(6, 182, 212, ${0.22 * Math.sin(progress * Math.PI)})`;
      for (let y = 0; y < height; y += 6) ctx.fillRect(0, y, width, 2);
      ctx.restore();
      return;
    }

    case 'pixelBurst':
    case 'pixelAssemble':
    case 'blockFall': {
      drawPrev(1);
      const cols = 10;
      const rows = 6;
      const bw = width / cols;
      const bh = height / rows;
      ctx.save();
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const threshold =
            tType === 'blockFall'
              ? (r / rows) * 0.6 + pseudoRand(c * 7 + r) * 0.4
              : pseudoRand(r * 13 + c * 5);
          if (progress >= threshold * 0.75) {
            ctx.rect(c * bw, r * bh, bw + 1, bh + 1);
          }
        }
      }
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'cubeRotate':
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1, -p * width * 0.5, 1, 0, 0, 1 - p, 1 - p * 0.1);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(1, (1 - p) * width * 0.5, 1, 0, 0, p, 0.9 + p * 0.1);
      }
      return;

    case 'sphereMorph':
      drawPrev(1 - ease, 0, 1 + ease * 0.35);
      drawCurr(ease, 0, 1.35 - ease * 0.35);
      return;

    case 'diamondFlip': {
      drawPrev(1);
      ctx.save();
      const rx = width * 1.15 * ease;
      const ry = height * 1.15 * ease;
      ctx.translate(width / 2, height / 2);
      ctx.rotate((1 - ease) * Math.PI * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -ry);
      ctx.lineTo(rx, 0);
      ctx.lineTo(0, ry);
      ctx.lineTo(-rx, 0);
      ctx.closePath();
      ctx.clip();
      ctx.rotate(-(1 - ease) * Math.PI * 0.5);
      ctx.translate(-width / 2, -height / 2);
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'hexagonReveal': {
      drawPrev(1);
      const r = Math.hypot(width, height) * 0.62 * ease;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const hx = width / 2 + Math.cos(a) * r;
        const hy = height / 2 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'triangleSwipe': {
      drawPrev(1);
      ctx.save();
      ctx.beginPath();
      const s = Math.max(width, height) * 2.2 * ease;
      ctx.moveTo(0, 0);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.closePath();
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'crossReveal': {
      drawPrev(1);
      const arm = Math.max(width, height) * ease;
      ctx.save();
      ctx.beginPath();
      ctx.rect(width / 2 - arm / 2, 0, arm, height);
      ctx.rect(0, height / 2 - arm / 2, width, arm);
      ctx.clip();
      drawCurr(1);
      ctx.restore();
      return;
    }

    case 'doorOpen':
    case 'curtainOpen': {
      drawCurr(1);
      const half = (width / 2) * (1 - ease);
      if (half > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, half, height);
        ctx.rect(width - half, 0, half, height);
        ctx.clip();
        drawPrev(1);
        ctx.restore();
      }
      return;
    }

    case 'doorClose':
    case 'curtainClose': {
      if (progress < 0.5) {
        drawPrev(1);
        const w = (width / 2) * (progress * 2);
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, w, height);
        ctx.fillRect(width - w, 0, w, height);
      } else {
        drawCurr(1);
        const w = (width / 2) * (1 - (progress - 0.5) * 2);
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, w, height);
        ctx.fillRect(width - w, 0, w, height);
      }
      return;
    }

    case 'fold':
    case 'unfold': {
      if (progress < 0.5) {
        const p = progress * 2;
        drawPrev(1, 0, 1, 0, 0, tType === 'fold' ? 1 - p : 1, tType === 'unfold' ? 1 - p : 1);
      } else {
        const p = (progress - 0.5) * 2;
        drawCurr(1, 0, 1, 0, 0, tType === 'fold' ? p : 1, tType === 'unfold' ? p : 1);
      }
      return;
    }

    case 'bookPage': {
      drawCurr(1);
      const edgeX = width * (1 - ease);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, edgeX, height);
      ctx.clip();
      drawPrev(1);
      ctx.restore();
      const grad = ctx.createLinearGradient(edgeX - 45, 0, edgeX + 12, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.8, 'rgba(0,0,0,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(edgeX - 45, 0, 60, height);
      return;
    }

    case 'cameraSnap': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const shut = Math.sin(progress * Math.PI);
      const bar = (height / 2) * shut;
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, width, bar);
      ctx.fillRect(0, height - bar, width, bar);
      return;
    }

    case 'cameraFlash': {
      if (progress < 0.4) drawPrev(1);
      else drawCurr(1);
      const fl = Math.sin(progress * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${fl})`;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    case 'droneFly':
    case 'rocketLaunch': {
      const yShift = tType === 'rocketLaunch' ? height * ease : height * 0.5 * ease;
      const shake = tType === 'rocketLaunch' ? Math.sin(progress * 60) * 14 * Math.sin(progress * Math.PI) : 0;
      drawPrev(1 - ease, shake, 1 + ease * 0.4, -yShift);
      drawCurr(ease, shake, 0.8 + ease * 0.2, height * (1 - ease));
      return;
    }

    case 'orbit':
    case 'parallax':
      drawPrev(1 - ease * 0.3, -ease * width * 0.45, 1 - ease * 0.1, Math.sin(progress * Math.PI) * -40);
      drawCurr(1, (1 - ease) * width, 1);
      return;

    case 'elastic': {
      const c4 = (2 * Math.PI) / 3;
      const el = progress === 0 ? 0 : progress === 1 ? 1 : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
      drawPrev(1 - Math.min(1, progress * 1.4));
      drawCurr(1, (1 - el) * width * 0.5, 0.85 + el * 0.15);
      return;
    }

    case 'swing':
    case 'pendulum': {
      const ang = Math.sin(progress * Math.PI) * (tType === 'swing' ? 24 : 16);
      if (progress < 0.5) drawPrev(1 - progress * 0.3, 0, 1, 0, ang);
      else drawCurr(0.7 + progress * 0.3, 0, 1, 0, -ang * 0.6);
      return;
    }

    case 'auroraFlow':
    case 'plasmaShift': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const glow = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, tType === 'auroraFlow' ? `rgba(16, 185, 129, ${glow * 0.65})` : `rgba(217, 70, 239, ${glow * 0.7})`);
      grad.addColorStop(0.5, `rgba(56, 189, 248, ${glow * 0.55})`);
      grad.addColorStop(1, tType === 'auroraFlow' ? `rgba(139, 92, 246, ${glow * 0.65})` : `rgba(245, 158, 11, ${glow * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'shadowFade': {
      if (progress < 0.5) drawPrev(1);
      else drawCurr(1);
      const s = Math.sin(progress * Math.PI);
      const grad = ctx.createRadialGradient(width / 2, height / 2, Math.max(2, width * (1 - s) * 0.5), width / 2, height / 2, width * 0.75);
      grad.addColorStop(0, `rgba(0,0,0,${s * 0.85})`);
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, s * 1.25)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    case 'lightBeam': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const beamX = width * progress;
      const a = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(beamX - 140, 0, beamX + 140, height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `rgba(254, 240, 138, ${a * 0.85})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return;
    }

    case 'distorsion':
    case 'ripple': {
      drawPrev(1 - ease);
      drawCurr(ease);
      const ring = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${ring * 0.55})`;
      ctx.lineWidth = 8 * ring;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.max(width, height) * 0.6 * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    default: {
      const spec: TransitionSpec | undefined = TRANSITION_SPEC_MAP.get(tType);
      if (!spec) {
        drawPrev(1 - ease);
        drawCurr(ease);
        return;
      }

      const glowA = Math.sin(progress * Math.PI);
      const shakeAmt = (spec.shake || 0) * glowA;
      const sx = shakeAmt ? Math.sin(progress * 48) * shakeAmt : 0;
      const sy = shakeAmt ? Math.cos(progress * 43) * shakeAmt * 0.7 : 0;

      switch (spec.engine) {
        case 'zoom': {
          const z = spec.zoom || 1.1;
          const spin = spec.spin || 0;
          const blur = (spec.blur || 0) * glowA;
          if (progress < 0.5) {
            const p = progress * 2;
            drawPrev(1 - p * 0.3, sx, 1 + p * z, sy, p * (spin / 2), 1, 1, blur);
          } else {
            const p = (progress - 0.5) * 2;
            drawCurr(0.7 + p * 0.3, sx, 1 + (1 - p) * z * 0.65, sy, -(1 - p) * (spin / 2), 1, 1, blur);
          }
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = rgba(spec.c1, glowA * 0.65);
          ctx.lineWidth = 5 * glowA;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, Math.max(width, height) * 0.55 * progress, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return;
        }

        case 'flash': {
          if (progress < 0.45) drawPrev(1, sx, 1, sy);
          else drawCurr(1, sx, 1, sy);
          ctx.save();
          const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.78);
          grad.addColorStop(0, rgba(spec.c1, glowA));
          grad.addColorStop(0.65, rgba(spec.c2, glowA * 0.85));
          grad.addColorStop(1, rgba(spec.c1, glowA * 0.6));
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
          return;
        }

        case 'swipe': {
          drawPrev(1);
          ctx.save();
          ctx.beginPath();
          if (spec.dir === 'right') {
            ctx.rect(width * (1 - ease), 0, width * ease, height);
          } else if (spec.dir === 'up') {
            ctx.rect(0, height * (1 - ease), width, height * ease);
          } else if (spec.dir === 'down') {
            ctx.rect(0, 0, width, height * ease);
          } else if (spec.dir === 'diag') {
            const x = width * ease * 1.25;
            ctx.moveTo(0, 0);
            ctx.lineTo(x, 0);
            ctx.lineTo(x - width * 0.25, height);
            ctx.lineTo(0, height);
            ctx.closePath();
          } else {
            ctx.rect(0, 0, width * ease, height);
          }
          ctx.clip();
          drawCurr(1);
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = rgba(spec.c1, 0.9);
          ctx.shadowColor = spec.c2;
          ctx.shadowBlur = 18;
          ctx.lineWidth = 6;
          ctx.beginPath();
          if (spec.dir === 'diag') {
            const x = width * ease * 1.25;
            ctx.moveTo(x, 0);
            ctx.lineTo(x - width * 0.25, height);
          } else if (spec.dir === 'up' || spec.dir === 'down') {
            const y = spec.dir === 'up' ? height * (1 - ease) : height * ease;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          } else {
            const x = spec.dir === 'right' ? width * (1 - ease) : width * ease;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          ctx.stroke();
          ctx.restore();
          return;
        }

        case 'portal': {
          const maxR = Math.hypot(width, height) * 0.58;
          const r = spec.invert ? maxR * Math.abs(1 - progress * 2) : maxR * ease;
          if (spec.invert && progress < 0.5) drawPrev(1, 0, 1 - progress * 0.4, 0, progress * (spec.spin || 60));
          else if (spec.invert) drawCurr(1, 0, 0.8 + (progress - 0.5) * 0.4);
          else {
            drawPrev(1);
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
            ctx.clip();
            drawCurr(1, 0, 1.2 - 0.2 * ease, 0, (1 - ease) * (spec.spin || 0));
            ctx.restore();
          }
          ctx.save();
          ctx.strokeStyle = rgba(spec.c1, glowA);
          ctx.shadowColor = spec.c2;
          ctx.shadowBlur = 24;
          ctx.lineWidth = 14 * glowA;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, Math.max(6, r), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return;
        }

        case 'vortex': {
          const spin = spec.spin || 360;
          if (progress < 0.5) {
            const p = progress * 2;
            drawPrev(1 - p * 0.25, 0, 1 - p * 0.45, 0, p * (spin / 2));
          } else {
            const p = (progress - 0.5) * 2;
            drawCurr(0.75 + p * 0.25, 0, 0.55 + p * 0.45, 0, -(1 - p) * (spin / 2));
          }
          ctx.save();
          ctx.strokeStyle = rgba(spec.c1, glowA * 0.7);
          ctx.lineWidth = 4;
          for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, i * 68 * glowA, progress * 10 + i, progress * 10 + i + Math.PI * 1.3);
            ctx.stroke();
          }
          ctx.restore();
          return;
        }

        case 'break': {
          drawCurr(1, sx, 1, sy);
          if (progress < 0.96) {
            const buf = getOffscreen(cache, 'transCanvas', width, height);
            const bctx = buf.getContext('2d')!;
            bctx.clearRect(0, 0, width, height);
            drawPrev(1);
            bctx.drawImage(ctx.canvas, 0, 0, width, height);
            drawCurr(1, sx, 1, sy);
            const cols = 5;
            const rows = 4;
            const sw = width / cols;
            const sh = height / rows;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                const dx = (pseudoRand(r * 7 + c) - 0.5) * width * 0.9 * ease;
                const dy = (pseudoRand(c * 11 + r) - 0.3) * height * ease;
                ctx.save();
                ctx.globalAlpha = 1 - ease;
                ctx.translate(c * sw + sw / 2 + dx, r * sh + sh / 2 + dy);
                ctx.rotate((pseudoRand(r * 13 + c) - 0.5) * ease * 1.6);
                ctx.drawImage(buf, c * sw, r * sh, sw, sh, -sw / 2, -sh / 2, sw, sh);
                ctx.strokeStyle = rgba(spec.c1, 0.7 * (1 - ease));
                ctx.lineWidth = 2;
                ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
                ctx.restore();
              }
            }
          }
          return;
        }

        case 'liquid': {
          drawPrev(1);
          ctx.save();
          ctx.beginPath();
          const baseX = width * ease;
          ctx.moveTo(0, 0);
          for (let y = 0; y <= height; y += 20) {
            const wave = Math.sin((y / height) * Math.PI * 4 + progress * 12) * 40 * glowA;
            ctx.lineTo(baseX + wave, y);
          }
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.clip();
          drawCurr(1);
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = rgba(spec.c1, 0.78 * glowA);
          ctx.lineWidth = 6;
          ctx.beginPath();
          for (let y = 0; y <= height; y += 20) {
            const wave = Math.sin((y / height) * Math.PI * 4 + progress * 12) * 40 * glowA;
            if (y === 0) ctx.moveTo(baseX + wave, y);
            else ctx.lineTo(baseX + wave, y);
          }
          ctx.stroke();
          ctx.restore();
          return;
        }

        case 'cube3d':
        case 'fold': {
          if (progress < 0.5) {
            const p = progress * 2;
            drawPrev(1, -p * width * 0.45, 1, 0, 0, 1 - p, 1 - p * 0.1);
          } else {
            const p = (progress - 0.5) * 2;
            drawCurr(1, (1 - p) * width * 0.45, 1, 0, 0, p, 0.9 + p * 0.1);
          }
          return;
        }

        case 'matrix': {
          drawPrev(1);
          const cols = 18;
          const cw = width / cols;
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < cols; i++) {
            const delay = pseudoRand(i * 17) * 0.38;
            const p = Math.max(0, Math.min(1, (progress - delay) / 0.62));
            if (spec.dir === 'up') ctx.rect(i * cw, height * (1 - p), cw + 1, height * p);
            else ctx.rect(i * cw, 0, cw + 1, height * p);
          }
          ctx.clip();
          drawCurr(1);
          ctx.restore();
          ctx.save();
          ctx.fillStyle = rgba(spec.c1, 0.85 * glowA);
          for (let i = 0; i < cols; i++) {
            const delay = pseudoRand(i * 17) * 0.38;
            const p = Math.max(0, Math.min(1, (progress - delay) / 0.62));
            if (p > 0 && p < 1) {
              const y = spec.dir === 'up' ? height * (1 - p) : height * p - 12;
              ctx.fillRect(i * cw, y, cw - 2, 12);
            }
          }
          ctx.restore();
          return;
        }

        case 'meteor': {
          if (progress < 0.5) drawPrev(1, sx, 1 + progress * 0.25, sy);
          else drawCurr(1, sx, 1.15 - ease * 0.15, sy);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const mx = width * progress;
          const my = height * progress;
          ctx.strokeStyle = rgba(spec.c1, glowA);
          ctx.shadowColor = spec.c2;
          ctx.shadowBlur = 24;
          ctx.lineWidth = 10 * glowA;
          ctx.beginPath();
          ctx.moveTo(mx - 180, my - 120);
          ctx.lineTo(mx, my);
          ctx.stroke();
          ctx.restore();
          return;
        }

        case 'beam': {
          drawPrev(1 - ease);
          drawCurr(ease);
          const beamX = width * progress;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const grad = ctx.createLinearGradient(beamX - 160, 0, beamX + 160, height);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, rgba(spec.c1, glowA * 0.85));
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
          return;
        }

        case 'echo': {
          const shift = Math.sin(progress * Math.PI) * 55 * (spec.invert ? -1 : 1);
          const blur = (spec.blur || 6) * glowA;
          drawPrev(1 - ease, shift, 1, 0, 0, 1, 1, blur);
          drawCurr(ease, -shift * 0.5, 1, 0, 0, 1, 1, blur);
          return;
        }

        case 'starfield': {
          if (progress < 0.5) drawPrev(1 - progress * 0.35, 0, 1 + progress * 0.9, 0, progress * (spec.spin || 0));
          else drawCurr(0.65 + (progress - 0.5) * 0.7, 0, 0.7 + ease * 0.3, 0, -(1 - ease) * (spec.spin || 0));
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = rgba(spec.c1, glowA * 0.85);
          for (let i = 0; i < 30; i++) {
            const ang = (i / 30) * Math.PI * 2;
            const r1 = 35 + progress * 140;
            const r2 = r1 + 150 * glowA;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(width / 2 + Math.cos(ang) * r1, height / 2 + Math.sin(ang) * r1);
            ctx.lineTo(width / 2 + Math.cos(ang) * r2, height / 2 + Math.sin(ang) * r2);
            ctx.stroke();
          }
          ctx.restore();
          return;
        }

        case 'shockwave':
        default: {
          drawPrev(1 - ease, sx, 1 + ease * 0.15, sy);
          drawCurr(ease, sx, 1.12 - ease * 0.12, sy);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const rings = spec.rings || 3;
          for (let r = 0; r < rings; r++) {
            ctx.strokeStyle = rgba(r % 2 === 0 ? spec.c1 : spec.c2, glowA * (0.75 - r * 0.12));
            ctx.lineWidth = (7 - r) * glowA;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.max(width, height) * (0.2 + r * 0.14) * progress, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          return;
        }
      }
    }
  }
}

export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  project: ProjectState,
  assetsMap: Map<string, MediaAsset>,
  playheadTime: number,
  width: number,
  height: number,
  cache: MediaElementCache,
  selectedClipId?: string | null,
  showGuides = false
): void {
  ctx.save();
  ctx.fillStyle = project.backgroundColor || '#090b0f';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const trackOrder = [...project.tracks].filter((t) => t.type !== 'audio' && !t.hidden);
  const sortedTracks = [
    ...trackOrder.filter((t) => t.type === 'video'),
    ...trackOrder.filter((t) => t.type === 'overlay'),
    ...trackOrder.filter((t) => t.type === 'text'),
  ];

  for (const track of sortedTracks) {
    const trackClips = project.clips
      .filter((c) => c.trackId === track.id)
      .sort((a, b) => a.startTime - b.startTime);

    const activeClips = trackClips.filter(
      (c) => playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
    );

    for (const clip of activeClips) {
      const localTime = playheadTime - clip.startTime;
      const asset = clip.assetId ? assetsMap.get(clip.assetId) : undefined;
      const isMain = track.type === 'video';

      const tDur =
        clip.transitionIn.type !== 'none'
          ? Math.min(clip.transitionIn.duration, clip.duration * 0.8)
          : 0;
      if (isMain && tDur > 0 && localTime < tDur) {
        const progress = Math.max(0, Math.min(1, localTime / tDur));
        const idx = trackClips.findIndex((c) => c.id === clip.id);
        const prevClip = idx > 0 ? trackClips[idx - 1] : null;
        const prevAsset = prevClip?.assetId ? assetsMap.get(prevClip.assetId) : undefined;
        renderMainTransition(
          ctx,
          prevClip,
          prevAsset,
          clip,
          asset,
          localTime,
          playheadTime,
          progress,
          width,
          height,
          cache
        );
        continue;
      }

      drawVisualClip(ctx, clip, asset, localTime, playheadTime, width, height, cache, isMain);
    }
  }

  if (showGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(width / 2 - 10, height / 2);
    ctx.lineTo(width / 2 + 10, height / 2);
    ctx.moveTo(width / 2, height / 2 - 10);
    ctx.lineTo(width / 2, height / 2 + 10);
    ctx.stroke();
    ctx.restore();
  }

  if (selectedClipId) {
    const sel = project.clips.find((c) => c.id === selectedClipId);
    if (
      sel &&
      sel.kind !== 'audio' &&
      playheadTime >= sel.startTime &&
      playheadTime < sel.startTime + sel.duration
    ) {
      const track = project.tracks.find((t) => t.id === sel.trackId);
      if (track && !track.hidden && track.type !== 'video') {
        const tracked = evaluateMotionTrack(sel.motionTrack, playheadTime);
        const px = tracked ? tracked.x : sel.transform.x;
        const py = tracked ? tracked.y : sel.transform.y;
        const sc = tracked ? sel.transform.scale * tracked.scale : sel.transform.scale;
        const cx = width / 2 + px * (width / 2);
        const cy = height / 2 + py * (height / 2);
        const boxW = Math.max(120, width * 0.28 * sc);
        const boxH = Math.max(54, height * 0.16 * sc);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((sel.transform.rotation * Math.PI) / 180);
        ctx.strokeStyle = tracked ? '#38bdf8' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
        ctx.setLineDash([]);
        ctx.fillStyle = tracked ? '#38bdf8' : '#f59e0b';
        const corners = [
          [-boxW / 2, -boxH / 2],
          [boxW / 2, -boxH / 2],
          [-boxW / 2, boxH / 2],
          [boxW / 2, boxH / 2],
        ];
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - 4, hy - 4, 8, 8);
        }
        ctx.restore();
      }
    }
  }
}
