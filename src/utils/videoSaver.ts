export interface SaveVideoResult {
  method: 'share' | 'picker' | 'download';
  cancelled?: boolean;
}

function sanitizeFilename(name: string, ext: string): string {
  const base = (name || 'nova-studio-video')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'nova-studio-video';
  const cleanExt = ext.replace(/^\./, '') || 'mp4';
  return `${base}.${cleanExt}`;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return /iphone|ipad|ipod|android|mobile/.test(ua) || isIPadOS;
}

export function triggerDirectDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * KineMaster-style device save/install:
 * - Mobile (iPhone/iPad/Android): tries native OS Share/Save Video sheet first (saves to Photos/Gallery/Files),
 *   with automatic fallback to browser file download.
 * - Desktop (Windows/Mac/Linux): direct 1-click download to Downloads folder (or OS Save-As picker if requested).
 */
export async function saveVideoToDevice(
  blob: Blob,
  name: string,
  extension: string,
  mimeType: string,
  options?: { preferSavePicker?: boolean; forceDirectDownload?: boolean }
): Promise<SaveVideoResult> {
  const filename = sanitizeFilename(name, extension);
  const cleanMime = mimeType.split(';')[0] || (extension === 'mp4' ? 'video/mp4' : 'video/webm');

  // Optional desktop "Save As" folder picker
  if (options?.preferSavePicker && typeof window !== 'undefined') {
    const win = window as unknown as {
      showSaveFilePicker?: (opts?: {
        suggestedName?: string;
        types?: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };
    if (typeof win.showSaveFilePicker === 'function') {
      try {
        const handle = await win.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Video File',
              accept: { [cleanMime]: [`.${extension}`] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { method: 'picker' };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { method: 'picker', cancelled: true };
        }
      }
    }
  }

  // On mobile (iOS / Android), try native Share / "Save Video" sheet so user can save directly to Camera Roll / Photos
  if (!options?.forceDirectDownload && isMobileDevice() && typeof navigator !== 'undefined' && typeof File !== 'undefined') {
    try {
      const file = new File([blob], filename, { type: cleanMime });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          files: [file],
          title: name || 'Nova Studio Video',
        });
        return { method: 'share' };
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { method: 'share', cancelled: true };
      }
      // Fall through to direct download
    }
  }

  triggerDirectDownload(blob, filename);
  return { method: 'download' };
}
