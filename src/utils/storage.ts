import { AspectRatio, CustomFontRecord, ExportedVideoRecord, ProjectState } from '../types/studio';
import {
  createDefaultChromaKey,
  createDefaultColor,
  createDefaultTransform,
  uid,
} from './defaults';

const DB_NAME = 'nova_studio_db';
const DB_VERSION = 3;
const STORE_PROJECTS = 'projects';
const STORE_BLOBS = 'mediaBlobs';
const STORE_EXPORTED_VIDEOS = 'exportedVideos';
const STORE_CUSTOM_FONTS = 'customFonts';

export interface StoredMediaBlob {
  id: string;
  name: string;
  type: string;
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_EXPORTED_VIDEOS)) {
        db.createObjectStore(STORE_EXPORTED_VIDEOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_FONTS)) {
        db.createObjectStore(STORE_CUSTOM_FONTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectToDB(project: ProjectState): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).put({ ...project, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listProjectsFromDB(): Promise<ProjectState[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).getAll();
    req.onsuccess = () => {
      const list = (req.result as ProjectState[]).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMediaBlobToDB(item: StoredMediaBlob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    tx.objectStore(STORE_BLOBS).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllMediaBlobsFromDB(): Promise<StoredMediaBlob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const req = tx.objectStore(STORE_BLOBS).getAll();
    req.onsuccess = () => resolve(req.result as StoredMediaBlob[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveExportedVideoToDB(video: ExportedVideoRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPORTED_VIDEOS, 'readwrite');
    tx.objectStore(STORE_EXPORTED_VIDEOS).put(video);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listExportedVideosFromDB(): Promise<ExportedVideoRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPORTED_VIDEOS, 'readonly');
    const req = tx.objectStore(STORE_EXPORTED_VIDEOS).getAll();
    req.onsuccess = () => {
      const list = (req.result as ExportedVideoRecord[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteExportedVideoFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPORTED_VIDEOS, 'readwrite');
    tx.objectStore(STORE_EXPORTED_VIDEOS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCustomFontToDB(font: CustomFontRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_FONTS, 'readwrite');
    tx.objectStore(STORE_CUSTOM_FONTS).put(font);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listCustomFontsFromDB(): Promise<CustomFontRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_FONTS, 'readonly');
    const req = tx.objectStore(STORE_CUSTOM_FONTS).getAll();
    req.onsuccess = () => {
      const list = (req.result as CustomFontRecord[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomFontFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_FONTS, 'readwrite');
    tx.objectStore(STORE_CUSTOM_FONTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createBlankProject(
  name = 'Untitled Sequence',
  aspectRatio: AspectRatio = '16:9'
): ProjectState {
  return {
    id: uid('proj'),
    name,
    updatedAt: Date.now(),
    aspectRatio,
    fps: 30,
    backgroundColor: '#090b0f',
    tracks: [
      { id: 'track_text_1', name: 'T1 · Titles', type: 'text', muted: false, hidden: false, locked: false },
      { id: 'track_overlay_1', name: 'V2 · Overlay', type: 'overlay', muted: false, hidden: false, locked: false },
      { id: 'track_video_1', name: 'V1 · Main', type: 'video', muted: false, hidden: false, locked: false },
      { id: 'track_audio_1', name: 'A1 · Audio', type: 'audio', muted: false, hidden: false, locked: false },
    ],
    clips: [],
  };
}

export function createStarterProject(): ProjectState {
  return {
    id: 'starter_reel_v1',
    name: 'Horizon Travel Reel',
    updatedAt: Date.now(),
    aspectRatio: '16:9',
    fps: 30,
    backgroundColor: '#090b0f',
    tracks: [
      { id: 'track_text_1', name: 'T1 · Titles', type: 'text', muted: false, hidden: false, locked: false },
      { id: 'track_overlay_1', name: 'V2 · Overlay', type: 'overlay', muted: false, hidden: false, locked: false },
      { id: 'track_video_1', name: 'V1 · Main', type: 'video', muted: false, hidden: false, locked: false },
      { id: 'track_audio_1', name: 'A1 · Audio', type: 'audio', muted: false, hidden: false, locked: false },
    ],
    clips: [
      {
        id: 'clip_v1_tokyo',
        trackId: 'track_video_1',
        assetId: 'builtin_tokyo_night',
        kind: 'image',
        name: 'Tokyo Rain Dusk',
        startTime: 0,
        duration: 4.5,
        sourceOffset: 0,
        sourceDuration: 5,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: createDefaultTransform(),
        color: {
          preset: 'cinema',
          brightness: -4,
          contrast: 18,
          saturation: 12,
          blur: 0,
          vignette: 28,
          hue: -6,
        },
        chromaKey: createDefaultChromaKey(),
        inAnimation: 'fade',
        outAnimation: 'none',
        inAnimDuration: 0.6,
        outAnimDuration: 0.4,
        transitionIn: { type: 'none', duration: 0.7 },
      },
      {
        id: 'clip_v1_cliffs',
        trackId: 'track_video_1',
        assetId: 'builtin_coastal_cliffs',
        kind: 'image',
        name: 'Mediterranean Cliffs',
        startTime: 4.5,
        duration: 4.5,
        sourceOffset: 0,
        sourceDuration: 5,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: createDefaultTransform(),
        color: {
          preset: 'golden',
          brightness: 6,
          contrast: 12,
          saturation: 18,
          blur: 0,
          vignette: 16,
          hue: 6,
        },
        chromaKey: createDefaultChromaKey(),
        inAnimation: 'none',
        outAnimation: 'none',
        inAnimDuration: 0.5,
        outAnimDuration: 0.5,
        transitionIn: { type: 'dissolve', duration: 0.85 },
      },
      {
        id: 'clip_v1_summit',
        trackId: 'track_video_1',
        assetId: 'builtin_mountain_summit',
        kind: 'image',
        name: 'Alpine Sunrise Ridge',
        startTime: 9,
        duration: 5,
        sourceOffset: 0,
        sourceDuration: 5,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: createDefaultTransform(),
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        inAnimation: 'none',
        outAnimation: 'fade',
        inAnimDuration: 0.4,
        outAnimDuration: 0.8,
        transitionIn: { type: 'slideLeft', duration: 0.75 },
      },
      {
        id: 'clip_o1_rec',
        trackId: 'track_overlay_1',
        kind: 'sticker',
        name: 'REC Indicator',
        startTime: 0.4,
        duration: 4.0,
        sourceOffset: 0,
        sourceDuration: 10,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: {
          ...createDefaultTransform(),
          x: 0.74,
          y: -0.74,
          scale: 0.82,
        },
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        sticker: {
          shape: 'rec',
          primaryColor: '#ef4444',
          secondaryColor: '#ffffff',
          label: 'REC',
        },
        inAnimation: 'fade',
        outAnimation: 'fade',
        inAnimDuration: 0.35,
        outAnimDuration: 0.35,
        transitionIn: { type: 'none', duration: 0.5 },
      },
      {
        id: 'clip_o1_portrait',
        trackId: 'track_overlay_1',
        assetId: 'builtin_studio_portrait',
        kind: 'image',
        name: 'Director PiP',
        startTime: 9.4,
        duration: 4.2,
        sourceOffset: 0,
        sourceDuration: 4.2,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: {
          ...createDefaultTransform(),
          x: -0.62,
          y: 0.45,
          scale: 0.68,
        },
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        inAnimation: 'pop',
        outAnimation: 'fade',
        inAnimDuration: 0.45,
        outAnimDuration: 0.45,
        transitionIn: { type: 'none', duration: 0.5 },
      },
      {
        id: 'clip_t1_title',
        trackId: 'track_text_1',
        kind: 'text',
        name: 'Main Title',
        startTime: 0.5,
        duration: 3.6,
        sourceOffset: 0,
        sourceDuration: 10,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: {
          ...createDefaultTransform(),
          x: 0,
          y: 0.58,
          scale: 1,
        },
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        text: {
          content: 'TOKYO DUSK · 35MM REEL',
          fontFamily: 'Outfit',
          fontSize: 44,
          fontWeight: 700,
          color: '#f8fafc',
          bgColor: '#0b0d11',
          bgOpacity: 0.72,
          strokeColor: '#000000',
          strokeWidth: 0,
          align: 'center',
          letterSpacing: 3,
        },
        inAnimation: 'slideUp',
        outAnimation: 'fade',
        inAnimDuration: 0.5,
        outAnimDuration: 0.4,
        transitionIn: { type: 'none', duration: 0.5 },
      },
      {
        id: 'clip_t1_chapter',
        trackId: 'track_text_1',
        kind: 'text',
        name: 'Coast Caption',
        startTime: 5.0,
        duration: 3.5,
        sourceOffset: 0,
        sourceDuration: 10,
        speed: 1,
        volume: 100,
        fadeIn: 0,
        fadeOut: 0,
        muted: false,
        transform: {
          ...createDefaultTransform(),
          x: -0.38,
          y: 0.62,
          scale: 1,
        },
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        text: {
          content: 'Mediterranean Cliffs · Golden Hour',
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 32,
          fontWeight: 600,
          color: '#fbbf24',
          bgColor: '#0b0d11',
          bgOpacity: 0.78,
          strokeColor: '#000000',
          strokeWidth: 0,
          align: 'left',
          letterSpacing: 0.5,
        },
        inAnimation: 'fade',
        outAnimation: 'fade',
        inAnimDuration: 0.45,
        outAnimDuration: 0.45,
        transitionIn: { type: 'none', duration: 0.5 },
      },
      {
        id: 'clip_a1_lofi',
        trackId: 'track_audio_1',
        assetId: 'builtin_audio_lofi',
        kind: 'audio',
        name: 'Warm Rhodes Lo-Fi',
        startTime: 0,
        duration: 14,
        sourceOffset: 0,
        sourceDuration: 12,
        speed: 1,
        volume: 80,
        fadeIn: 0.6,
        fadeOut: 1.5,
        muted: false,
        transform: createDefaultTransform(),
        color: createDefaultColor(),
        chromaKey: createDefaultChromaKey(),
        inAnimation: 'none',
        outAnimation: 'none',
        inAnimDuration: 0,
        outAnimDuration: 0,
        transitionIn: { type: 'none', duration: 0.5 },
      },
    ],
  };
}
