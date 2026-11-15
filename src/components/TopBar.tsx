import React from 'react';
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
    <header className="h-13 shrink-0 bg-[#11141B] border-b border-white/8 px-5 flex items-center justify-between gap-8 select-none">
      {/* Zone 1: Brand Mark + Wordmark */}
      <button
        type="button"
        onClick={onOpenHome}
        className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <NovaLogo size={26} />
        <span>Nova Studio</span>
      </button>

      {/* Zone 2: Clean single-line workspace links & controls */}
      <nav className="flex items-center gap-5 text-sm font-medium text-slate-300 overflow-x-auto">
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
          className="hidden lg:inline-block hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5"
        >
          Shortcuts
        </button>
      </nav>

      {/* Zone 3: App Install, Video Save & Export actions */}
      <div className="flex items-center gap-2 shrink-0">
        <PWAInstallButton variant="compact" className="hidden md:flex" />
        <button
          type="button"
          onClick={onQuickSaveVideo}
          title="Enregistrer la vidéo dans My Videos pour l'installer"
          className="px-3.5 py-2 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Enregistrer Vidéo
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="px-4 py-2 text-xs font-semibold text-[#0B0D11] bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Export Video
        </button>
      </div>
    </header>
  );
};
