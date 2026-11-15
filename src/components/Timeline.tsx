import React, { useRef, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Plus,
  Scissors,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MediaAsset, ProjectState, TimelineClip, Track, TrackType } from '../types/studio';
import { formatTimecode } from '../utils/defaults';

interface TimelineProps {
  project: ProjectState;
  assetsMap: Map<string, MediaAsset>;
  playheadTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  zoomPxPerSec: number;
  snapEnabled: boolean;
  onChangeZoom: (pxPerSec: number) => void;
  onToggleSnap: () => void;
  onSeek: (time: number) => void;
  onSelectClip: (clipId: string | null) => void;
  onSplitAtPlayhead: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAddTrack: (type: TrackType) => void;
  onToggleTrackProp: (trackId: string, prop: 'muted' | 'hidden' | 'locked') => void;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip, pushHistory?: boolean) => void;
  onDropAssetOnTrack: (assetId: string, trackId: string, time: number) => void;
}

const TRACK_COLORS: Record<TrackType, string> = {
  video: 'bg-[#1D2332] border-amber-500/35',
  overlay: 'bg-[#1B2532] border-sky-400/35',
  text: 'bg-[#251F33] border-violet-400/35',
  audio: 'bg-[#162726] border-emerald-400/35',
};

export const Timeline: React.FC<TimelineProps> = ({
  project,
  assetsMap,
  playheadTime,
  totalDuration,
  selectedClipId,
  zoomPxPerSec,
  snapEnabled,
  onChangeZoom,
  onToggleSnap,
  onSeek,
  onSelectClip,
  onSplitAtPlayhead,
  onDuplicateSelected,
  onDeleteSelected,
  onAddTrack,
  onToggleTrackProp,
  onUpdateClip,
  onDropAssetOnTrack,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);

  const timelineSpan = Math.max(totalDuration + 10, 24);
  const canvasWidthPx = Math.max(900, Math.ceil(timelineSpan * zoomPxPerSec));

  const majorStep = zoomPxPerSec >= 90 ? 1 : zoomPxPerSec >= 45 ? 2 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= timelineSpan; t += majorStep) {
    ticks.push(t);
  }

  const timeFromClientX = (clientX: number): number => {
    const el = scrollContainerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    return Math.max(0, x / zoomPxPerSec);
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const seek = (clientX: number) => {
      onSeek(timeFromClientX(clientX));
    };
    seek(e.clientX);
    const onMove = (ev: PointerEvent) => seek(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const findSnapPoints = (excludeClipId: string): number[] => {
    const pts = [0, playheadTime];
    for (const c of project.clips) {
      if (c.id === excludeClipId) continue;
      pts.push(c.startTime, c.startTime + c.duration);
    }
    return pts;
  };

  const snapTime = (raw: number, points: number[]): { value: number; snapped: number | null } => {
    if (!snapEnabled) return { value: raw, snapped: null };
    const threshold = 10 / zoomPxPerSec;
    let best = raw;
    let snapped: number | null = null;
    let minDiff = threshold;
    for (const p of points) {
      const diff = Math.abs(raw - p);
      if (diff < minDiff) {
        minDiff = diff;
        best = p;
        snapped = p;
      }
    }
    return { value: best, snapped };
  };

  const startDragClip = (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-left' | 'trim-right'
  ) => {
    e.stopPropagation();
    onSelectClip(clip.id);
    const track = project.tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;

    const startClientX = e.clientX;
    const origStart = clip.startTime;
    const origDur = clip.duration;
    const origOffset = clip.sourceOffset;
    const snapPoints = findSnapPoints(clip.id);

    const onMove = (ev: PointerEvent) => {
      const dt = (ev.clientX - startClientX) / zoomPxPerSec;

      if (mode === 'move') {
        const rawStart = Math.max(0, origStart + dt);
        const sStart = snapTime(rawStart, snapPoints);
        const sEnd = snapTime(rawStart + origDur, snapPoints);
        let finalStart = rawStart;
        let guide: number | null = null;
        if (sStart.snapped !== null) {
          finalStart = sStart.value;
          guide = sStart.snapped;
        } else if (sEnd.snapped !== null) {
          finalStart = Math.max(0, sEnd.value - origDur);
          guide = sEnd.snapped;
        }
        setSnapGuideTime(guide);
        onUpdateClip(
          clip.id,
          (c) => ({ ...c, startTime: Number(finalStart.toFixed(3)) }),
          false
        );
      } else if (mode === 'trim-left') {
        const maxDelta = origDur - 0.25;
        const minDelta = -origStart;
        const clampedDt = Math.max(minDelta, Math.min(maxDelta, dt));
        const rawNewStart = origStart + clampedDt;
        const snapped = snapTime(rawNewStart, snapPoints);
        const finalStart = Math.min(origStart + maxDelta, Math.max(0, snapped.value));
        const actualDt = finalStart - origStart;
        setSnapGuideTime(snapped.snapped);
        onUpdateClip(
          clip.id,
          (c) => ({
            ...c,
            startTime: Number(finalStart.toFixed(3)),
            duration: Number((origDur - actualDt).toFixed(3)),
            sourceOffset: Math.max(0, Number((origOffset + actualDt * c.speed).toFixed(3))),
          }),
          false
        );
      } else {
        const rawNewEnd = Math.max(origStart + 0.25, origStart + origDur + dt);
        const snapped = snapTime(rawNewEnd, snapPoints);
        setSnapGuideTime(snapped.snapped);
        const finalDur = Math.max(0.25, snapped.value - origStart);
        onUpdateClip(
          clip.id,
          (c) => ({ ...c, duration: Number(finalDur.toFixed(3)) }),
          false
        );
      }
    };

    const onUp = () => {
      setSnapGuideTime(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <section className="h-64 lg:h-72 shrink-0 bg-[#11141B] border-t border-white/8 flex flex-col min-h-0 select-none">
      {/* Timeline Action Toolbar */}
      <div className="h-10 px-4 border-b border-white/8 bg-[#0E1117] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSplitAtPlayhead}
            title="Split Clip at Playhead (S)"
            className="px-2.5 py-1 rounded text-xs font-medium text-slate-200 hover:bg-white/8 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split</span>
          </button>

          <button
            type="button"
            disabled={!selectedClipId}
            onClick={onDuplicateSelected}
            title="Duplicate Selected Clip"
            className="px-2.5 py-1 rounded text-xs font-medium text-slate-200 hover:bg-white/8 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            disabled={!selectedClipId}
            onClick={onDeleteSelected}
            title="Delete Selected Clip (Del)"
            className="px-2.5 py-1 rounded text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <span className="h-4 w-px bg-white/10 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleSnap}
            title="Toggle Magnetic Snapping"
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              snapEnabled
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
        </div>

        {/* Track Adder & Zoom */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAddTrack('overlay')}
              className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/8 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3 text-sky-400" />
              Overlay
            </button>
            <button
              type="button"
              onClick={() => onAddTrack('text')}
              className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/8 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3 text-violet-400" />
              Text
            </button>
            <button
              type="button"
              onClick={() => onAddTrack('audio')}
              className="px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/8 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              Audio
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeZoom(Math.max(24, zoomPxPerSec - 15))}
              title="Zoom Out"
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={24}
              max={180}
              value={zoomPxPerSec}
              onChange={(e) => onChangeZoom(parseInt(e.target.value, 10))}
              aria-label="Timeline zoom"
              className="studio-slider w-20"
            />
            <button
              type="button"
              onClick={() => onChangeZoom(Math.min(180, zoomPxPerSec + 15))}
              title="Zoom In"
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Body: Track Headers Left + Scrollable Lanes Right */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Track Headers Column */}
        <div className="w-44 shrink-0 border-r border-white/8 bg-[#0E1117] flex flex-col">
          {/* Corner cell matching ruler height */}
          <div className="h-7 border-b border-white/8 px-3 flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 shrink-0">
            <span>Tracks</span>
            <span>{project.tracks.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05]">
            {project.tracks.map((track) => (
              <TrackHeaderRow
                key={track.id}
                track={track}
                onToggleProp={onToggleTrackProp}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Time Ruler + Track Lanes */}
        <div
          ref={scrollContainerRef}
          onClick={() => onSelectClip(null)}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#0B0D11]"
        >
          <div className="relative min-h-full" style={{ width: `${canvasWidthPx}px` }}>
            {/* Sticky Time Ruler */}
            <div
              onPointerDown={handleRulerPointerDown}
              className="sticky top-0 z-20 h-7 bg-[#11141B] border-b border-white/10 cursor-pointer"
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 border-l border-white/15 pl-1.5 flex items-center"
                  style={{ left: `${t * zoomPxPerSec}px` }}
                >
                  <span className="text-[10px] font-mono-tabular text-slate-400">
                    {formatTimecode(t).slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            <div className="divide-y divide-white/[0.05]">
              {project.tracks.map((track) => {
                const laneClips = project.clips.filter((c) => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const assetId = e.dataTransfer.getData('application/nova-asset-id');
                      if (assetId) {
                        onDropAssetOnTrack(assetId, track.id, timeFromClientX(e.clientX));
                      }
                    }}
                    className={`h-13 relative ${track.locked ? 'opacity-70' : ''}`}
                  >
                    {laneClips.map((clip) => {
                      const asset = clip.assetId ? assetsMap.get(clip.assetId) : undefined;
                      const isSelected = clip.id === selectedClipId;
                      const leftPx = clip.startTime * zoomPxPerSec;
                      const widthPx = Math.max(24, clip.duration * zoomPxPerSec);

                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => startDragClip(e, clip, 'move')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                          }}
                          style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                          className={`absolute top-1.5 bottom-1.5 rounded overflow-hidden border cursor-grab active:cursor-grabbing transition-shadow ${
                            TRACK_COLORS[track.type]
                          } ${isSelected ? 'ring-2 ring-amber-400 border-amber-400 z-10' : 'hover:border-white/30'}`}
                        >
                          {/* Background Visual Strip (Thumbnails or Audio Waveform) */}
                          {asset?.thumbnailUrl && (clip.kind === 'image' || clip.kind === 'video') && (
                            <div className="absolute inset-0 flex opacity-45 pointer-events-none">
                              {Array.from({ length: Math.max(1, Math.ceil(widthPx / 64)) }).map((_, idx) => (
                                <img
                                  key={idx}
                                  src={
                                    asset.thumbnails && asset.thumbnails.length > 0
                                      ? asset.thumbnails[idx % asset.thumbnails.length]
                                      : asset.thumbnailUrl
                                  }
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-16 object-cover shrink-0"
                                />
                              ))}
                            </div>
                          )}

                          {clip.kind === 'color' && asset?.color && (
                            <div
                              className="absolute inset-0 opacity-65 pointer-events-none"
                              style={{ backgroundColor: asset.color }}
                            />
                          )}

                          {clip.kind === 'audio' && asset?.waveform && (
                            <div className="absolute inset-0 flex items-center gap-[2px] px-1 opacity-50 pointer-events-none">
                              {asset.waveform.map((pk, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-emerald-400 rounded-sm"
                                  style={{ height: `${Math.max(14, Math.round(pk * 78))}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Clip Label & Subtle Feature Flags */}
                          <div className="relative z-10 h-full px-2.5 flex items-center justify-between gap-1 pointer-events-none">
                            <span className="text-[11px] font-medium text-white truncate drop-shadow">
                              {clip.kind === 'text' && clip.text ? clip.text.content : clip.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono-tabular text-slate-200/90">
                              {clip.transitionIn.type !== 'none' && track.type === 'video' && (
                                <span className="bg-black/55 px-1 rounded text-amber-300">
                                  {clip.transitionIn.type}
                                </span>
                              )}
                              {clip.aiMask?.enabled && (
                                <span className="bg-black/55 px-1 rounded text-emerald-300">
                                  Cutout
                                </span>
                              )}
                              {clip.motionTrack?.enabled && (
                                <span className="bg-black/55 px-1 rounded text-sky-300">
                                  Track
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Left & Right Trim Handles */}
                          <div
                            onPointerDown={(e) => startDragClip(e, clip, 'trim-left')}
                            title="Drag to trim start"
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-400/70 z-20"
                          />
                          <div
                            onPointerDown={(e) => startDragClip(e, clip, 'trim-right')}
                            title="Drag to trim end"
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-400/70 z-20"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Snap Alignment Guide Line */}
            {snapGuideTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-sky-400 z-20 pointer-events-none"
                style={{ left: `${snapGuideTime * zoomPxPerSec}px` }}
              />
            )}

            {/* Playhead Needle */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400 z-30 pointer-events-none"
              style={{ left: `${playheadTime * zoomPxPerSec}px` }}
            >
              <div className="w-2.5 h-3 -ml-[4.5px] bg-amber-400 rounded-b-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TrackHeaderRow: React.FC<{
  track: Track;
  onToggleProp: (trackId: string, prop: 'muted' | 'hidden' | 'locked') => void;
}> = ({ track, onToggleProp }) => (
  <div className="h-13 px-2.5 flex items-center justify-between gap-1">
    <span className="text-[11px] font-medium text-slate-300 truncate">{track.name}</span>
    <div className="flex items-center gap-0.5 shrink-0">
      {(track.type === 'audio' || track.type === 'video') && (
        <button
          type="button"
          onClick={() => onToggleProp(track.id, 'muted')}
          title={track.muted ? 'Unmute Track' : 'Mute Track'}
          className={`p-1 rounded cursor-pointer ${
            track.muted ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </button>
      )}
      {track.type !== 'audio' && (
        <button
          type="button"
          onClick={() => onToggleProp(track.id, 'hidden')}
          title={track.hidden ? 'Show Track' : 'Hide Track'}
          className={`p-1 rounded cursor-pointer ${
            track.hidden ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-200'
          }`}
        >
          {track.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      )}
      <button
        type="button"
        onClick={() => onToggleProp(track.id, 'locked')}
        title={track.locked ? 'Unlock Track' : 'Lock Track'}
        className={`p-1 rounded cursor-pointer ${
          track.locked ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-200'
        }`}
      >
        {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      </button>
    </div>
  </div>
);
