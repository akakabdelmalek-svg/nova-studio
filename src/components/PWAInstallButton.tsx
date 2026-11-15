import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  MoreVertical,
  PackageCheck,
  Share2,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
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
    isIOS,
    isAndroid,
    inIframe,
    install,
    cacheOfflineBundle,
    downloadBestDesktopInstaller,
  } = usePWAInstall();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [cachedOffline, setCachedOffline] = useState(false);
  const [downloadedAsset, setDownloadedAsset] = useState<{
    nativeBinary: boolean;
    fileName: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallAll = async () => {
    setInstalling(true);
    const cached = await cacheOfflineBundle();
    setCachedOffline(cached);

    // 1. Native 1-click PWA install prompt (Android Chrome / Desktop Chrome & Edge)
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstalling(false);
        return;
      }
    }

    // 2. iOS Safari guided Add to Home Screen flow
    if (isIOS) {
      setInstalling(false);
      setShowStatusModal(true);
      return;
    }

    // 3. Android fallback without native prompt: show quick 2-tap Add to Home Screen modal
    if (isAndroid) {
      setInstalling(false);
      setShowStatusModal(true);
      return;
    }

    // 4. PC (Windows / Mac / Linux): 1-click automatic download of Nova Studio installer package
    const result = await downloadBestDesktopInstaller();
    setDownloadedAsset(result);
    setInstalling(false);
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
        onClick={handleInstallAll}
        disabled={installing}
        title="Installer Nova Studio en 1 clic (PC, Android & iOS)"
        className={`${buttonClasses} disabled:opacity-60 ${className}`.trim()}
      >
        <NovaLogo size={variant === 'hero' ? 18 : 16} className="shrink-0" />
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>{installing ? 'Installation...' : 'Installer App'}</span>
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
                    Téléchargement automatique · iOS, Android & PC
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
                <span>Application et ressources mises en cache local dans votre navigateur.</span>
              </div>
            )}

            {isIOS ? (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <Share2 className="w-4 h-4" />
                  <span>Ajouter sur l’écran d’accueil (iPhone / iPad)</span>
                </div>
                <p>1. Appuyez sur <strong>Partager</strong> dans Safari.</p>
                <p>2. Sélectionnez <strong>Sur l’écran d’accueil</strong> pour installer l’app Nova Studio avec son logo HN.</p>
              </div>
            ) : isAndroid ? (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <MoreVertical className="w-4 h-4" />
                  <span>Installer sur Android (Chrome / Edge)</span>
                </div>
                <p>1. Appuyez sur le menu <strong>⋮</strong> en haut à droite du navigateur.</p>
                <p>2. Appuyez sur <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p>
              </div>
            ) : downloadedAsset?.nativeBinary ? (
              <div className="p-3.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 space-y-2 text-xs text-slate-200">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <PackageCheck className="w-4 h-4" />
                  <span>Installeur téléchargé : {downloadedAsset.fileName}</span>
                </div>
                <p>
                  Ouvrez le fichier téléchargé et cliquez sur <strong>Installer / OK</strong> pour lancer Nova Studio comme application PC.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-slate-800 bg-[#070B14] space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    Téléchargement automatique lancé ({downloadedAsset?.fileName || 'Nova-Studio-Setup.zip'})
                  </span>
                </div>
                <p>
                  • <strong>Sur PC via le ZIP</strong> : ouvrez <code className="text-cyan-200">Nova-Studio-Setup.zip</code>, extrayez puis double-cliquez sur <strong className="text-slate-100">Install-Nova-Studio-Windows.bat</strong> (Windows), <strong className="text-slate-100">Install-Nova-Studio-Mac.command</strong> (Mac) ou <strong className="text-slate-100">Install-Nova-Studio-Linux.sh</strong> (Linux).
                </p>
                <p>
                  • <strong>En 1 clic direct sans ZIP</strong> : ouvrez l’app dans <strong>Chrome</strong> ou <strong>Edge</strong> (hors iframe) puis cliquez sur <em>Installer</em>.
                </p>
              </div>
            )}

            {inIframe && !isInstallable && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3 text-xs">
                <p className="text-amber-200 leading-relaxed">
                  Aperçu intégré : copiez l’URL dans Chrome/Safari pour l’installation directe en 1 clic.
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

            <div className="flex items-center gap-2 pt-1">
              {!isIOS && !isAndroid && (
                <button
                  type="button"
                  onClick={() => void downloadBestDesktopInstaller()}
                  className="flex-1 h-9 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/20 transition-colors cursor-pointer"
                >
                  Retélécharger
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 h-9 rounded-md bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                Fermer
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
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-600/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Mode hors-ligne — Données locales en cache actives</span>
    </div>
  );
};
