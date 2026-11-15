import React from 'react';
import { FolderOpen, Redo2, Save, Undo2 } from 'lucide-react';
import { AspectRatio } from '../types/studio';
import { ASPECT_RATIO_DIMENSIONS } from '../utils/defaults';
import { NovaLogo } from './NovaLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  aspectRatio: AspectRatio;
  canUndo: boolean;
  canRedo: boolean;
  saveLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProject: () => void;
  onOpenProjects: () => void;
  onOpenHome: () => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onOpenShortcuts: () => void;
  onQuickSaveVideo: () => void;
  onOpenExport: () => void;
}

const RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];

export const TopBar: React.FC<TopBarProps> = ({
  aspectRatio,
  canUndo,
  canRedo,
  saveLabel,
  onUndo,
  onRedo,
  onSaveProject,
  onOpenProjects,
  onOpenHome,
  onChangeAspectRatio,
  onOpenShortcuts,
  onQuickSaveVideo,
  onOpenExport,
}) => {
  const nextRatio = () => {
    const idx = RATIOS.indexOf(aspectRatio);
    onChangeAspectRatio(RATIOS[(idx + 1) % RATIOS.length]);
  };

  return (
    <header className="h-12 lg:h-13 shrink-0 bg-[#11141B] border-b border-white/8 px-2.5 sm:px-4 lg:px-5 flex items-center justify-between gap-2 lg:gap-8 select-none">
      {/* Zone 1: Brand Mark + Wordmark + Mobile Quick Undo/Redo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onOpenHome}
          title="Back to Home"
          className="flex items-center gap-1.5 sm:gap-2 font-display text-sm sm:text-base lg:text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px]"
        >
          <NovaLogo size={24} />
          <span className="hidden sm:inline">Nova Studio</span>
        </button>

        {/* Compact mobile icon actions */}
        <div className="flex lg:hidden items-center gap-0.5">
          <button
            type="button"
            onClick={onOpenProjects}
            title="Projects"
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="p-1.5 rounded text-slate-300 hover:text-white disabled:text-slate-600 cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 rounded text-slate-300 hover:text-white disabled:text-slate-600 cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onSaveProject}
            title="Save Project"
            className="p-1.5 rounded text-slate-300 hover:text-white cursor-pointer"
          >
            <Save className={`w-4 h-4 ${saveLabel === 'Saved' ? 'text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Zone 2: Desktop single-line workspace links & controls */}
      <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300 overflow-x-auto">
        <button
          type="button"
          onClick={onOpenHome}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Home
        </button>

        <button
          type="button"
          onClick={onOpenProjects}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Projects
        </button>

        <button
          type="button"
          onClick={nextRatio}
          title={`Switch canvas aspect ratio (${ASPECT_RATIO_DIMENSIONS[aspectRatio].label})`}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 font-mono-tabular text-xs text-slate-300"
        >
          Canvas {aspectRatio}
        </button>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Redo
        </button>

        <button
          type="button"
          onClick={onSaveProject}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          {saveLabel}
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Shortcuts
        </button>
      </nav>

      {/* Zone 3: App Install, Video Save & Export actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={nextRatio}
          title="Switch aspect ratio"
          className="lg:hidden px-1.5 sm:px-2 py-1.5 rounded bg-[#181C26] border border-white/10 text-[11px] font-mono-tabular text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {aspectRatio}
        </button>
        <PWAInstallButton variant="compact" className="hidden md:flex" />
        <button
          type="button"
          onClick={onQuickSaveVideo}
          title="Enregistrer la vidéo dans My Videos pour l'installer"
          className="px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="hidden sm:inline">Enregistrer Vidéo</span>
          <span className="sm:hidden">Enregistrer</span>
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-[#0B0D11] bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="hidden sm:inline">Export Video</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
};
