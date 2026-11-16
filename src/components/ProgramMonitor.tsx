import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  Crosshair,
  Grid,
  Maximize2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MediaAsset, ProjectState, TimelineClip } from '../types/studio';
import {
  MediaElementCache,
  evaluateClipTransform,
  getOrCreateVideo,
  measureClipLocalBounds,
  renderCompositionFrame,
} from '../utils/canvasRenderer';
import { ASPECT_RATIO_DIMENSIONS, formatTimecode } from '../utils/defaults';

interface ProgramMonitorProps {
  project: ProjectState;
  assetsMap: Map<string, MediaAsset>;
  mediaCache: MediaElementCache;
  playheadTime: number;
  totalDuration: number;
  isPlaying: boolean;
  isLooping: boolean;
  masterMuted: boolean;
  masterVolume: number;
  selectedClip: TimelineClip | null;
  isPickingTrackTarget: boolean;
  onCancelPickTrackTarget: () => void;
  onPickTrackTarget: (normX: number, normY: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (delta: number) => void;
  onToggleLoop: () => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onUpdateClipTransform: (clipId: string, x: number, y: number) => void;
  onUpdateClipPivot?: (clipId: string, pivotX: number, pivotY: number) => void;
  onSelectClip: (clipId: string) => void;
}

export const ProgramMonitor: React.FC<ProgramMonitorProps> = ({
  project,
  assetsMap,
  mediaCache,
  playheadTime,
  totalDuration,
  isPlaying,
  isLooping,
  masterMuted,
  masterVolume,
  selectedClip,
  isPickingTrackTarget,
  onCancelPickTrackTarget,
  onPickTrackTarget,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onToggleLoop,
  onToggleMute,
  onChangeVolume,
  onUpdateClipTransform,
  onUpdateClipPivot,
  onSelectClip,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [showGuides, setShowGuides] = useState(false);
  const dragStateRef = useRef<{
    clipId: string;
    mode: 'position' | 'pivot';
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    boundsW: number;
    boundsH: number;
  } | null>(null);

  const dims = ASPECT_RATIO_DIMENSIONS[project.aspectRatio];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (const clip of project.clips) {
      if (clip.kind !== 'video' || !clip.assetId) continue;
      const asset = assetsMap.get(clip.assetId);
      if (!asset) continue;
      const vid = getOrCreateVideo(mediaCache, asset);
      if (!vid) continue;

      const isActive =
        playheadTime >= clip.startTime && playheadTime < clip.startTime + clip.duration;
      if (isActive) {
        const targetTime = clip.sourceOffset + (playheadTime - clip.startTime) * clip.speed;
        vid.playbackRate = Math.max(0.25, Math.min(4, clip.speed));
        const track = project.tracks.find((t) => t.id === clip.trackId);
        const shouldMute = masterMuted || clip.muted || Boolean(track?.muted);
        vid.muted = shouldMute;
        vid.volume = Math.max(0, Math.min(1, (clip.volume / 100) * masterVolume));

        if (isPlaying) {
          if (vid.paused) {
            if (Math.abs(vid.currentTime - targetTime) > 0.2) {
              vid.currentTime = Math.min(targetTime, Math.max(0, vid.duration - 0.05));
            }
            void vid.play().catch(() => {});
          } else if (Math.abs(vid.currentTime - targetTime) > 0.35) {
            vid.currentTime = targetTime;
          }
        } else {
          if (!vid.paused) vid.pause();
          if (Math.abs(vid.currentTime - targetTime) > 0.04) {
            vid.currentTime = Math.min(targetTime, Math.max(0, (vid.duration || 10) - 0.05));
          }
        }
      } else if (!vid.paused) {
        vid.pause();
      }
    }

    renderCompositionFrame(
      ctx,
      project,
      assetsMap,
      playheadTime,
      dims.width,
      dims.height,
      mediaCache,
      isPlaying ? null : selectedClip?.id,
      showGuides
    );
  }, [
    project,
    assetsMap,
    mediaCache,
    playheadTime,
    isPlaying,
    masterMuted,
    masterVolume,
    selectedClip?.id,
    showGuides,
    dims.width,
    dims.height,
  ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (isPlaying) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderCompositionFrame(
        ctx,
        project,
        assetsMap,
        playheadTime,
        dims.width,
        dims.height,
        mediaCache,
        selectedClip?.id,
        showGuides
      );
    }, 350);
    return () => window.clearInterval(id);
  }, [
    isPlaying,
    project,
    assetsMap,
    playheadTime,
    dims.width,
    dims.height,
    mediaCache,
    selectedClip?.id,
    showGuides,
  ]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasPxX = ((e.clientX - rect.left) / rect.width) * dims.width;
    const canvasPxY = ((e.clientY - rect.top) / rect.height) * dims.height;
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    if (isPickingTrackTarget) {
      onPickTrackTarget(
        Math.max(-1, Math.min(1, Number(normX.toFixed(3)))),
        Math.max(-1, Math.min(1, Number(normY.toFixed(3))))
      );
      return;
    }

    const ctx = canvas.getContext('2d');
    if (
      ctx &&
      onUpdateClipPivot &&
      selectedClip &&
      selectedClip.kind !== 'audio' &&
      playheadTime >= selectedClip.startTime &&
      playheadTime < selectedClip.startTime + selectedClip.duration
    ) {
      const selTrack = project.tracks.find((t) => t.id === selectedClip.trackId);
      if (selTrack && !selTrack.hidden && !selTrack.locked) {
        const isMain = selTrack.type === 'video';
        const localT = Math.max(0, playheadTime - selectedClip.startTime);
        const tf = evaluateClipTransform(selectedClip, localT);
        const showPivotHandle =
          !isMain ||
          Math.abs(tf.pivotX) > 0.005 ||
          Math.abs(tf.pivotY) > 0.005 ||
          (selectedClip.keyframes?.length ?? 0) > 0;
        if (showPivotHandle) {
          const asset = selectedClip.assetId ? assetsMap.get(selectedClip.assetId) : undefined;
          const bounds = measureClipLocalBounds(
            ctx,
            selectedClip,
            asset,
            dims.width,
            dims.height,
            mediaCache,
            isMain
          );
          const anchorX =
            dims.width / 2 + tf.x * (dims.width / 2) + tf.pivotX * (bounds.w * 0.5);
          const anchorY =
            dims.height / 2 + tf.y * (dims.height / 2) + tf.pivotY * (bounds.h * 0.5);
          const hitRadiusCanvas = 22 * (dims.width / Math.max(1, rect.width));
          if (Math.hypot(canvasPxX - anchorX, canvasPxY - anchorY) <= hitRadiusCanvas) {
            dragStateRef.current = {
              clipId: selectedClip.id,
              mode: 'pivot',
              startClientX: e.clientX,
              startClientY: e.clientY,
              origX: tf.pivotX,
              origY: tf.pivotY,
              boundsW: Math.max(40, bounds.w),
              boundsH: Math.max(40, bounds.h),
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    const activeNonMain = project.clips
      .filter((c) => {
        const track = project.tracks.find((t) => t.id === c.trackId);
        return (
          track &&
          !track.hidden &&
          !track.locked &&
          track.type !== 'video' &&
          track.type !== 'audio' &&
          playheadTime >= c.startTime &&
          playheadTime < c.startTime + c.duration
        );
      })
      .reverse();

    let targetClip =
      selectedClip && activeNonMain.some((c) => c.id === selectedClip.id) ? selectedClip : null;

    if (!targetClip) {
      targetClip =
        activeNonMain.find((c) => {
          const tf = evaluateClipTransform(c, Math.max(0, playheadTime - c.startTime));
          return Math.abs(normX - tf.x) < 0.35 && Math.abs(normY - tf.y) < 0.28;
        }) ||
        activeNonMain[0] ||
        null;
    }

    if (!targetClip) return;
    onSelectClip(targetClip.id);
    const tf = evaluateClipTransform(targetClip, Math.max(0, playheadTime - targetClip.startTime));
    dragStateRef.current = {
      clipId: targetClip.id,
      mode: 'position',
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: tf.x,
      origY: tf.y,
      boundsW: dims.width,
      boundsH: dims.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (drag.mode === 'pivot' && onUpdateClipPivot) {
      const dxPx = ((e.clientX - drag.startClientX) / rect.width) * dims.width;
      const dyPx = ((e.clientY - drag.startClientY) / rect.height) * dims.height;
      const dPivX = dxPx / (drag.boundsW * 0.5);
      const dPivY = dyPx / (drag.boundsH * 0.5);
      let nextPivX = Math.max(-1.5, Math.min(1.5, Number((drag.origX + dPivX).toFixed(3))));
      let nextPivY = Math.max(-1.5, Math.min(1.5, Number((drag.origY + dPivY).toFixed(3))));
      if (Math.abs(nextPivX) < 0.04) nextPivX = 0;
      if (Math.abs(nextPivY) < 0.04) nextPivY = 0;
      onUpdateClipPivot(drag.clipId, nextPivX, nextPivY);
      return;
    }

    const dx = ((e.clientX - drag.startClientX) / rect.width) * 2;
    const dy = ((e.clientY - drag.startClientY) / rect.height) * 2;
    const nextX = Math.max(-1.2, Math.min(1.2, Number((drag.origX + dx).toFixed(3))));
    const nextY = Math.max(-1.2, Math.min(1.2, Number((drag.origY + dy).toFixed(3))));
    onUpdateClipTransform(drag.clipId, nextX, nextY);
  };

  const handleCanvasPointerUp = () => {
    dragStateRef.current = null;
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <section
      ref={stageRef}
      className="flex-1 min-w-0 bg-[#0B0D11] flex flex-col items-center justify-between p-2 sm:p-3 lg:p-4 min-h-0 select-none"
    >
      {/* Subtle Top Monitor Bar */}
      <div className="w-full flex items-center justify-between text-[11px] sm:text-xs text-slate-400 px-1 pb-1.5 sm:pb-2 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-medium text-slate-200 truncate">{project.name}</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-400 shrink-0 hidden sm:inline">
            {dims.width}×{dims.height}
          </span>
          <span className="hidden md:inline" aria-hidden="true">·</span>
          <span className="font-mono-tabular text-slate-400 shrink-0 hidden md:inline">{project.fps} fps</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isPickingTrackTarget && (
            <button
              type="button"
              onClick={onCancelPickTrackTarget}
              className="px-2 py-1 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Click object in frame to track (Cancel)</span>
              <span className="sm:hidden">Cancel Track</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            title="Toggle Safe Area & Center Guides"
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              showGuides
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guides</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Preview"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aspect-Fitted Canvas Stage */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
        <div
          className={`relative max-w-full max-h-full flex items-center justify-center rounded-md overflow-hidden border bg-black shadow-2xl ${
            isPickingTrackTarget ? 'border-sky-400 ring-2 ring-sky-500/40' : 'border-white/10'
          }`}
          style={{
            aspectRatio: `${dims.width} / ${dims.height}`,
            height: dims.height > dims.width ? '100%' : 'auto',
            width: dims.width >= dims.height ? '100%' : 'auto',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            className={`w-full h-full object-contain touch-none ${
              isPickingTrackTarget ? 'cursor-crosshair' : 'cursor-move'
            }`}
          />
        </div>
      </div>

      {/* Transport Bar */}
      <div className="w-full pt-2 sm:pt-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-mono-tabular shrink-0">
          <span className="text-amber-400 font-semibold">{formatTimecode(playheadTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTimecode(totalDuration)}</span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(0)}
            title="Jump to Start (Home)"
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <ChevronFirst className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            title="Step Back 1 Frame (Left Arrow)"
            className="hidden xs:inline-flex sm:inline-flex p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title="Play / Pause (Space)"
            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-[#0B0D11] flex items-center justify-center transition-colors cursor-pointer mx-0.5 sm:mx-1"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(1)}
            title="Step Forward 1 Frame (Right Arrow)"
            className="hidden xs:inline-flex sm:inline-flex p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSeek(totalDuration)}
            title="Jump to End (End)"
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <ChevronLast className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLoop}
            title="Toggle Loop Playback"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isLooping
                ? 'text-amber-400 bg-amber-500/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={masterMuted ? 'Unmute Monitor' : 'Mute Monitor'}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
          >
            {masterMuted || masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={masterMuted ? 0 : masterVolume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            aria-label="Master monitor volume"
            className="studio-slider w-16 hidden md:block"
          />
        </div>
      </div>
    </section>
  );
};
