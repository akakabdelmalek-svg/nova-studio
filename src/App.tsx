import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExportModal } from './components/ExportModal';
import { HomeView } from './components/HomeView';
import { InspectorPanel } from './components/InspectorPanel';
import { MediaDrawer } from './components/MediaDrawer';
import { ProgramMonitor } from './components/ProgramMonitor';
import { ProjectsModal } from './components/ProjectsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { OfflineIndicator } from './components/PWAInstallButton';
import {
  AspectRatio,
  ExportedVideoRecord,
  FilterPresetId,
  MediaAsset,
  ProjectState,
  StickerShape,
  TextStyle,
  TimelineClip,
  TrackType,
  TransitionType,
  VideoEffectType,
} from './types/studio';
import {
  runAIBackgroundRemoval,
  runAIObjectTracking,
  runAISubtitlesFromClip,
} from './utils/aiTools';
import { audioEngine } from './utils/audioEngine';
import { createMediaCache } from './utils/canvasRenderer';
import {
  FILTER_PRESETS,
  createDefaultChromaKey,
  createDefaultColor,
  createDefaultTransform,
  uid,
} from './utils/defaults';
import { getBuiltInAssets, loadLocalMediaFile } from './utils/mediaLoader';
import {
  createBlankProject,
  createStarterProject,
  deleteExportedVideoFromDB,
  deleteProjectFromDB,
  listExportedVideosFromDB,
  listProjectsFromDB,
  loadAllMediaBlobsFromDB,
  saveExportedVideoToDB,
  saveMediaBlobToDB,
  saveProjectToDB,
} from './utils/storage';

export default function App() {
  const [activeView, setActiveView] = useState<'home' | 'editor'>('home');
  const [assets, setAssets] = useState<MediaAsset[]>(() => getBuiltInAssets());
  const [project, setProject] = useState<ProjectState>(() => createStarterProject());
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>([]);
  const [exportedVideos, setExportedVideos] = useState<ExportedVideoRecord[]>([]);
  const [undoStack, setUndoStack] = useState<ProjectState[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectState[]>([]);

  const [playheadTime, setPlayheadTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [masterMuted, setMasterMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip_v1_tokyo');
  const [zoomPxPerSec, setZoomPxPerSec] = useState(64);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [saveLabel, setSaveLabel] = useState('Save');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAutoStart, setExportAutoStart] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const [aiBusyTask, setAiBusyTask] = useState<string | null>(null);
  const [aiStatusMessage, setAiStatusMessage] = useState<{
    type: 'info' | 'error';
    text: string;
  } | null>(null);
  const [pickingTrackClipId, setPickingTrackClipId] = useState<string | null>(null);

  const mediaCache = useMemo(() => createMediaCache(), []);
  const assetsMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const a of assets) map.set(a.id, a);
    return map;
  }, [assets]);

  const totalDuration = useMemo(() => {
    if (project.clips.length === 0) return 0;
    return Math.max(
      ...project.clips.map((c) => c.startTime + c.duration)
    );
  }, [project.clips]);

  const selectedClip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId) || null,
    [project.clips, selectedClipId]
  );

  const isMainTrackClip = useMemo(() => {
    if (!selectedClip) return false;
    const t = project.tracks.find((tr) => tr.id === selectedClip.trackId);
    return t?.type === 'video';
  }, [project.tracks, selectedClip]);

  // Hydrate saved projects and uploaded local media blobs from IndexedDB
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [blobs, projs, exportsList] = await Promise.all([
          loadAllMediaBlobsFromDB(),
          listProjectsFromDB(),
          listExportedVideosFromDB(),
        ]);
        if (!active) return;

        if (exportsList.length > 0) {
          setExportedVideos(exportsList);
        }

        if (blobs.length > 0) {
          const restored: MediaAsset[] = [];
          for (const item of blobs) {
            const file = new File([item.blob], item.name, { type: item.type });
            const loaded = await loadLocalMediaFile(file, item.id);
            restored.push(loaded.asset);
          }
          if (active && restored.length > 0) {
            setAssets((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              return [...restored.filter((r) => !ids.has(r.id)), ...prev];
            });
          }
        }

        if (projs.length > 0) {
          setSavedProjects(projs);
          setProject(projs[0]);
          setSelectedClipId(projs[0].clips[0]?.id || null);
        } else {
          const starter = createStarterProject();
          await saveProjectToDB(starter);
          if (active) setSavedProjects([starter]);
        }
      } catch {
        // IndexedDB optional in restricted contexts
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const commitProjectChange = useCallback(
    (updater: (prev: ProjectState) => ProjectState, pushHistory = true) => {
      setProject((prev) => {
        if (pushHistory) {
          setUndoStack((st) => [...st.slice(-39), prev]);
          setRedoStack([]);
        }
        return { ...updater(prev), updatedAt: Date.now() };
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previous = prevUndo[prevUndo.length - 1];
      setProject((curr) => {
        setRedoStack((r) => [...r, curr]);
        return previous;
      });
      return prevUndo.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      setProject((curr) => {
        setUndoStack((u) => [...u, curr]);
        return next;
      });
      return prevRedo.slice(0, -1);
    });
  }, []);

  const handleSaveProject = useCallback(async () => {
    try {
      await saveProjectToDB(project);
      const list = await listProjectsFromDB();
      setSavedProjects(list);
      setSaveLabel('Saved');
      setTimeout(() => setSaveLabel('Save'), 1600);
    } catch {
      setSaveLabel('Save');
    }
  }, [project]);

  // Playback Loop
  const playStartRef = useRef<{ wallMs: number; timelineSec: number }>({
    wallMs: 0,
    timelineSec: 0,
  });

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    audioEngine.stopAll();
  }, []);

  const startPlayback = useCallback(
    (fromTime?: number) => {
      const startT = fromTime !== undefined ? fromTime : playheadTime >= totalDuration ? 0 : playheadTime;
      if (totalDuration <= 0.01) return;
      setPlayheadTime(startT);
      playStartRef.current = { wallMs: performance.now(), timelineSec: startT };
      audioEngine.startPlaybackAt(
        startT,
        project.clips,
        project.tracks,
        masterMuted,
        masterVolume
      );
      setIsPlaying(true);
    },
    [playheadTime, totalDuration, project.clips, project.tracks, masterMuted, masterVolume]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;

    const tick = () => {
      const elapsed = (performance.now() - playStartRef.current.wallMs) / 1000;
      const nextT = playStartRef.current.timelineSec + elapsed;
      if (nextT >= totalDuration) {
        if (isLooping && totalDuration > 0.1) {
          playStartRef.current = { wallMs: performance.now(), timelineSec: 0 };
          setPlayheadTime(0);
          audioEngine.startPlaybackAt(
            0,
            project.clips,
            project.tracks,
            masterMuted,
            masterVolume
          );
        } else {
          setPlayheadTime(totalDuration);
          stopPlayback();
          return;
        }
      } else {
        setPlayheadTime(nextT);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration, isLooping, project.clips, project.tracks, masterMuted, masterVolume, stopPlayback]);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(Math.max(totalDuration, 24), time));
      setPlayheadTime(clamped);
      if (isPlaying) {
        playStartRef.current = { wallMs: performance.now(), timelineSec: clamped };
        audioEngine.startPlaybackAt(
          clamped,
          project.clips,
          project.tracks,
          masterMuted,
          masterVolume
        );
      }
    },
    [totalDuration, isPlaying, project.clips, project.tracks, masterMuted, masterVolume]
  );

  const handleStepFrame = useCallback(
    (delta: number) => {
      stopPlayback();
      const step = 1 / (project.fps || 30);
      setPlayheadTime((t) => Math.max(0, Math.min(totalDuration, t + delta * step)));
    },
    [stopPlayback, project.fps, totalDuration]
  );

  // Import local files
  const handleImportFiles = useCallback(async (files: FileList) => {
    const imported: MediaAsset[] = [];
    for (const file of Array.from(files)) {
      try {
        const { asset, blob } = await loadLocalMediaFile(file);
        imported.push(asset);
        await saveMediaBlobToDB({
          id: asset.id,
          name: file.name,
          type: file.type,
          blob,
        });
      } catch {
        // skip unreadable file
      }
    }
    if (imported.length > 0) {
      setAssets((prev) => [...imported, ...prev]);
    }
  }, []);

  const handleImportRecordedAudio = useCallback(
    async (blob: Blob, name: string) => {
      const file = new File([blob], `${name}.webm`, { type: blob.type || 'audio/webm' });
      const { asset } = await loadLocalMediaFile(file);
      asset.name = name;
      await saveMediaBlobToDB({
        id: asset.id,
        name: file.name,
        type: file.type,
        blob,
      });
      setAssets((prev) => [asset, ...prev]);

      // Automatically insert at playhead onto Audio track
      const audioTrack = project.tracks.find((t) => t.type === 'audio');
      if (audioTrack) {
        const newClip: TimelineClip = {
          id: uid('clip'),
          trackId: audioTrack.id,
          assetId: asset.id,
          kind: 'audio',
          name: asset.name,
          startTime: Number(playheadTime.toFixed(2)),
          duration: Math.max(0.5, Number(asset.duration.toFixed(2))),
          sourceOffset: 0,
          sourceDuration: asset.duration,
          speed: 1,
          volume: 100,
          fadeIn: 0.1,
          fadeOut: 0.2,
          muted: false,
          transform: createDefaultTransform(),
          color: createDefaultColor(),
          chromaKey: createDefaultChromaKey(),
          inAnimation: 'none',
          outAnimation: 'none',
          inAnimDuration: 0,
          outAnimDuration: 0,
          transitionIn: { type: 'none', duration: 0.5 },
        };
        commitProjectChange((prev) => ({ ...prev, clips: [...prev.clips, newClip] }));
        setSelectedClipId(newClip.id);
      }
    },
    [project.tracks, playheadTime, commitProjectChange]
  );

  // Add Media Clip
  const handleAddMediaClip = useCallback(
    (
      asset: MediaAsset,
      targetTrackType?: 'video' | 'overlay' | 'audio',
      explicitTrackId?: string,
      explicitTime?: number
    ) => {
      const resolvedType: TrackType =
        targetTrackType || (asset.kind === 'audio' ? 'audio' : 'video');
      const track = explicitTrackId
        ? project.tracks.find((t) => t.id === explicitTrackId)
        : project.tracks.find((t) => t.type === resolvedType);

      if (!track) return;

      let insertTime = explicitTime !== undefined ? Math.max(0, explicitTime) : playheadTime;
      if (explicitTime === undefined && resolvedType === 'video') {
        // Append cleanly after last main track clip
        const mainClips = project.clips.filter((c) => c.trackId === track.id);
        insertTime = mainClips.reduce((acc, c) => Math.max(acc, c.startTime + c.duration), 0);
      }

      const newClip: TimelineClip = {
        id: uid('clip'),
        trackId: track.id,
        assetId: asset.id,
        kind: asset.kind,
        name: asset.name,
        startTime: Number(insertTime.toFixed(2)),
        duration: Math.max(0.5, Number(asset.duration.toFixed(2))),
        sourceOffset: 0,
        sourceDuration: asset.duration,
        speed: 1,
        volume: 100,
        fadeIn: asset.kind === 'audio' ? 0.4 : 0,
        fadeOut: asset.kind === 'audio' ? 0.6 : 0,
        muted: false,
        transform:
          resolvedType === 'overlay'
            ? { ...createDefaultTransform(), scale: 0.72, x: 0.35, y: 0.25 }
            : createDefaultTransform(),
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        inAnimation: resolvedType === 'overlay' ? 'fade' : 'none',
        outAnimation: resolvedType === 'overlay' ? 'fade' : 'none',
        inAnimDuration: 0.35,
        outAnimDuration: 0.35,
        transitionIn: { type: 'none', duration: 0.6 },
      };

      commitProjectChange((prev) => ({
        ...prev,
        clips: [...prev.clips, newClip],
      }));
      setSelectedClipId(newClip.id);
    },
    [project.tracks, project.clips, playheadTime, commitProjectChange]
  );

  const handleAddTextClip = useCallback(
    (preset: { label: string; style: TextStyle; x?: number; y?: number }) => {
      const track = project.tracks.find((t) => t.type === 'text');
      if (!track) return;
      const newClip: TimelineClip = {
        id: uid('clip'),
        trackId: track.id,
        kind: 'text',
        name: preset.label,
        startTime: Number(playheadTime.toFixed(2)),
        duration: 4,
        sourceOffset: 0,
        sourceDuration: 10,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: {
          ...createDefaultTransform(),
          x: preset.x ?? 0,
          y: preset.y ?? 0,
        },
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        text: { ...preset.style },
        inAnimation: 'fade',
        outAnimation: 'fade',
        inAnimDuration: 0.4,
        outAnimDuration: 0.4,
        transitionIn: { type: 'none', duration: 0.5 },
      };

      commitProjectChange((prev) => ({ ...prev, clips: [...prev.clips, newClip] }));
      setSelectedClipId(newClip.id);
    },
    [project.tracks, playheadTime, commitProjectChange]
  );

  const handleAddStickerClip = useCallback(
    (preset: {
      shape: StickerShape;
      label: string;
      primaryColor: string;
      secondaryColor: string;
      textLabel?: string;
    }) => {
      const track = project.tracks.find((t) => t.type === 'overlay');
      if (!track) return;
      const newClip: TimelineClip = {
        id: uid('clip'),
        trackId: track.id,
        kind: 'sticker',
        name: preset.label,
        startTime: Number(playheadTime.toFixed(2)),
        duration: 4,
        sourceOffset: 0,
        sourceDuration: 10,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: createDefaultTransform(),
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        sticker: {
          shape: preset.shape,
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
          label: preset.textLabel,
        },
        inAnimation: 'pop',
        outAnimation: 'fade',
        inAnimDuration: 0.35,
        outAnimDuration: 0.35,
        transitionIn: { type: 'none', duration: 0.5 },
      };

      commitProjectChange((prev) => ({ ...prev, clips: [...prev.clips, newClip] }));
      setSelectedClipId(newClip.id);
    },
    [project.tracks, playheadTime, commitProjectChange]
  );

  const handleUpdateClip = useCallback(
    (clipId: string, updater: (clip: TimelineClip) => TimelineClip, pushHistory = true) => {
      commitProjectChange(
        (prev) => ({
          ...prev,
          clips: prev.clips.map((c) => (c.id === clipId ? updater(c) : c)),
        }),
        pushHistory
      );
    },
    [commitProjectChange]
  );

  const handleSplitClip = useCallback(
    (targetId?: string) => {
      const clip =
        (targetId ? project.clips.find((c) => c.id === targetId) : selectedClip) ||
        project.clips.find(
          (c) => playheadTime > c.startTime + 0.2 && playheadTime < c.startTime + c.duration - 0.2
        );
      if (!clip) return;
      if (playheadTime <= clip.startTime + 0.2 || playheadTime >= clip.startTime + clip.duration - 0.2) {
        return;
      }

      const firstDur = Number((playheadTime - clip.startTime).toFixed(3));
      const secondDur = Number((clip.duration - firstDur).toFixed(3));

      const leftPart: TimelineClip = {
        ...clip,
        duration: firstDur,
      };
      const rightPart: TimelineClip = {
        ...clip,
        id: uid('clip'),
        startTime: Number(playheadTime.toFixed(3)),
        duration: secondDur,
        sourceOffset: Number((clip.sourceOffset + firstDur * clip.speed).toFixed(3)),
        transitionIn: { type: 'none', duration: 0.5 },
      };

      commitProjectChange((prev) => ({
        ...prev,
        clips: prev.clips.flatMap((c) => (c.id === clip.id ? [leftPart, rightPart] : [c])),
      }));
      setSelectedClipId(rightPart.id);
    },
    [project.clips, selectedClip, playheadTime, commitProjectChange]
  );

  const handleDuplicateClip = useCallback(
    (targetId?: string) => {
      const id = targetId || selectedClipId;
      const clip = project.clips.find((c) => c.id === id);
      if (!clip) return;
      const copy: TimelineClip = {
        ...clip,
        id: uid('clip'),
        name: `${clip.name} Copy`,
        startTime: Number((clip.startTime + clip.duration).toFixed(2)),
        transform: { ...clip.transform },
        color: { ...clip.color },
        chromaKey: { ...clip.chromaKey },
        text: clip.text ? { ...clip.text } : undefined,
        sticker: clip.sticker ? { ...clip.sticker } : undefined,
        aiMask: clip.aiMask ? { ...clip.aiMask } : undefined,
        motionTrack: clip.motionTrack ? { ...clip.motionTrack } : undefined,
        transitionIn: { type: 'none', duration: 0.5 },
      };
      commitProjectChange((prev) => ({ ...prev, clips: [...prev.clips, copy] }));
      setSelectedClipId(copy.id);
    },
    [selectedClipId, project.clips, commitProjectChange]
  );

  const handleDeleteClip = useCallback(
    (targetId?: string) => {
      const id = targetId || selectedClipId;
      if (!id) return;
      commitProjectChange((prev) => ({
        ...prev,
        clips: prev.clips.filter((c) => c.id !== id),
      }));
      if (selectedClipId === id) setSelectedClipId(null);
    },
    [selectedClipId, commitProjectChange]
  );

  const handleAddTrack = useCallback(
    (type: TrackType) => {
      const count = project.tracks.filter((t) => t.type === type).length + 1;
      const prefix = type === 'overlay' ? 'V' : type === 'text' ? 'T' : 'A';
      const label = type === 'overlay' ? 'Overlay' : type === 'text' ? 'Text' : 'Audio';
      const newTrack = {
        id: uid('track'),
        name: `${prefix}${count + (type === 'overlay' ? 1 : 0)} · ${label}`,
        type,
        muted: false,
        hidden: false,
        locked: false,
      };
      commitProjectChange((prev) => {
        if (type === 'audio') {
          return { ...prev, tracks: [...prev.tracks, newTrack] };
        }
        return { ...prev, tracks: [newTrack, ...prev.tracks] };
      });
    },
    [project.tracks, commitProjectChange]
  );

  const handleToggleTrackProp = useCallback(
    (trackId: string, prop: 'muted' | 'hidden' | 'locked') => {
      commitProjectChange((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, [prop]: !t[prop] } : t)),
      }));
    },
    [commitProjectChange]
  );

  const handleApplyFilter = useCallback(
    (presetId: FilterPresetId) => {
      if (!selectedClip) return;
      const preset = FILTER_PRESETS.find((f) => f.id === presetId);
      if (!preset) return;
      handleUpdateClip(selectedClip.id, (c) => ({
        ...c,
        color: { preset: preset.id, ...preset.values },
      }));
    },
    [selectedClip, handleUpdateClip]
  );

  const handleApplyTransition = useCallback(
    (type: TransitionType) => {
      const mainTrackIds = new Set(
        project.tracks.filter((t) => t.type === 'video').map((t) => t.id)
      );
      let target = selectedClip && isMainTrackClip ? selectedClip : null;
      if (!target) {
        target =
          project.clips.find(
            (c) =>
              mainTrackIds.has(c.trackId) &&
              playheadTime >= c.startTime &&
              playheadTime < c.startTime + c.duration
          ) ||
          project.clips.find((c) => mainTrackIds.has(c.trackId)) ||
          null;
      }
      if (!target) return;
      setSelectedClipId(target.id);
      handleUpdateClip(target.id, (c) => ({
        ...c,
        transitionIn: { ...c.transitionIn, type },
      }));
    },
    [selectedClip, isMainTrackClip, project.tracks, project.clips, playheadTime, handleUpdateClip]
  );

  const handleToggleEffect = useCallback(
    (effectType: VideoEffectType) => {
      let target = selectedClip && selectedClip.kind !== 'audio' ? selectedClip : null;
      if (!target) {
        target =
          project.clips.find(
            (c) =>
              c.kind !== 'audio' &&
              playheadTime >= c.startTime &&
              playheadTime < c.startTime + c.duration
          ) ||
          project.clips.find((c) => c.kind !== 'audio') ||
          null;
      }
      if (!target) return;
      setSelectedClipId(target.id);
      handleUpdateClip(target.id, (c) => {
        const list = c.effects || [];
        const existing = list.find((fx) => fx.type === effectType);
        if (existing) {
          return {
            ...c,
            effects: list.filter((fx) => fx.type !== effectType),
          };
        }
        return {
          ...c,
          effects: [
            ...list,
            {
              id: uid('fx'),
              type: effectType,
              intensity: 75,
              speed: 1,
              enabled: true,
            },
          ],
        };
      });
    },
    [selectedClip, project.clips, playheadTime, handleUpdateClip]
  );

  // AI Feature 1: Automatic Background Removal
  const handleRunBackgroundRemoval = useCallback(
    async (clipId: string) => {
      const clip = project.clips.find((c) => c.id === clipId);
      if (!clip || !clip.assetId) return;
      const asset = assetsMap.get(clip.assetId);
      if (!asset) return;

      stopPlayback();
      setAiBusyTask('bg-remove');
      setAiStatusMessage(null);

      try {
        const localTime = Math.max(0, Math.min(clip.duration, playheadTime - clip.startTime));
        const mask = await runAIBackgroundRemoval(clip, asset, mediaCache, localTime);
        handleUpdateClip(clip.id, (c) => ({ ...c, aiMask: mask }));
        setAiStatusMessage({
          type: 'info',
          text: `Isolated "${mask.subjectLabel}". Adjust feather or expansion below.`,
        });
      } catch (err) {
        setAiStatusMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Background removal failed.',
        });
      } finally {
        setAiBusyTask(null);
      }
    },
    [project.clips, assetsMap, playheadTime, mediaCache, stopPlayback, handleUpdateClip]
  );

  // AI Feature 2: AI Subtitles from Audio
  const handleRunGenerateSubtitles = useCallback(
    async (clipId: string) => {
      const clip = project.clips.find((c) => c.id === clipId);
      if (!clip || !clip.assetId) return;
      const asset = assetsMap.get(clip.assetId);
      if (!asset) return;

      stopPlayback();
      setAiBusyTask('subtitles');
      setAiStatusMessage(null);

      try {
        const { cues } = await runAISubtitlesFromClip(clip, asset);
        if (cues.length === 0) {
          setAiStatusMessage({
            type: 'info',
            text: 'No spoken dialogue detected in this clip. Try a voiceover or video with speech.',
          });
          return;
        }

        const textTrack = project.tracks.find((t) => t.type === 'text');
        if (!textTrack) return;

        const newClips: TimelineClip[] = cues.map((cue, idx) => ({
          id: uid('sub'),
          trackId: textTrack.id,
          kind: 'text',
          name: `Sub ${idx + 1}`,
          startTime: Number((clip.startTime + Math.max(0, cue.startSec)).toFixed(2)),
          duration: Math.max(0.4, Number((cue.endSec - cue.startSec).toFixed(2))),
          sourceOffset: 0,
          sourceDuration: 10,
          speed: 1,
          volume: 100,
          fadeIn: 0,
          fadeOut: 0,
          muted: false,
          transform: { ...createDefaultTransform(), x: 0, y: 0.72 },
          color: createDefaultColor(),
          chromaKey: createDefaultChromaKey(),
          text: {
            content: cue.text,
            fontFamily: 'Plus Jakarta Sans',
            fontSize: 34,
            fontWeight: 600,
            color: '#ffffff',
            bgColor: '#0b0d11',
            bgOpacity: 0.78,
            strokeColor: '#000000',
            strokeWidth: 2,
            align: 'center',
            letterSpacing: 0,
          },
          inAnimation: 'fade',
          outAnimation: 'fade',
          inAnimDuration: 0.15,
          outAnimDuration: 0.15,
          transitionIn: { type: 'none', duration: 0.5 },
        }));

        commitProjectChange((prev) => ({
          ...prev,
          clips: [...prev.clips, ...newClips],
        }));

        setAiStatusMessage({
          type: 'info',
          text: `Generated ${newClips.length} timed subtitle clips on ${textTrack.name}.`,
        });
      } catch (err) {
        setAiStatusMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Subtitle generation failed.',
        });
      } finally {
        setAiBusyTask(null);
      }
    },
    [project.clips, project.tracks, assetsMap, stopPlayback, commitProjectChange]
  );

  // AI Feature 3: Object Tracking
  const handleStartPickTrackTarget = useCallback(
    (clipId: string) => {
      stopPlayback();
      const clip = project.clips.find((c) => c.id === clipId);
      if (clip) {
        setPlayheadTime(clip.startTime);
      }
      setPickingTrackClipId((prev) => (prev === clipId ? null : clipId));
      setAiStatusMessage({
        type: 'info',
        text: 'Click directly on the object in the video preview to track it.',
      });
    },
    [project.clips, stopPlayback]
  );

  const handlePickTrackTarget = useCallback(
    async (normX: number, normY: number) => {
      const targetClipId = pickingTrackClipId;
      setPickingTrackClipId(null);
      if (!targetClipId) return;

      const clip = project.clips.find((c) => c.id === targetClipId);
      if (!clip) return;

      setAiBusyTask('track');
      setAiStatusMessage(null);

      try {
        const res = await runAIObjectTracking(
          project,
          assetsMap,
          mediaCache,
          clip,
          normX,
          normY,
          clip.name
        );

        handleUpdateClip(clip.id, (c) => ({
          ...c,
          motionTrack: {
            enabled: true,
            targetLabel: res.targetLabel,
            keyframes: res.keyframes,
          },
        }));

        setAiStatusMessage({
          type: 'info',
          text: `Tracked "${res.targetLabel}" across ${res.keyframes.length} keyframes.`,
        });
      } catch (err) {
        setAiStatusMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Object tracking failed.',
        });
      } finally {
        setAiBusyTask(null);
      }
    },
    [pickingTrackClipId, project, assetsMap, mediaCache, handleUpdateClip]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleSplitClip();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleSeek(totalDuration);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    togglePlay,
    handleSplitClip,
    handleDeleteClip,
    selectedClipId,
    handleStepFrame,
    handleSeek,
    totalDuration,
    handleUndo,
    handleRedo,
  ]);

  const handleCreateNewVideo = useCallback(
    async (ratio: AspectRatio, initialFiles?: FileList) => {
      stopPlayback();
      const blank = createBlankProject(`Video ${savedProjects.length + 1}`, ratio);

      if (initialFiles && initialFiles.length > 0) {
        const imported: MediaAsset[] = [];
        let videoCursor = 0;
        let audioCursor = 0;
        const mainTrack = blank.tracks.find((t) => t.type === 'video');
        const audioTrack = blank.tracks.find((t) => t.type === 'audio');

        for (const file of Array.from(initialFiles)) {
          try {
            const { asset, blob } = await loadLocalMediaFile(file);
            imported.push(asset);
            await saveMediaBlobToDB({
              id: asset.id,
              name: file.name,
              type: file.type,
              blob,
            });

            if (asset.kind === 'audio' && audioTrack) {
              blank.clips.push({
                id: uid('clip'),
                trackId: audioTrack.id,
                assetId: asset.id,
                kind: 'audio',
                name: asset.name,
                startTime: Number(audioCursor.toFixed(2)),
                duration: Math.max(0.5, Number(asset.duration.toFixed(2))),
                sourceOffset: 0,
                sourceDuration: asset.duration,
                speed: 1,
                volume: 100,
                fadeIn: 0.2,
                fadeOut: 0.4,
                muted: false,
                transform: createDefaultTransform(),
                color: createDefaultColor(),
                chromaKey: createDefaultChromaKey(),
                inAnimation: 'none',
                outAnimation: 'none',
                inAnimDuration: 0,
                outAnimDuration: 0,
                transitionIn: { type: 'none', duration: 0.5 },
              });
              audioCursor += asset.duration;
            } else if (mainTrack) {
              blank.clips.push({
                id: uid('clip'),
                trackId: mainTrack.id,
                assetId: asset.id,
                kind: asset.kind,
                name: asset.name,
                startTime: Number(videoCursor.toFixed(2)),
                duration: Math.max(0.5, Number(asset.duration.toFixed(2))),
                sourceOffset: 0,
                sourceDuration: asset.duration,
                speed: 1,
                volume: 100,
                fadeIn: 0,
                fadeOut: 0,
                muted: false,
                transform: createDefaultTransform(),
                color: createDefaultColor(),
                chromaKey: createDefaultChromaKey(),
                inAnimation: 'none',
                outAnimation: 'none',
                inAnimDuration: 0.35,
                outAnimDuration: 0.35,
                transitionIn: { type: 'none', duration: 0.6 },
              });
              videoCursor += asset.duration;
            }
          } catch {
            // ignore unreadable file
          }
        }
        if (imported.length > 0) {
          setAssets((prev) => [...imported, ...prev]);
        }
      }

      await saveProjectToDB(blank).catch(() => {});
      const list = await listProjectsFromDB().catch(() => [blank]);
      setSavedProjects(list);
      setProject(blank);
      setPlayheadTime(0);
      setSelectedClipId(blank.clips[0]?.id || null);
      setUndoStack([]);
      setRedoStack([]);
      setActiveView('editor');
    },
    [savedProjects.length, stopPlayback]
  );

  const handleOpenProjectInEditor = useCallback(
    (proj: ProjectState) => {
      stopPlayback();
      setProject(proj);
      setPlayheadTime(0);
      setSelectedClipId(proj.clips[0]?.id || null);
      setUndoStack([]);
      setRedoStack([]);
      setActiveView('editor');
    },
    [stopPlayback]
  );

  if (activeView === 'home') {
    return (
      <>
        <HomeView
          projects={savedProjects.length > 0 ? savedProjects : [project]}
          currentProject={project}
          exportedVideos={exportedVideos}
          assetsMap={assetsMap}
          onCreateNewVideo={handleCreateNewVideo}
          onOpenProject={handleOpenProjectInEditor}
          onDeleteProject={async (id) => {
            await deleteProjectFromDB(id).catch(() => {});
            const list = await listProjectsFromDB().catch(() => []);
            setSavedProjects(list);
            if (project.id === id && list[0]) {
              setProject(list[0]);
            }
          }}
          onDeleteExportedVideo={async (id) => {
            await deleteExportedVideoFromDB(id).catch(() => {});
            setExportedVideos((prev) => prev.filter((v) => v.id !== id));
          }}
          onGoToEditorToExport={() => {
            setActiveView('editor');
            setShowExportModal(true);
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0D11] text-[#F1F3F7]">
      <TopBar
        aspectRatio={project.aspectRatio}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        saveLabel={saveLabel}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSaveProject={handleSaveProject}
        onOpenHome={() => {
          stopPlayback();
          saveProjectToDB(project)
            .then(() => listProjectsFromDB())
            .then((list) => setSavedProjects(list))
            .catch(() => {});
          setActiveView('home');
        }}
        onOpenProjects={async () => {
          try {
            const list = await listProjectsFromDB();
            setSavedProjects(list);
          } catch {
            // ignore
          }
          setShowProjectsModal(true);
        }}
        onChangeAspectRatio={(ratio: AspectRatio) =>
          commitProjectChange((p) => ({ ...p, aspectRatio: ratio }))
        }
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onQuickSaveVideo={() => {
          stopPlayback();
          setExportAutoStart(true);
          setShowExportModal(true);
        }}
        onOpenExport={() => {
          stopPlayback();
          setExportAutoStart(false);
          setShowExportModal(true);
        }}
      />

      {/* Upper 3-Column Studio Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        <MediaDrawer
          assets={assets}
          hasSelectedClip={Boolean(
            selectedClip && (selectedClip.kind === 'image' || selectedClip.kind === 'video')
          )}
          selectedClipSupportsTransition={isMainTrackClip}
          activeFilterId={selectedClip?.color.preset || 'none'}
          activeTransitionType={selectedClip?.transitionIn.type || 'none'}
          activeEffectTypes={(selectedClip?.effects || [])
            .filter((fx) => fx.enabled)
            .map((fx) => fx.type)}
          onImportFiles={handleImportFiles}
          onImportRecordedAudio={handleImportRecordedAudio}
          onAddMediaClip={(asset, type) => handleAddMediaClip(asset, type)}
          onAddTextClip={handleAddTextClip}
          onAddStickerClip={handleAddStickerClip}
          onApplyFilter={handleApplyFilter}
          onToggleEffect={handleToggleEffect}
          onApplyTransition={handleApplyTransition}
        />

        <ProgramMonitor
          project={project}
          assetsMap={assetsMap}
          mediaCache={mediaCache}
          playheadTime={playheadTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          isLooping={isLooping}
          masterMuted={masterMuted}
          masterVolume={masterVolume}
          selectedClip={selectedClip}
          isPickingTrackTarget={Boolean(pickingTrackClipId)}
          onCancelPickTrackTarget={() => setPickingTrackClipId(null)}
          onPickTrackTarget={handlePickTrackTarget}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onStepFrame={handleStepFrame}
          onToggleLoop={() => setIsLooping((v) => !v)}
          onToggleMute={() => setMasterMuted((v) => !v)}
          onChangeVolume={(v) => {
            setMasterVolume(v);
            if (v > 0 && masterMuted) setMasterMuted(false);
          }}
          onUpdateClipTransform={(clipId, x, y) =>
            handleUpdateClip(
              clipId,
              (c) => ({ ...c, transform: { ...c.transform, x, y } }),
              false
            )
          }
          onSelectClip={(id) => {
            setSelectedClipId(id);
            setAiStatusMessage(null);
          }}
        />

        <InspectorPanel
          project={project}
          selectedClip={selectedClip}
          isMainTrackClip={isMainTrackClip}
          aiBusyTask={aiBusyTask}
          aiStatusMessage={aiStatusMessage}
          isPickingTrackTarget={Boolean(pickingTrackClipId)}
          onUpdateProject={(patch) => commitProjectChange((p) => ({ ...p, ...patch }))}
          onUpdateClip={handleUpdateClip}
          onSplitClip={(id) => handleSplitClip(id)}
          onDuplicateClip={(id) => handleDuplicateClip(id)}
          onDeleteClip={(id) => handleDeleteClip(id)}
          onRunBackgroundRemoval={handleRunBackgroundRemoval}
          onRunGenerateSubtitles={handleRunGenerateSubtitles}
          onStartPickTrackTarget={handleStartPickTrackTarget}
        />
      </main>

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        project={project}
        assetsMap={assetsMap}
        playheadTime={playheadTime}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        zoomPxPerSec={zoomPxPerSec}
        snapEnabled={snapEnabled}
        onChangeZoom={setZoomPxPerSec}
        onToggleSnap={() => setSnapEnabled((v) => !v)}
        onSeek={handleSeek}
        onSelectClip={(id) => {
          setSelectedClipId(id);
          setAiStatusMessage(null);
        }}
        onSplitAtPlayhead={() => handleSplitClip()}
        onDuplicateSelected={() => handleDuplicateClip()}
        onDeleteSelected={() => handleDeleteClip()}
        onAddTrack={handleAddTrack}
        onToggleTrackProp={handleToggleTrackProp}
        onUpdateClip={handleUpdateClip}
        onDropAssetOnTrack={(assetId, trackId, time) => {
          const asset = assetsMap.get(assetId);
          const track = project.tracks.find((t) => t.id === trackId);
          if (!asset || !track) return;
          if (track.type === 'audio' && asset.kind !== 'audio') return;
          if (track.type !== 'audio' && asset.kind === 'audio') return;
          handleAddMediaClip(
            asset,
            track.type === 'overlay' ? 'overlay' : track.type === 'audio' ? 'audio' : 'video',
            trackId,
            time
          );
        }}
      />

      {showExportModal && (
        <ExportModal
          project={project}
          assetsMap={assetsMap}
          totalDuration={totalDuration}
          autoStart={exportAutoStart}
          onExportComplete={async (res, dims, duration) => {
            const firstVisual = project.clips.find(
              (c) => c.assetId && (c.kind === 'video' || c.kind === 'image')
            );
            const thumb = firstVisual?.assetId
              ? assetsMap.get(firstVisual.assetId)?.thumbnailUrl
              : undefined;
            const record: ExportedVideoRecord = {
              id: uid('export'),
              projectId: project.id,
              name: project.name || 'Nova Studio Video',
              createdAt: Date.now(),
              duration,
              width: dims.width,
              height: dims.height,
              extension: res.extension,
              mimeType: res.mimeType,
              sizeBytes: res.blob.size,
              blob: res.blob,
              thumbnailUrl: thumb,
            };
            await saveExportedVideoToDB(record).catch(() => {});
            setExportedVideos((prev) => [record, ...prev]);
          }}
          onGoToMyVideos={() => {
            setShowExportModal(false);
            setActiveView('home');
            setTimeout(() => {
              document.getElementById('my-videos')?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showProjectsModal && (
        <ProjectsModal
          projects={savedProjects}
          currentProjectId={project.id}
          onSelectProject={(p) => {
            stopPlayback();
            setProject(p);
            setPlayheadTime(0);
            setSelectedClipId(p.clips[0]?.id || null);
            setUndoStack([]);
            setRedoStack([]);
            setShowProjectsModal(false);
          }}
          onNewBlank={async () => {
            stopPlayback();
            const blank = createBlankProject(`Project ${savedProjects.length + 1}`);
            await saveProjectToDB(blank).catch(() => {});
            const list = await listProjectsFromDB().catch(() => [blank]);
            setSavedProjects(list);
            setProject(blank);
            setPlayheadTime(0);
            setSelectedClipId(null);
            setUndoStack([]);
            setRedoStack([]);
            setShowProjectsModal(false);
          }}
          onNewStarter={async () => {
            stopPlayback();
            const starter = { ...createStarterProject(), id: uid('proj'), name: 'Starter Reel Copy' };
            await saveProjectToDB(starter).catch(() => {});
            const list = await listProjectsFromDB().catch(() => [starter]);
            setSavedProjects(list);
            setProject(starter);
            setPlayheadTime(0);
            setSelectedClipId(starter.clips[0]?.id || null);
            setUndoStack([]);
            setRedoStack([]);
            setShowProjectsModal(false);
          }}
          onDeleteProject={async (id) => {
            await deleteProjectFromDB(id).catch(() => {});
            const list = await listProjectsFromDB().catch(() => []);
            setSavedProjects(list);
          }}
          onClose={() => setShowProjectsModal(false)}
        />
      )}

      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
      <OfflineIndicator />
    </div>
  );
}
