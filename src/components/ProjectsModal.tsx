import React from 'react';
import { FolderOpen, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { ProjectState } from '../types/studio';

interface ProjectsModalProps {
  projects: ProjectState[];
  currentProjectId: string;
  onSelectProject: (project: ProjectState) => void;
  onNewBlank: () => void;
  onNewStarter: () => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onNewBlank,
  onNewStarter,
  onDeleteProject,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90dvh] flex flex-col rounded-lg bg-[#13161D] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-white">Local Projects</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onNewBlank}
              className="py-2.5 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Blank Project
            </button>
            <button
              type="button"
              onClick={onNewStarter}
              className="py-2.5 px-3 rounded-md bg-[#1C212D] hover:bg-[#242A38] border border-white/10 text-slate-100 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              New Starter Reel
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-white/8 border border-white/8 rounded-md bg-[#0E1117]">
            {projects.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No saved projects yet. Save your current project or create a new one above.
              </div>
            ) : (
              projects.map((p) => {
                const isCurrent = p.id === currentProjectId;
                return (
                  <div
                    key={p.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProject(p)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-white truncate">
                        {p.name}
                        {isCurrent && (
                          <span className="text-amber-400 font-normal ml-2">Active</span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono-tabular mt-0.5">
                        {p.aspectRatio} · {p.clips.length} clips ·{' '}
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteProject(p.id)}
                      title="Delete Project"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
