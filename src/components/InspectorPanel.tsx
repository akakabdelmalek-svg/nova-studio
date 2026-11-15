import React, { useState } from 'react';
import {
  Captions,
  Copy,
  Crosshair,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  RotateCcw,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import {
  AnimationPreset,
  AspectRatio,
  ProjectState,
  TimelineClip,
  TransitionType,
} from '../types/studio';
import {
  ASPECT_RATIO_DIMENSIONS,
  TRANSITION_PRESETS,
  createDefaultColor,
  createDefaultTransform,
} from '../utils/defaults';

interface InspectorPanelProps {
  project: ProjectState;
  selectedClip: TimelineClip | null;
  isMainTrackClip: boolean;
  aiBusyTask: string | null;
  aiStatusMessage: { type: 'info' | 'error'; text: string } | null;
  isPickingTrackTarget: boolean;
  onUpdateProject: (patch: Partial<ProjectState>) => void;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onSplitClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onRunBackgroundRemoval: (clipId: string) => void;
  onRunGenerateSubtitles: (clipId: string) => void;
  onStartPickTrackTarget: (clipId: string) => void;
  className?: string;
  onMobileClose?: () => void;
}

type InspectorTab = 'basic' | 'color' | 'fx' | 'ai' | 'text';

const ANIM_OPTIONS: Array<{ value: AnimationPreset; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'pop', label: 'Pop Scale' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'zoomIn', label: 'Zoom Push' },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  project,
  selectedClip,
  isMainTrackClip,
  aiBusyTask,
  aiStatusMessage,
  isPickingTrackTarget,
  onUpdateProject,
  onUpdateClip,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onRunBackgroundRemoval,
  onRunGenerateSubtitles,
  onStartPickTrackTarget,
  className,
  onMobileClose,
}) => {
  const [tab, setTab] = useState<InspectorTab>('basic');

  if (!selectedClip) {
    return (
      <aside
        className={
          className ||
          'w-76 xl:w-80 shrink-0 bg-[#11141B] border-l border-white/8 flex flex-col min-h-0 select-none'
        }
      >
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onMobileClose && (
              <span className="lg:hidden w-8 h-1 rounded-full bg-white/25" aria-hidden="true" />
            )}
            <h2 className="text-xs font-semibold text-slate-200">Project Settings</h2>
          </div>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden px-2.5 py-1 rounded bg-white/8 hover:bg-white/15 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer min-h-[32px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label htmlFor="proj-name" className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Project Name
            </label>
            <input
              id="proj-name"
              type="text"
              value={project.name}
              onChange={(e) => onUpdateProject({ name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Canvas Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(ASPECT_RATIO_DIMENSIONS) as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onUpdateProject({ aspectRatio: ratio })}
                  className={`px-2.5 py-2 rounded text-xs font-medium text-left transition-colors cursor-pointer ${
                    project.aspectRatio === ratio
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/50'
                      : 'bg-[#161A23] text-slate-300 border border-white/8 hover:border-white/20'
                  }`}
                >
                  <span className="font-mono-tabular block font-semibold">{ratio}</span>
                  <span className="text-[10px] text-slate-400">
                    {ASPECT_RATIO_DIMENSIONS[ratio].label.split(' ')[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Timeline Frame Rate
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[24, 30, 60].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => onUpdateProject({ fps })}
                  className={`py-1.5 rounded text-xs font-mono-tabular font-medium cursor-pointer transition-colors ${
                    project.fps === fps
                      ? 'bg-amber-500 text-[#0B0D11] font-semibold'
                      : 'bg-[#161A23] text-slate-300 border border-white/8 hover:border-white/20'
                  }`}
                >
                  {fps} fps
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="proj-bg" className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Canvas Matte Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="proj-bg"
                type="color"
                value={project.backgroundColor}
                onChange={(e) => onUpdateProject({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded bg-transparent border border-white/15 cursor-pointer"
              />
              <span className="text-xs font-mono-tabular text-slate-300">
                {project.backgroundColor}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/8 space-y-2 text-xs text-slate-400">
            <p className="text-slate-300 font-medium">Quick Tip</p>
            <p className="leading-relaxed">
              Select any clip on the timeline to adjust transforms, color grading, stacked FX,
              transitions, chroma key, AI background removal, AI subtitles, or object tracking.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const isVisual = selectedClip.kind !== 'audio';
  const isMediaVisual = selectedClip.kind === 'image' || selectedClip.kind === 'video';
  const isAudioCapable = selectedClip.kind === 'audio' || selectedClip.kind === 'video';
  const isTrackableOverlay = !isMainTrackClip && isVisual;

  const availableTabs: Array<{ id: InspectorTab; label: string }> = [
    { id: 'basic', label: isAudioCapable && !isVisual ? 'Audio' : 'Transform' },
    ...(selectedClip.kind === 'text' ? [{ id: 'text' as const, label: 'Style' }] : []),
    ...(isMediaVisual ? [{ id: 'color' as const, label: 'Color' }] : []),
    ...(isVisual ? [{ id: 'fx' as const, label: `FX (${(selectedClip.effects || []).length})` }] : []),
    { id: 'ai', label: 'AI & Key' },
  ];

  const activeTab = availableTabs.some((t) => t.id === tab) ? tab : availableTabs[0].id;

  return (
    <aside
      className={
        className ||
        'w-76 xl:w-80 shrink-0 bg-[#11141B] border-l border-white/8 flex flex-col min-h-0 select-none'
      }
    >
      {/* Header + Quick Clip Actions */}
      <div className="px-3.5 sm:px-4 py-2.5 border-b border-white/8 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-white truncate">{selectedClip.name}</h2>
          <p className="text-[11px] text-slate-400 font-mono-tabular">
            {selectedClip.startTime.toFixed(2)}s · {selectedClip.duration.toFixed(2)}s
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSplitClip(selectedClip.id)}
            title="Split at Playhead (S)"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicateClip(selectedClip.id)}
            title="Duplicate Clip"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteClip(selectedClip.id)}
            title="Delete Clip (Del)"
            className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden ml-1 px-2.5 py-1 rounded bg-white/8 hover:bg-white/15 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-white/8 bg-[#0E1117]">
        {availableTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? 'border-amber-500 text-amber-400 bg-[#161A23]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiStatusMessage && (
          <div
            className={`p-2.5 rounded border text-xs leading-snug ${
              aiStatusMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-sky-500/10 border-sky-500/35 text-sky-200'
            }`}
          >
            {aiStatusMessage.text}
          </div>
        )}

        {activeTab === 'basic' && (
          <>
            {isVisual && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Transform</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        transform: createDefaultTransform(),
                      }))
                    }
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <SliderRow
                  label="Scale"
                  value={Math.round(selectedClip.transform.scale * 100)}
                  min={10}
                  max={250}
                  unit="%"
                  onChange={(val) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      transform: { ...c.transform, scale: val / 100 },
                    }))
                  }
                />

                <SliderRow
                  label="Opacity"
                  value={Math.round(selectedClip.transform.opacity * 100)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(val) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      transform: { ...c.transform, opacity: val / 100 },
                    }))
                  }
                />

                <SliderRow
                  label="Rotation"
                  value={Math.round(selectedClip.transform.rotation)}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={(val) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      transform: { ...c.transform, rotation: val },
                    }))
                  }
                />

                <div className="grid grid-cols-2 gap-2">
                  <SliderRow
                    label="Pos X"
                    value={Math.round(selectedClip.transform.x * 100)}
                    min={-100}
                    max={100}
                    unit="%"
                    onChange={(val) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        transform: { ...c.transform, x: val / 100 },
                      }))
                    }
                  />
                  <SliderRow
                    label="Pos Y"
                    value={Math.round(selectedClip.transform.y * 100)}
                    min={-100}
                    max={100}
                    unit="%"
                    onChange={(val) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        transform: { ...c.transform, y: val / 100 },
                      }))
                    }
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        transform: { ...c.transform, flipH: !c.transform.flipH },
                      }))
                    }
                    className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 border cursor-pointer ${
                      selectedClip.transform.flipH
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                        : 'bg-[#161A23] border-white/8 text-slate-300'
                    }`}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    Flip H
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        transform: { ...c.transform, flipV: !c.transform.flipV },
                      }))
                    }
                    className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 border cursor-pointer ${
                      selectedClip.transform.flipV
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                        : 'bg-[#161A23] border-white/8 text-slate-300'
                    }`}
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    Flip V
                  </button>
                </div>

                {/* Animations */}
                <div className="pt-3 border-t border-white/8 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-200 block">Motion & Fades</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">In Animation</label>
                      <select
                        value={selectedClip.inAnimation}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            inAnimation: e.target.value as AnimationPreset,
                          }))
                        }
                        className="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200"
                      >
                        {ANIM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Out Animation</label>
                      <select
                        value={selectedClip.outAnimation}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            outAnimation: e.target.value as AnimationPreset,
                          }))
                        }
                        className="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200"
                      >
                        {ANIM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {isMainTrackClip && (
                  <div className="pt-3 border-t border-white/8 space-y-2">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Incoming Transition
                    </span>
                    <select
                      value={selectedClip.transitionIn.type}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          transitionIn: {
                            ...c.transitionIn,
                            type: e.target.value as TransitionType,
                          },
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200"
                    >
                      {TRANSITION_PRESETS.map((tr) => (
                        <option key={tr.type} value={tr.type}>
                          {tr.label}
                        </option>
                      ))}
                    </select>
                    {selectedClip.transitionIn.type !== 'none' && (
                      <SliderRow
                        label="Transition Duration"
                        value={Math.round(selectedClip.transitionIn.duration * 10) / 10}
                        min={0.2}
                        max={2.5}
                        step={0.1}
                        unit="s"
                        onChange={(val) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            transitionIn: { ...c.transitionIn, duration: val },
                          }))
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Speed & Audio Controls */}
            {(selectedClip.kind === 'video' || selectedClip.kind === 'audio') && (
              <div className="pt-3 border-t border-white/8 space-y-3">
                <span className="text-xs font-semibold text-slate-200 block">Speed & Audio</span>
                <SliderRow
                  label="Playback Speed"
                  value={selectedClip.speed}
                  min={0.25}
                  max={3}
                  step={0.05}
                  unit="x"
                  onChange={(val) =>
                    onUpdateClip(selectedClip.id, (c) => ({ ...c, speed: val }))
                  }
                />
                <SliderRow
                  label="Volume"
                  value={selectedClip.volume}
                  min={0}
                  max={200}
                  unit="%"
                  onChange={(val) =>
                    onUpdateClip(selectedClip.id, (c) => ({ ...c, volume: val }))
                  }
                />
                {selectedClip.kind === 'audio' && (
                  <div className="grid grid-cols-2 gap-2">
                    <SliderRow
                      label="Fade In"
                      value={selectedClip.fadeIn}
                      min={0}
                      max={4}
                      step={0.1}
                      unit="s"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({ ...c, fadeIn: val }))
                      }
                    />
                    <SliderRow
                      label="Fade Out"
                      value={selectedClip.fadeOut}
                      min={0}
                      max={4}
                      step={0.1}
                      unit="s"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({ ...c, fadeOut: val }))
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sticker Color Customization */}
            {selectedClip.kind === 'sticker' && selectedClip.sticker && (
              <div className="pt-3 border-t border-white/8 space-y-3">
                <span className="text-xs font-semibold text-slate-200 block">Sticker Styling</span>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Primary</label>
                    <input
                      type="color"
                      value={selectedClip.sticker.primaryColor}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          sticker: c.sticker ? { ...c.sticker, primaryColor: e.target.value } : undefined,
                        }))
                      }
                      className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Secondary</label>
                    <input
                      type="color"
                      value={selectedClip.sticker.secondaryColor}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          sticker: c.sticker ? { ...c.sticker, secondaryColor: e.target.value } : undefined,
                        }))
                      }
                      className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                    />
                  </div>
                </div>
                {selectedClip.sticker.label !== undefined && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Badge Label</label>
                    <input
                      type="text"
                      value={selectedClip.sticker.label}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          sticker: c.sticker ? { ...c.sticker, label: e.target.value } : undefined,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'text' && selectedClip.text && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Text Content</label>
              <textarea
                rows={3}
                value={selectedClip.text.content}
                onChange={(e) =>
                  onUpdateClip(selectedClip.id, (c) => ({
                    ...c,
                    text: c.text ? { ...c.text, content: e.target.value } : undefined,
                  }))
                }
                className="w-full px-2.5 py-2 rounded bg-[#0B0D11] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Font Family</label>
                <select
                  value={selectedClip.text.fontFamily}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      text: c.text ? { ...c.text, fontFamily: e.target.value } : undefined,
                    }))
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200"
                >
                  <option value="Outfit">Outfit</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Georgia">Georgia Serif</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Align</label>
                <select
                  value={selectedClip.text.align}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      text: c.text
                        ? { ...c.text, align: e.target.value as 'left' | 'center' | 'right' }
                        : undefined,
                    }))
                  }
                  className="w-full px-2 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <SliderRow
              label="Font Size"
              value={selectedClip.text.fontSize}
              min={16}
              max={140}
              unit="px"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  text: c.text ? { ...c.text, fontSize: val } : undefined,
                }))
              }
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Text</label>
                <input
                  type="color"
                  value={selectedClip.text.color}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      text: c.text ? { ...c.text, color: e.target.value } : undefined,
                    }))
                  }
                  className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Backdrop</label>
                <input
                  type="color"
                  value={selectedClip.text.bgColor}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      text: c.text ? { ...c.text, bgColor: e.target.value } : undefined,
                    }))
                  }
                  className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Outline</label>
                <input
                  type="color"
                  value={selectedClip.text.strokeColor}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      text: c.text ? { ...c.text, strokeColor: e.target.value } : undefined,
                    }))
                  }
                  className="w-full h-7 rounded bg-transparent border border-white/10 cursor-pointer"
                />
              </div>
            </div>

            <SliderRow
              label="Backdrop Opacity"
              value={Math.round(selectedClip.text.bgOpacity * 100)}
              min={0}
              max={100}
              unit="%"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  text: c.text ? { ...c.text, bgOpacity: val / 100 } : undefined,
                }))
              }
            />

            <SliderRow
              label="Outline Width"
              value={selectedClip.text.strokeWidth}
              min={0}
              max={12}
              unit="px"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  text: c.text ? { ...c.text, strokeWidth: val } : undefined,
                }))
              }
            />
          </div>
        )}

        {activeTab === 'color' && isMediaVisual && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Color Grading</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateClip(selectedClip.id, (c) => ({ ...c, color: createDefaultColor() }))
                }
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <SliderRow
              label="Brightness"
              value={selectedClip.color.brightness}
              min={-70}
              max={70}
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, preset: 'none', brightness: val },
                }))
              }
            />
            <SliderRow
              label="Contrast"
              value={selectedClip.color.contrast}
              min={-70}
              max={80}
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, preset: 'none', contrast: val },
                }))
              }
            />
            <SliderRow
              label="Saturation"
              value={selectedClip.color.saturation}
              min={-100}
              max={100}
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, preset: 'none', saturation: val },
                }))
              }
            />
            <SliderRow
              label="Hue Shift"
              value={selectedClip.color.hue}
              min={-180}
              max={180}
              unit="°"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, preset: 'none', hue: val },
                }))
              }
            />
            <SliderRow
              label="Vignette"
              value={selectedClip.color.vignette}
              min={0}
              max={100}
              unit="%"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, vignette: val },
                }))
              }
            />
            <SliderRow
              label="Soft Blur"
              value={selectedClip.color.blur}
              min={0}
              max={16}
              step={0.5}
              unit="px"
              onChange={(val) =>
                onUpdateClip(selectedClip.id, (c) => ({
                  ...c,
                  color: { ...c.color, blur: val },
                }))
              }
            />
          </div>
        )}

        {activeTab === 'fx' && isVisual && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Active Clip Effects</span>
              {(selectedClip.effects || []).length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateClip(selectedClip.id, (c) => ({ ...c, effects: [] }))
                  }
                  className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {(selectedClip.effects || []).length === 0 ? (
              <div className="p-4 rounded-md bg-[#161A23] border border-white/8 text-center space-y-1.5">
                <p className="text-xs text-slate-300 font-medium">No Effects Applied</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open the Effects tab on the left drawer to stack Glitch, VHS, Light Leak, Anime,
                  Snow, Blur, Kaleidoscope, and 60+ free effects onto this clip.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedClip.effects || []).map((fx) => (
                  <div
                    key={fx.id}
                    className="p-3 rounded-md bg-[#161A23] border border-white/8 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fx.enabled}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              effects: (c.effects || []).map((item) =>
                                item.id === fx.id ? { ...item, enabled: e.target.checked } : item
                              ),
                            }))
                          }
                          className="accent-amber-500 w-3.5 h-3.5"
                        />
                        <span className="capitalize">{fx.type.replace(/([A-Z])/g, ' $1')}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            effects: (c.effects || []).filter((item) => item.id !== fx.id),
                          }))
                        }
                        className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <SliderRow
                      label="Intensity"
                      value={fx.intensity}
                      min={0}
                      max={100}
                      unit="%"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          effects: (c.effects || []).map((item) =>
                            item.id === fx.id ? { ...item, intensity: val } : item
                          ),
                        }))
                      }
                    />

                    <SliderRow
                      label="Speed"
                      value={fx.speed}
                      min={0.25}
                      max={3}
                      step={0.05}
                      unit="x"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          effects: (c.effects || []).map((item) =>
                            item.id === fx.id ? { ...item, speed: val } : item
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* 1. AI Automatic Background Removal */}
            {isMediaVisual && (
              <div className="space-y-2.5 pb-4 border-b border-white/8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    AI Background Removal
                  </span>
                  {selectedClip.aiMask?.enabled && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          aiMask: c.aiMask ? { ...c.aiMask, enabled: false } : undefined,
                        }))
                      }
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Disable
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically isolates the main subject from its background using AI vision segmentation.
                </p>
                <button
                  type="button"
                  disabled={Boolean(aiBusyTask)}
                  onClick={() => onRunBackgroundRemoval(selectedClip.id)}
                  className="w-full py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#0B0D11] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {aiBusyTask === 'bg-remove' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eraser className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {aiBusyTask === 'bg-remove'
                      ? 'Detecting Subject...'
                      : selectedClip.aiMask?.enabled
                        ? 'Re-run AI Cutout'
                        : 'Remove Background'}
                  </span>
                </button>

                {selectedClip.aiMask && selectedClip.aiMask.polygon.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Subject</span>
                      <span className="text-slate-200 font-medium truncate max-w-40">
                        {selectedClip.aiMask.subjectLabel}
                      </span>
                    </div>
                    <SliderRow
                      label="Edge Feather"
                      value={selectedClip.aiMask.feather}
                      min={0}
                      max={28}
                      unit="px"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          aiMask: c.aiMask ? { ...c.aiMask, enabled: true, feather: val } : undefined,
                        }))
                      }
                    />
                    <SliderRow
                      label="Mask Expand"
                      value={Math.round(selectedClip.aiMask.expand * 100)}
                      min={-20}
                      max={30}
                      unit="%"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          aiMask: c.aiMask ? { ...c.aiMask, enabled: true, expand: val / 100 } : undefined,
                        }))
                      }
                    />
                    <SliderRow
                      label="Edge Color Cleanup"
                      value={selectedClip.aiMask.colorCleanup}
                      min={0}
                      max={60}
                      unit="%"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          aiMask: c.aiMask ? { ...c.aiMask, enabled: true, colorCleanup: val } : undefined,
                        }))
                      }
                    />
                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1">
                      <span>Invert Cutout</span>
                      <input
                        type="checkbox"
                        checked={selectedClip.aiMask.invert}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            aiMask: c.aiMask ? { ...c.aiMask, invert: e.target.checked } : undefined,
                          }))
                        }
                        className="accent-amber-500 w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* 2. AI Subtitles from Audio */}
            {isAudioCapable && (
              <div className="space-y-2.5 pb-4 border-b border-white/8">
                <span className="text-xs font-semibold text-slate-200 block">
                  AI Subtitles from Audio
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Transcribes speech from this clip and inserts timed subtitle layers onto the Titles track.
                </p>
                <button
                  type="button"
                  disabled={Boolean(aiBusyTask)}
                  onClick={() => onRunGenerateSubtitles(selectedClip.id)}
                  className="w-full py-2 px-3 rounded-md bg-[#1B202C] hover:bg-[#232938] disabled:opacity-50 border border-white/12 text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {aiBusyTask === 'subtitles' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Captions className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {aiBusyTask === 'subtitles' ? 'Transcribing Audio...' : 'Generate AI Subtitles'}
                  </span>
                </button>
              </div>
            )}

            {/* 3. AI Object Motion Tracking */}
            {isTrackableOverlay && (
              <div className="space-y-2.5 pb-4 border-b border-white/8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    AI Object Tracking
                  </span>
                  {selectedClip.motionTrack?.enabled && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          motionTrack: c.motionTrack
                            ? { ...c.motionTrack, enabled: false }
                            : undefined,
                        }))
                      }
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear Track
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Lock this overlay, sticker, or label onto any moving object across the underlying video frames.
                </p>
                <button
                  type="button"
                  disabled={Boolean(aiBusyTask)}
                  onClick={() => onStartPickTrackTarget(selectedClip.id)}
                  className={`w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isPickingTrackTarget
                      ? 'bg-sky-500 text-[#0B0D11]'
                      : 'bg-[#1B202C] hover:bg-[#232938] border border-white/12 text-slate-100'
                  }`}
                >
                  {aiBusyTask === 'track' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>
                    {aiBusyTask === 'track'
                      ? 'Tracking Across Frames...'
                      : isPickingTrackTarget
                        ? 'Click Target on Preview'
                        : 'Pick Object on Preview'}
                  </span>
                </button>

                {selectedClip.motionTrack && selectedClip.motionTrack.keyframes.length > 0 && (
                  <div className="p-2.5 rounded bg-[#0B0D11] border border-white/8 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target</span>
                      <span className="text-sky-300 font-medium truncate max-w-36">
                        {selectedClip.motionTrack.targetLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Keyframes</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.motionTrack.keyframes.length} points
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Chroma Key (Green Screen) */}
            {isMediaVisual && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Chroma Key</span>
                    <span className="text-[11px] text-slate-400">Remove solid green/blue screen</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClip.chromaKey.enabled}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          chromaKey: { ...c.chromaKey, enabled: e.target.checked },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#232834] rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>

                {selectedClip.chromaKey.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Key Color</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              chromaKey: { ...c.chromaKey, color: '#00d148' },
                            }))
                          }
                          className="w-5 h-5 rounded bg-[#00d148] border border-white/20 cursor-pointer"
                          title="Green Screen"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              chromaKey: { ...c.chromaKey, color: '#0055ff' },
                            }))
                          }
                          className="w-5 h-5 rounded bg-[#0055ff] border border-white/20 cursor-pointer"
                          title="Blue Screen"
                        />
                        <input
                          type="color"
                          value={selectedClip.chromaKey.color}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              chromaKey: { ...c.chromaKey, color: e.target.value },
                            }))
                          }
                          className="w-6 h-6 rounded bg-transparent border border-white/15 cursor-pointer"
                        />
                      </div>
                    </div>

                    <SliderRow
                      label="Similarity"
                      value={selectedClip.chromaKey.similarity}
                      min={1}
                      max={95}
                      unit="%"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          chromaKey: { ...c.chromaKey, similarity: val },
                        }))
                      }
                    />
                    <SliderRow
                      label="Edge Smoothness"
                      value={selectedClip.chromaKey.smoothness}
                      min={0}
                      max={80}
                      unit="%"
                      onChange={(val) =>
                        onUpdateClip(selectedClip.id, (c) => ({
                          ...c,
                          chromaKey: { ...c.chromaKey, smoothness: val },
                        }))
                      }
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}) => (
  <div>
    <div className="flex items-center justify-between text-[11px] mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono-tabular text-slate-200">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="studio-slider w-full"
    />
  </div>
);
