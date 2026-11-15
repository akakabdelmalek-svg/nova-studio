import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Film, FolderCheck, Save, X } from 'lucide-react';
import { ExportOptions, MediaAsset, ProjectState } from '../types/studio';
import { getExportDimensions } from '../utils/defaults';
import { ExportResult, exportProjectVideo, getSupportedExportMime } from '../utils/exporter';
import { saveVideoToDevice } from '../utils/videoSaver';

interface ExportModalProps {
  project: ProjectState;
  assetsMap: Map<string, MediaAsset>;
  totalDuration: number;
  autoStart?: boolean;
  onExportComplete?: (
    result: ExportResult,
    dims: { width: number; height: number },
    duration: number
  ) => void;
  onGoToMyVideos?: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  assetsMap,
  totalDuration,
  autoStart = false,
  onExportComplete,
  onGoToMyVideos,
  onClose,
}) => {
  const [options, setOptions] = useState<ExportOptions>(() => ({
    resolution: '1080p',
    fps: 30,
    quality: 'high',
    format: getSupportedExportMime('mp4').extension === 'mp4' ? 'mp4' : 'webm',
  }));
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);

  const dims = getExportDimensions(project.aspectRatio, options.resolution);
  const resolvedMime = getSupportedExportMime(options.format);

  const handleStartExport = useCallback(async () => {
    if (totalDuration <= 0.05) {
      setError('Add at least one clip to the timeline before saving the video.');
      return;
    }
    setError(null);
    setResult(null);
    setProgress(0);
    setIsExporting(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await exportProjectVideo(
        project,
        assetsMap,
        totalDuration,
        options,
        (pct) => setProgress(Math.round(pct)),
        controller.signal
      );
      setResult(res);
      onExportComplete?.(res, dims, totalDuration);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Export cancelled.');
      } else {
        setError(err instanceof Error ? err.message : 'Export failed.');
      }
    } finally {
      setIsExporting(false);
    }
  }, [project, assetsMap, totalDuration, options, dims, onExportComplete]);

  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void handleStartExport();
    }
  }, [autoStart, handleStartExport]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleDownload = async (preferSavePicker = false) => {
    if (!result) return;
    setSaveNote(null);
    const saved = await saveVideoToDevice(
      result.blob,
      project.name || 'nova-studio-export',
      result.extension,
      result.mimeType,
      { preferSavePicker }
    );
    if (!saved.cancelled) {
      setSaveNote(
        saved.method === 'share'
          ? 'Menu système ouvert — choisissez Enregistrer la vidéo / Photos.'
          : saved.method === 'picker'
            ? 'Vidéo enregistrée dans le dossier choisi.'
            : 'Téléchargement démarré dans votre appareil.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[90dvh] flex flex-col rounded-lg bg-[#13161D] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-white">
              {autoStart ? 'Enregistrer la vidéo' : 'Export Video'}
            </h2>
          </div>
          <button
            type="button"
            onClick={isExporting ? handleCancel : onClose}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-white/8">
            <span>
              {dims.width} × {dims.height} · {options.fps} fps · {totalDuration.toFixed(1)}s
            </span>
            <span className="text-emerald-400 font-medium">No Watermark</span>
          </div>

          {!isExporting && !result && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['720p', '1080p', '4k'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setOptions((o) => ({ ...o, resolution: r }))}
                      className={`py-2 rounded text-xs font-mono-tabular font-semibold border cursor-pointer transition-colors ${
                        options.resolution === r
                          ? 'bg-amber-500 text-[#0B0D11] border-amber-500'
                          : 'bg-[#191D27] text-slate-300 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Frame Rate
                  </label>
                  <select
                    value={options.fps}
                    onChange={(e) =>
                      setOptions((o) => ({ ...o, fps: Number(e.target.value) as 24 | 30 | 60 }))
                    }
                    className="w-full px-2.5 py-2 rounded bg-[#0B0D11] border border-white/10 text-xs text-white"
                  >
                    <option value={24}>24 fps (Cinema)</option>
                    <option value={30}>30 fps (Standard)</option>
                    <option value={60}>60 fps (Smooth)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bitrate Quality
                  </label>
                  <select
                    value={options.quality}
                    onChange={(e) =>
                      setOptions((o) => ({
                        ...o,
                        quality: e.target.value as 'standard' | 'high' | 'master',
                      }))
                    }
                    className="w-full px-2.5 py-2 rounded bg-[#0B0D11] border border-white/10 text-xs text-white"
                  >
                    <option value="standard">Standard (4.5 Mbps)</option>
                    <option value="high">High (10 Mbps)</option>
                    <option value="master">Master (22 Mbps)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Container Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['webm', 'mp4'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOptions((o) => ({ ...o, format: fmt }))}
                      className={`py-2 rounded text-xs font-mono-tabular font-semibold uppercase border cursor-pointer ${
                        options.format === fmt
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/60'
                          : 'bg-[#191D27] text-slate-300 border-white/10'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                {options.format === 'mp4' && resolvedMime.extension !== 'mp4' && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    This browser encodes via WebM ({resolvedMime.mimeType}); file will save as .webm.
                  </p>
                )}
              </div>
            </>
          )}

          {isExporting && (
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">Rendering timeline frames...</span>
                <span className="font-mono-tabular text-amber-400 font-semibold">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#0B0D11] overflow-hidden border border-white/8">
                <div
                  className="h-full bg-amber-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Keep this tab active while frames and mixed audio are encoded in real time.
              </p>
            </div>
          )}

          {result && (
            <div className="py-3 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Vidéo enregistrée dans My Videos
                </p>
                <p className="text-xs text-slate-400 font-mono-tabular mt-0.5">
                  {(result.blob.size / (1024 * 1024)).toFixed(2)} MB · .{result.extension}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(false)}
                  className="w-full py-2.5 px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Installer / Télécharger la vidéo
                </button>
                {typeof window !== 'undefined' && 'showSaveFilePicker' in window && (
                  <button
                    type="button"
                    onClick={() => void handleDownload(true)}
                    className="w-full py-2 px-4 rounded-md bg-[#181C26] hover:bg-[#222836] border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    Choisir le dossier sur PC (Enregistrer sous...)
                  </button>
                )}
                {onGoToMyVideos && (
                  <button
                    type="button"
                    onClick={onGoToMyVideos}
                    className="w-full py-2 px-4 rounded-md bg-[#181C26] hover:bg-[#222836] border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderCheck className="w-3.5 h-3.5 text-sky-400" />
                    Ouvrir dans My Videos
                  </button>
                )}
              </div>
              {saveNote && (
                <p className="text-[11px] text-emerald-300 font-medium">{saveNote}</p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <div className="px-5 py-3.5 border-t border-white/8 bg-[#0E1117] flex justify-end gap-2 shrink-0">
          {isExporting ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-md text-xs font-medium text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 cursor-pointer"
            >
              Cancel Export
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
              {!result && (
                <button
                  type="button"
                  onClick={handleStartExport}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-[#0B0D11] bg-amber-500 hover:bg-amber-400 cursor-pointer"
                >
                  Start Render
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
