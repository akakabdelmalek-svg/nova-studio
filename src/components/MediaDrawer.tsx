import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  Search,
  Shapes,
  Sliders,
  Sparkles,
  Square,
  Type,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  AudioGenre,
  AudioMood,
  EffectCategory,
  FilterPresetId,
  MediaAsset,
  StickerShape,
  TextStyle,
  TransitionCategory,
  TransitionType,
  VideoEffectType,
} from '../types/studio';
import { audioEngine } from '../utils/audioEngine';
import {
  EFFECT_PRESETS,
  FILTER_PRESETS,
  STICKER_PRESETS,
  TEXT_PRESETS,
  TRANSITION_PRESETS,
  formatTimecode,
} from '../utils/defaults';

export type DrawerTab =
  | 'media'
  | 'text'
  | 'audio'
  | 'filters'
  | 'effects'
  | 'stickers'
  | 'transitions';

interface MediaDrawerProps {
  assets: MediaAsset[];
  hasSelectedClip: boolean;
  selectedClipSupportsTransition: boolean;
  activeFilterId: FilterPresetId;
  activeTransitionType: TransitionType;
  activeEffectTypes: VideoEffectType[];
  onImportFiles: (files: FileList) => void;
  onImportRecordedAudio: (blob: Blob, name: string) => void;
  onAddMediaClip: (asset: MediaAsset, targetTrackType?: 'video' | 'overlay' | 'audio') => void;
  onAddTextClip: (preset: { label: string; style: TextStyle; x?: number; y?: number }) => void;
  onAddStickerClip: (preset: {
    shape: StickerShape;
    label: string;
    primaryColor: string;
    secondaryColor: string;
    textLabel?: string;
  }) => void;
  onApplyFilter: (presetId: FilterPresetId) => void;
  onToggleEffect: (effectType: VideoEffectType) => void;
  onApplyTransition: (type: TransitionType) => void;
}

const TABS: Array<{ id: DrawerTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'transitions', label: 'Transitions', icon: Layers },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'filters', label: 'Color', icon: Sliders },
  { id: 'stickers', label: 'Stickers', icon: Shapes },
];

const GENRES: Array<'All' | AudioGenre> = [
  'All',
  'Lo-Fi',
  'Cinematic',
  'Electronic',
  'Acoustic',
  'Ambient',
  'SFX',
];

const MOODS: Array<'All' | AudioMood> = [
  'All',
  'Chill',
  'Energetic',
  'Dramatic',
  'Uplifting',
  'Suspense',
  'Crisp',
];

const EFFECT_CATEGORIES: EffectCategory[] = [
  'All',
  'Retro & Film',
  'Glitch & Cyber',
  'Camera & Motion',
  'Light & Glow',
  'Particles & Weather',
  'Cosmic & Portal',
  'Fire & Ice',
  'Water & Crystal',
  'Artistic & Distortion',
];

const TRANSITION_CATEGORIES: TransitionCategory[] = [
  'All',
  'Basic',
  'Zoom & Camera',
  'Motion & 3D',
  'Swipe & Wipes',
  'Flash & Light',
  'Break & Liquid',
  'Portal & Space',
  'Cosmic & Solar',
  'Quantum & Cyber',
  'Phantom & Shadow',
];

export const MediaDrawer: React.FC<MediaDrawerProps> = ({
  assets,
  hasSelectedClip,
  selectedClipSupportsTransition,
  activeFilterId,
  activeTransitionType,
  activeEffectTypes,
  onImportFiles,
  onImportRecordedAudio,
  onAddMediaClip,
  onAddTextClip,
  onAddStickerClip,
  onApplyFilter,
  onToggleEffect,
  onApplyTransition,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('media');
  const [isDragOver, setIsDragOver] = useState(false);

  const [audioSearch, setAudioSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<'All' | AudioGenre>('All');
  const [selectedMood, setSelectedMood] = useState<'All' | AudioMood>('All');
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [effectSearch, setEffectSearch] = useState('');
  const [effectCategory, setEffectCategory] = useState<EffectCategory>('All');

  const [transitionSearch, setTransitionSearch] = useState('');
  const [transitionCategory, setTransitionCategory] = useState<TransitionCategory>('All');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visualAssets = assets.filter((a) => a.kind !== 'audio');

  const audioAssets = useMemo(() => {
    const q = audioSearch.trim().toLowerCase();
    return assets.filter((a) => {
      if (a.kind !== 'audio') return false;
      if (selectedGenre !== 'All' && a.genre !== selectedGenre) return false;
      if (selectedMood !== 'All' && a.mood !== selectedMood) return false;
      if (q) {
        const hay = `${a.name} ${a.genre || ''} ${a.mood || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, audioSearch, selectedGenre, selectedMood]);

  const filteredEffects = useMemo(() => {
    const q = effectSearch.trim().toLowerCase();
    return EFFECT_PRESETS.filter((fx) => {
      if (effectCategory !== 'All' && fx.category !== effectCategory) return false;
      if (q) {
        const hay = `${fx.label} ${fx.category} ${fx.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [effectSearch, effectCategory]);

  const filteredTransitions = useMemo(() => {
    const q = transitionSearch.trim().toLowerCase();
    return TRANSITION_PRESETS.filter((tr) => {
      if (transitionCategory !== 'All' && tr.category !== transitionCategory) return false;
      if (q) {
        const hay = `${tr.label} ${tr.category} ${tr.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transitionSearch, transitionCategory]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handleToggleAudition = (assetId: string) => {
    const started = audioEngine.togglePreview(assetId, () => {
      setPreviewingAssetId((curr) => (curr === assetId ? null : curr));
    });
    setPreviewingAssetId(started ? assetId : null);
  };

  const handleToggleVoiceRecord = async () => {
    setVoiceError(null);
    if (isRecordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        onImportRecordedAudio(blob, `Voiceover ${stamp}`);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      setVoiceError('Microphone access denied or unavailable.');
    }
  };

  return (
    <aside className="w-76 xl:w-84 shrink-0 bg-[#11141B] border-r border-white/8 flex flex-col min-h-0 select-none">
      {/* Scrollable Horizontal Icon + Label Rail */}
      <div className="flex overflow-x-auto border-b border-white/8 bg-[#0E1117] shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
                active
                  ? 'text-amber-400 border-amber-500 bg-[#161A23]'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {activeTab === 'media' && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              className={`border border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-white/15 bg-[#161A23] hover:border-white/30'
              }`}
            >
              <Upload className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-200">Import Video, Image or Audio</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Drop files here or click to browse</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-300">Library Clips</h2>
                <span className="text-[11px] text-slate-500 font-mono-tabular">
                  {visualAssets.length} items
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {visualAssets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/nova-asset-id', asset.id);
                    }}
                    className="group relative rounded-md overflow-hidden bg-[#181C26] border border-white/8 hover:border-amber-500/60 transition-colors"
                  >
                    <div className="aspect-video bg-[#0B0D11] relative overflow-hidden">
                      {asset.kind === 'color' ? (
                        <div className="w-full h-full" style={{ backgroundColor: asset.color }} />
                      ) : asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          {asset.kind === 'video' ? (
                            <Film className="w-5 h-5" />
                          ) : (
                            <ImageIcon className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        <button
                          type="button"
                          onClick={() => onAddMediaClip(asset, 'video')}
                          title="Add to Main Video Track"
                          className="px-2 py-1 text-[11px] font-semibold bg-amber-500 text-[#0B0D11] rounded hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                        >
                          + Main
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddMediaClip(asset, 'overlay')}
                          title="Add as Picture-in-Picture Overlay"
                          className="px-2 py-1 text-[11px] font-medium bg-[#1E2330] text-white border border-white/15 rounded hover:bg-[#293042] cursor-pointer whitespace-nowrap"
                        >
                          + PiP
                        </button>
                      </div>
                    </div>

                    <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {asset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono-tabular shrink-0">
                        {asset.duration.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-200">Video Effects</h2>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {filteredEffects.length} free FX
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={effectSearch}
                onChange={(e) => setEffectSearch(e.target.value)}
                placeholder="Search Nova, Matrix, Plasma, Ice, Fire, VHS..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {EFFECT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEffectCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    effectCategory === cat
                      ? 'bg-amber-500 text-[#0B0D11]'
                      : 'bg-[#161A23] text-slate-300 hover:text-white'
                  }`}
                >
                  {cat === 'All' ? 'All' : cat.split(' & ')[0]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredEffects.map((fx) => {
                const isActive = activeEffectTypes.includes(fx.type);
                return (
                  <button
                    key={fx.type}
                    type="button"
                    onClick={() => onToggleEffect(fx.type)}
                    title={fx.description}
                    className={`p-2 rounded-md border text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/12'
                        : 'border-white/8 bg-[#161A23] hover:border-white/25'
                    }`}
                  >
                    <div
                      className="h-9 rounded mb-1.5 border border-white/10 flex items-center justify-end p-1.5"
                      style={{ background: fx.swatch }}
                    >
                      {isActive && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-[#0B0D11] flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-100 block truncate">
                      {fx.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {fx.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'transitions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-200">Transitions</h2>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {filteredTransitions.length} free
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              {selectedClipSupportsTransition
                ? 'Click any transition to apply it to the selected Main Video clip.'
                : 'Click any transition to apply it to the active Main Video clip.'}
            </p>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={transitionSearch}
                onChange={(e) => setTransitionSearch(e.target.value)}
                placeholder="Search Spin Zoom, Portal, Galaxy, Quantum, Nova..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {TRANSITION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTransitionCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    transitionCategory === cat
                      ? 'bg-amber-500 text-[#0B0D11]'
                      : 'bg-[#161A23] text-slate-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {filteredTransitions.map((tr) => {
                const isActive = activeTransitionType === tr.type;
                return (
                  <button
                    key={tr.type}
                    type="button"
                    onClick={() => onApplyTransition(tr.type)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/12'
                        : 'border-white/8 bg-[#161A23] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {tr.label}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {isActive ? (
                          <span className="text-amber-400 font-semibold">Active</span>
                        ) : (
                          tr.category
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{tr.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400">
              Click a title preset to insert an editable text layer at the playhead.
            </p>
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onAddTextClip(preset)}
                className="w-full text-left p-3 rounded-md bg-[#161A23] hover:bg-[#1D222E] border border-white/8 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">{preset.label}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                </div>
                <p
                  className="text-sm truncate"
                  style={{
                    fontFamily: preset.style.fontFamily,
                    color: preset.style.color,
                  }}
                >
                  {preset.style.content}
                </p>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-2.5 rounded-md bg-[#161A23] hover:bg-[#1D222E] border border-white/10 text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Import Audio</span>
              </button>
              <button
                type="button"
                onClick={handleToggleVoiceRecord}
                className={`py-2 px-2.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  isRecordingVoice
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-[#161A23] hover:bg-[#1D222E] border-white/10 text-slate-200'
                }`}
              >
                {isRecordingVoice ? (
                  <>
                    <Square className="w-3 h-3 fill-current shrink-0" />
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Record Voice</span>
                  </>
                )}
              </button>
            </div>

            {voiceError && <p className="text-[11px] text-rose-400">{voiceError}</p>}

            <div className="space-y-2 pt-1 border-t border-white/8">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={audioSearch}
                  onChange={(e) => setAudioSearch(e.target.value)}
                  placeholder="Search music, SFX, mood..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGenre(g)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selectedGenre === g
                        ? 'bg-amber-500 text-[#0B0D11]'
                        : 'bg-[#161A23] text-slate-300 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <label htmlFor="audio-mood-select" className="text-[11px] text-slate-400 shrink-0">
                  Mood
                </label>
                <select
                  id="audio-mood-select"
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value as 'All' | AudioMood)}
                  className="flex-1 px-2 py-1 rounded bg-[#0B0D11] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {MOODS.map((m) => (
                    <option key={m} value={m}>
                      {m === 'All' ? 'All Moods' : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-300">Royalty-Free Library</h2>
                <span className="text-[11px] text-slate-500 font-mono-tabular">
                  {audioAssets.length} tracks
                </span>
              </div>

              {audioAssets.length === 0 ? (
                <div className="p-4 rounded-md bg-[#161A23] border border-white/8 text-center">
                  <p className="text-xs text-slate-400">No audio tracks match this filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioSearch('');
                      setSelectedGenre('All');
                      setSelectedMood('All');
                    }}
                    className="mt-2 text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                audioAssets.map((asset) => {
                  const isPreviewing = previewingAssetId === asset.id;
                  return (
                    <div
                      key={asset.id}
                      className="p-2.5 rounded-md bg-[#161A23] border border-white/8 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAudition(asset.id)}
                          title={isPreviewing ? 'Stop Preview' : 'Preview Track'}
                          className={`w-7 h-7 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isPreviewing
                              ? 'bg-sky-500 text-[#0B0D11]'
                              : 'bg-[#0B0D11] text-slate-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {isPreviewing ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {asset.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                            <span>{asset.genre || 'Audio'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{asset.mood || 'Neutral'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {formatTimecode(asset.duration)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onAddMediaClip(asset, 'audio')}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-[11px] font-semibold cursor-pointer shrink-0"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="h-4 flex items-end gap-[2px] overflow-hidden opacity-75">
                        {(asset.waveform || []).slice(0, 44).map((peak, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-t-[1px] ${
                              isPreviewing ? 'bg-amber-400' : 'bg-sky-400/70'
                            }`}
                            style={{ height: `${Math.max(12, Math.round(peak * 100))}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              {hasSelectedClip
                ? 'Apply a one-click color grade to the selected visual clip.'
                : 'Select a video or image clip on the timeline to apply color presets.'}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {FILTER_PRESETS.map((preset) => {
                const isActive = hasSelectedClip && activeFilterId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!hasSelectedClip}
                    onClick={() => onApplyFilter(preset.id)}
                    className={`p-2 rounded-md border text-left transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-white/8 bg-[#161A23] hover:border-white/25'
                    }`}
                  >
                    <div
                      className="h-10 rounded mb-1.5 border border-white/10"
                      style={{ background: preset.swatch }}
                    />
                    <span className="text-xs font-medium text-slate-200 block truncate">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'stickers' && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400">
              Add crisp vector overlays and frame indicators directly to your Overlay track.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STICKER_PRESETS.map((st) => (
                <button
                  key={st.shape}
                  type="button"
                  onClick={() => onAddStickerClip(st)}
                  className="p-3 rounded-md bg-[#161A23] hover:bg-[#1D222E] border border-white/8 hover:border-amber-500/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: st.primaryColor }} />
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-200 block truncate">
                    {st.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
