import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Space', desc: 'Play / Pause timeline' },
  { keys: 'S', desc: 'Split selected or active clip at playhead' },
  { keys: 'Delete / Backspace', desc: 'Delete selected clip' },
  { keys: 'Left / Right Arrow', desc: 'Step backward or forward 1 frame' },
  { keys: 'Home / End', desc: 'Jump playhead to start or end' },
  { keys: 'Ctrl / Cmd + Z', desc: 'Undo last edit' },
  { keys: 'Ctrl / Cmd + Shift + Z', desc: 'Redo edit' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg bg-[#13161D] border border-white/10 shadow-2xl">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-white/8">
          {SHORTCUTS.map((item) => (
            <div key={item.keys} className="py-2.5 flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-300">{item.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#0B0D11] border border-white/15 font-mono-tabular text-[11px] text-amber-300 whitespace-nowrap">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
