import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Film,
  FolderOpen,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  AspectRatio,
  ExportedVideoRecord,
  MediaAsset,
  ProjectState,
} from '../types/studio';
import { formatTimecode } from '../utils/defaults';
import { NovaLogo } from './NovaLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeViewProps {
  projects: ProjectState[];
  currentProject: ProjectState;
  exportedVideos: ExportedVideoRecord[];
  assetsMap: Map<string, MediaAsset>;
  onCreateNewVideo: (aspectRatio: AspectRatio, initialFiles?: FileList) => void;
  onOpenProject: (project: ProjectState) => void;
  onDeleteProject: (id: string) => void;
  onDeleteExportedVideo: (id: string) => void;
  onGoToEditorToExport: () => void;
}

const RATIOS: Array<{ id: AspectRatio; label: string }> = [
  { id: '16:9', label: '16:9 Wide' },
  { id: '9:16', label: '9:16 Reels' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Feed' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  projects,
  currentProject,
  exportedVideos,
  assetsMap,
  onCreateNewVideo,
  onOpenProject,
  onDeleteProject,
  onDeleteExportedVideo,
  onGoToEditorToExport,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('16:9');
  const [previewVideo, setPreviewVideo] = useState<ExportedVideoRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoObjectUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of exportedVideos) {
      map.set(v.id, URL.createObjectURL(v.blob));
    }
    return map;
  }, [exportedVideos]);

  useEffect(() => {
    return () => {
      videoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [videoObjectUrls]);

  const handleDownloadVideo = (video: ExportedVideoRecord) => {
    const url = videoObjectUrls.get(video.id) || URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    const safeName = (video.name || 'nova-studio-video')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-');
    a.href = url;
    a.download = `${safeName}.${video.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getProjectPoster = (proj: ProjectState): string | undefined => {
    for (const clip of proj.clips) {
      if (clip.assetId) {
        const asset = assetsMap.get(clip.assetId);
        if (asset?.thumbnailUrl) return asset.thumbnailUrl;
      }
    }
    return undefined;
  };

  const getProjectDuration = (proj: ProjectState): number => {
    if (proj.clips.length === 0) return 0;
    return Math.max(...proj.clips.map((c) => c.startTime + c.duration));
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-[#0B0D11] text-[#F1F3F7] flex flex-col">
      {/* Clean 3-Zone Top Header */}
      <header className="h-14 shrink-0 sticky top-0 z-20 bg-[#11141B]/95 backdrop-blur-sm border-b border-white/8 px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <NovaLogo size={30} />
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            Nova Studio
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => scrollToSection('home-hero')}
            className="text-white transition-colors whitespace-nowrap cursor-pointer py-1.5"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('my-videos')}
            className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1.5"
          >
            My Videos
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('my-projects')}
            className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1.5"
          >
            Projects
          </button>
          <button
            type="button"
            onClick={() => onOpenProject(currentProject)}
            className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1.5"
          >
            Open Editor
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton variant="header" />
          <button
            type="button"
            onClick={() => onCreateNewVideo(selectedRatio)}
            className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-[#0B0D11] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Video</span>
          </button>
        </div>
      </header>

      {/* Hidden File Input for Quick Start with Local Video/Media */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onCreateNewVideo(selectedRatio, e.target.files);
            e.target.value = '';
          }
        }}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
        {/* Hero / Quick Create Section */}
        <section
          id="home-hero"
          className="rounded-xl bg-[#11141B] border border-white/8 p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
        >
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <NovaLogo size={46} />
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Create your next video
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Free · Ad-Free · No Watermark · 280+ Transitions & 270+ Live Effects
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 mr-1">Aspect Ratio:</span>
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRatio(r.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono-tabular font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    selectedRatio === r.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-[#161A23] border-white/8 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onCreateNewVideo(selectedRatio)}
                className="px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Video</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-md bg-[#181C26] hover:bg-[#212633] border border-white/10 text-slate-100 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Import & Edit Media</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenProject(currentProject)}
                className="px-4 py-2.5 rounded-md bg-transparent hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Film className="w-4 h-4 text-amber-400" />
                <span>Resume "{currentProject.name}"</span>
              </button>

              <PWAInstallButton variant="hero" />
            </div>
          </div>

          <div className="w-full lg:w-72 shrink-0 rounded-lg bg-[#0B0D11] border border-white/8 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Studio Workspace</span>
              <span className="font-mono-tabular text-amber-400 font-semibold">4K Ready</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-white/6">
                <span className="text-slate-400">My Videos</span>
                <span className="font-mono-tabular font-semibold text-white">
                  {exportedVideos.length}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/6">
                <span className="text-slate-400">Saved Projects</span>
                <span className="font-mono-tabular font-semibold text-white">
                  {projects.length}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">AI Tools</span>
                <span className="text-sky-400 font-medium">Cutout · Subtitles · Track</span>
              </div>
            </div>
          </div>
        </section>

        {/* My Videos (Exported & Downloadable Videos) */}
        <section id="my-videos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">My Videos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Rendered exports saved locally in your browser — preview or download anytime.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-400">
              {exportedVideos.length} {exportedVideos.length === 1 ? 'video' : 'videos'}
            </span>
          </div>

          {exportedVideos.length === 0 ? (
            <div className="rounded-xl bg-[#11141B] border border-dashed border-white/12 p-8 text-center space-y-3">
              <Video className="w-8 h-8 text-slate-500 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-200">No exported videos yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  When you click Export Video inside the editor, your rendered video automatically appears here in My Videos with instant playback and one-click download.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onCreateNewVideo(selectedRatio)}
                  className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-xs font-semibold cursor-pointer"
                >
                  + New Video
                </button>
                <button
                  type="button"
                  onClick={onGoToEditorToExport}
                  className="px-4 py-2 rounded-md bg-[#181C26] hover:bg-[#222836] border border-white/10 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Open Studio to Export
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportedVideos.map((vid) => {
                const videoUrl = videoObjectUrls.get(vid.id);
                return (
                  <div
                    key={vid.id}
                    className="rounded-lg bg-[#11141B] border border-white/8 overflow-hidden flex flex-col group hover:border-amber-500/45 transition-colors"
                  >
                    <div className="aspect-video bg-[#06080B] relative overflow-hidden">
                      {videoUrl ? (
                        <video
                          src={videoUrl}
                          poster={vid.thumbnailUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : vid.thumbnailUrl ? (
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Video className="w-8 h-8" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setPreviewVideo(vid)}
                        title="Play video"
                        className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <span className="w-11 h-11 rounded-full bg-amber-500 text-[#0B0D11] flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </span>
                      </button>
                    </div>

                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white truncate">{vid.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono-tabular mt-0.5 truncate">
                          {vid.width}×{vid.height} · {formatTimecode(vid.duration)} ·{' '}
                          {(vid.sizeBytes / (1024 * 1024)).toFixed(2)} MB ·{' '}
                          {vid.extension.toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadVideo(vid)}
                          className="flex-1 py-2 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewVideo(vid)}
                          className="py-2 px-3 rounded-md bg-[#181C26] hover:bg-[#232836] border border-white/10 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExportedVideo(vid.id)}
                          title="Delete exported video"
                          className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Saved Timeline Projects */}
        <section id="my-projects" className="space-y-4 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Saved Projects</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pick up editing any multi-track sequence where you left off.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-400">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const poster = getProjectPoster(proj);
              const dur = getProjectDuration(proj);
              return (
                <div
                  key={proj.id}
                  className="rounded-lg bg-[#11141B] border border-white/8 overflow-hidden flex flex-col hover:border-white/25 transition-colors"
                >
                  <div
                    onClick={() => onOpenProject(proj)}
                    className="aspect-video bg-[#080A0E] relative overflow-hidden cursor-pointer group"
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt={proj.name}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <FolderOpen className="w-7 h-7" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded bg-amber-500 text-[#0B0D11] text-xs font-semibold">
                        Open in Studio
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{proj.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                        {proj.aspectRatio} · {proj.clips.length} clips · {formatTimecode(dur)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj)}
                        className="px-2.5 py-1.5 rounded bg-[#181C26] hover:bg-[#232836] border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          title="Delete project"
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Video Player Modal for My Videos */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-lg bg-[#13161D] border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-white truncate">
                  {previewVideo.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono-tabular">
                  {previewVideo.width}×{previewVideo.height} ·{' '}
                  {(previewVideo.sizeBytes / (1024 * 1024)).toFixed(2)} MB ·{' '}
                  {previewVideo.extension.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[68vh]">
              <video
                src={videoObjectUrls.get(previewVideo.id)}
                controls
                autoPlay
                className="max-h-[68vh] w-full object-contain"
              />
            </div>
            <div className="px-5 py-3 bg-[#0E1117] border-t border-white/8 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadVideo(previewVideo)}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
