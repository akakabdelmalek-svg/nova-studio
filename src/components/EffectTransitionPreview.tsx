import React, { useEffect, useRef } from 'react';
import { TransitionType, VideoEffectType } from '../types/studio';
import {
  MediaElementCache,
  createMediaCache,
  renderEffectPreviewFrame,
  renderTransitionPreviewFrame,
} from '../utils/canvasRenderer';

type Subscriber = {
  el: HTMLCanvasElement;
  visible: boolean;
  priority: boolean;
  draw: (timeMs: number, cache: MediaElementCache) => void;
};

const subscribers = new Set<Subscriber>();
let sharedCache: MediaElementCache | null = null;
let rafHandle = 0;
let lastFrameMs = 0;
let observer: IntersectionObserver | null = null;

function getSharedCache(): MediaElementCache {
  if (!sharedCache) {
    sharedCache = createMediaCache();
  }
  return sharedCache;
}

function ensureObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null;
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          for (const sub of subscribers) {
            if (sub.el === entry.target) {
              sub.visible = entry.isIntersecting;
            }
          }
        }
      },
      { rootMargin: '80px' }
    );
  }
  return observer;
}

function tickLoop(nowMs: number) {
  if (subscribers.size === 0) {
    rafHandle = 0;
    return;
  }
  // Throttle batch updates to ~22fps so 16-24 visible cards animate smoothly with minimal CPU
  if (nowMs - lastFrameMs >= 45) {
    lastFrameMs = nowMs;
    const cache = getSharedCache();
    for (const sub of subscribers) {
      if (sub.visible || sub.priority) {
        sub.draw(nowMs, cache);
      }
    }
  }
  rafHandle = requestAnimationFrame(tickLoop);
}

function registerSubscriber(sub: Subscriber): () => void {
  subscribers.add(sub);
  const obs = ensureObserver();
  obs?.observe(sub.el);
  if (!rafHandle) {
    rafHandle = requestAnimationFrame(tickLoop);
  }
  return () => {
    subscribers.delete(sub);
    obs?.unobserve(sub.el);
    if (subscribers.size === 0 && rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
  };
}

interface EffectPreviewCanvasProps {
  effectType: VideoEffectType;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export const EffectPreviewCanvas: React.FC<EffectPreviewCanvasProps> = ({
  effectType,
  width = 160,
  height = 90,
  priority = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timeMs: number, cache: MediaElementCache) => {
      const tSec = ((timeMs / 1000) % 6);
      renderEffectPreviewFrame(ctx, effectType, tSec, width, height, cache);
    };

    // Draw initial frame immediately so card is never blank
    draw(performance.now(), getSharedCache());

    const sub: Subscriber = {
      el: canvas,
      visible: priority,
      priority,
      draw,
    };

    return registerSubscriber(sub);
  }, [effectType, width, height, priority]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

interface TransitionPreviewCanvasProps {
  transitionType: TransitionType;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export const TransitionPreviewCanvas: React.FC<TransitionPreviewCanvasProps> = ({
  transitionType,
  width = 128,
  height = 72,
  priority = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timeMs: number, cache: MediaElementCache) => {
      // 2.2s cycle: 0.25s hold A, 1.35s animate A -> B, 0.6s hold B
      const cycle = ((timeMs / 1000) % 2.2) / 2.2;
      let progress = 0;
      if (cycle < 0.12) progress = 0;
      else if (cycle > 0.74) progress = 1;
      else progress = (cycle - 0.12) / (0.74 - 0.12);
      renderTransitionPreviewFrame(ctx, transitionType, progress, width, height, cache);
    };

    // Immediate frame at mid-transition so transition signature is visible right away
    renderTransitionPreviewFrame(ctx, transitionType, 0.48, width, height, getSharedCache());

    const sub: Subscriber = {
      el: canvas,
      visible: priority,
      priority,
      draw,
    };

    return registerSubscriber(sub);
  }, [transitionType, width, height, priority]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
