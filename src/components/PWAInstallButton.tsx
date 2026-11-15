import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Laptop,
  MonitorDown,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { DetectedPlatform, useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { NovaLogo } from './NovaLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, platform, inIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<DetectedPlatform>(platform);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
      return;
    }
    setActiveTab(platform);
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Clipboard blocked in restricted contexts
    }
  };

  const buttonClasses =
    variant === 'hero'
      ? 'px-4 py-2.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap'
      : variant === 'compact'
        ? 'px-3 py-2 rounded-md bg-[#181C26] hover:bg-[#232836] border border-white/12 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0'
        : 'px-3.5 py-2 rounded-md bg-[#181C26] hover:bg-[#232836] border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install Nova Studio on iOS, Android, or PC"
        className={`${buttonClasses} ${className}`.trim()}
      >
        <MonitorDown className="w-4 h-4 text-sky-400 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#13161D] border border-white/12 shadow-2xl overflow-hidden text-[#F1F3F7]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <NovaLogo size={36} />
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-white truncate">
                    Install Nova Studio App
                  </h3>
                  <p className="text-xs text-slate-400">
                    Works offline · Native standalone window · iOS, Android & PC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Tabs */}
            <div className="px-5 pt-4">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#0B0D11] border border-white/8">
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === 'ios'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iOS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === 'android'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === 'desktop'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>PC / Mac</span>
                </button>
              </div>
            </div>

            {/* Instructions Content */}
            <div className="p-5 space-y-4">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowGuide(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0B0D11] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Now (One-Click)</span>
                </button>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400">
                    On iPhone or iPad, install Nova Studio via <strong className="text-white">Safari</strong>:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white flex items-center gap-1.5">
                          Tap the <Share className="w-3.5 h-3.5 text-sky-400 inline" /> Share button
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Located at the bottom toolbar on iPhone or top-right on iPad.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white flex items-center gap-1.5">
                          Tap <PlusSquare className="w-3.5 h-3.5 text-sky-400 inline" /> Add to Home Screen
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Scroll down the share sheet and tap <strong>Add</strong> in the top-right corner.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'android' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400">
                    On Android (Chrome, Edge, or Samsung Internet):
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white flex items-center gap-1.5">
                          Open browser menu <MoreVertical className="w-3.5 h-3.5 text-sky-400 inline" />
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Tap the three dots at the top-right of Chrome or Edge.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white">Tap "Install app" or "Add to Home screen"</p>
                        <p className="text-slate-400 mt-0.5">
                          Nova Studio installs as a full-screen Android app with the HN icon.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'desktop' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <p className="text-slate-400">
                    On Windows, macOS, or Linux (Chrome, Edge, or Safari Mac):
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white flex items-center gap-1.5">
                          Click the <MonitorDown className="w-3.5 h-3.5 text-sky-400 inline" /> Install icon in the address bar
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          In Chrome or Edge, click the install icon on the right side of the URL bar (or menu → <strong>Cast, save, and share → Install Nova Studio</strong>).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0D11] border border-white/6">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white">Safari on macOS</p>
                        <p className="text-slate-400 mt-0.5">
                          Click <strong>File → Add to Dock</strong> to launch Nova Studio directly from your Mac Dock.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {inIframe && !isInstallable && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3 text-xs">
                  <p className="text-amber-200 leading-relaxed">
                    Previewing inside an embedded frame. Open the app URL directly in a browser tab for 1-click install.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-[#0E1117] border-t border-white/8 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-md bg-[#181C26] hover:bg-[#232836] text-xs font-medium text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-[#0B0D11] shadow-lg">
      <span className="h-2 w-2 rounded-full bg-[#0B0D11] animate-pulse" />
      Offline Mode — Cached studio workspace active
    </div>
  );
};
