import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  MonitorDown,
  MoreVertical,
  PlusSquare,
  Share2,
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
  const {
    isInstallable,
    isInstalled,
    platform,
    inIframe,
    install,
    cacheOfflineBundle,
  } = usePWAInstall();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeTab, setActiveTab] = useState<DetectedPlatform>(platform);
  const [installing, setInstalling] = useState(false);
  const [cachedOffline, setCachedOffline] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    const cached = await cacheOfflineBundle();
    setCachedOffline(cached);

    // 1-click native browser PWA install prompt (Chrome / Edge on PC & Android)
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstalling(false);
        return;
      }
    }

    setInstalling(false);
    setActiveTab(platform);
    setShowStatusModal(true);
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
      ? 'px-4 py-2.5 rounded-md border border-cyan-400/45 bg-gradient-to-r from-[#0F1B33] to-[#131D3B] hover:border-cyan-300 text-cyan-100 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shadow-[0_0_16px_-6px_rgba(34,211,238,0.55)]'
      : variant === 'compact'
        ? 'h-8 px-2.5 rounded-md border border-cyan-500/45 bg-gradient-to-r from-[#0F1B33] to-[#131736] hover:border-cyan-400 text-xs font-semibold text-cyan-100 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0'
        : 'h-9 px-3 rounded-md border border-cyan-500/45 bg-gradient-to-r from-[#0F1B33] to-[#131736] hover:border-cyan-400 hover:shadow-[0_0_16px_-4px_rgba(34,211,238,0.65)] text-xs font-semibold text-cyan-100 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0';

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        title="Installer Nova Studio (iOS, Android & PC)"
        className={`${buttonClasses} disabled:opacity-60 ${className}`.trim()}
      >
        <NovaLogo size={variant === 'hero' ? 18 : 16} className="shrink-0" />
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{installing ? 'Préparation...' : 'Installer App'}</span>
      </button>

      {showStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0B101C] p-6 shadow-2xl space-y-4 text-[#F1F3F7]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <NovaLogo size={46} className="shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-100">
                    Installer Nova Studio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Application PWA native · iOS, Android & PC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cachedOffline && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Application et logo HN mis en cache local pour le mode hors-ligne.</span>
              </div>
            )}

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowStatusModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Installer maintenant en 1 clic</span>
              </button>
            )}

            {/* Platform Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#070B14] border border-white/8">
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'ios'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
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
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
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
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC / Mac</span>
              </button>
            </div>

            {activeTab === 'ios' && (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <Share2 className="w-4 h-4" />
                  <span>Installer sur iPhone / iPad (Safari)</span>
                </div>
                <p>1. Appuyez sur le bouton <strong>Partager</strong> dans Safari.</p>
                <p className="flex items-center gap-1.5">
                  2. Appuyez sur <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline shrink-0" /> <strong>Sur l’écran d’accueil</strong> puis <strong>Ajouter</strong>.
                </p>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <MoreVertical className="w-4 h-4" />
                  <span>Installer sur Android (Chrome / Edge)</span>
                </div>
                <p>1. Ouvrez le menu <strong>⋮</strong> en haut à droite du navigateur.</p>
                <p>2. Appuyez sur <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <MonitorDown className="w-4 h-4" />
                  <span>Installer sur PC / Mac (Chrome, Edge, Safari)</span>
                </div>
                <p>
                  • <strong>Chrome / Edge</strong> : cliquez sur l’icône <strong>Installer</strong> dans la barre d’adresse (à droite de l’URL).
                </p>
                <p>
                  • <strong>Safari Mac</strong> : cliquez sur <strong>Fichier → Ajouter au Dock</strong>.
                </p>
              </div>
            )}

            {inIframe && !isInstallable && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3 text-xs">
                <p className="text-amber-200 leading-relaxed">
                  Aperçu intégré : ouvrez ce lien directement dans un onglet navigateur pour installer en 1 clic.
                </p>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copié' : 'Copier URL'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="w-full h-9 rounded-md bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              Fermer
            </button>
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
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-600/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Mode hors-ligne — Données locales en cache actives</span>
    </div>
  );
};
