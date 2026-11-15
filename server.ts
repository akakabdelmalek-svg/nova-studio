import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);

function crc32Buffer(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildStoreZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32Buffer(entry.data);
    const size = entry.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localChunk = Buffer.concat([localHeader, nameBuf, entry.data]);
    localParts.push(localChunk);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(Buffer.concat([centralHeader, nameBuf]));
    offset += localChunk.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAIError(res: express.Response, err: unknown, fallbackMsg: string) {
  const message = err instanceof Error ? err.message : fallbackMsg;
  const status =
    message.includes('PERMISSION_DENIED') || message.includes('403')
      ? 403
      : message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
        ? 429
        : message.includes('NOT_FOUND') || message.includes('404')
          ? 404
          : 500;
  res.status(status).json({ error: message });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32mb' }));

  // 1. AI Automatic Subject Background Removal (Polygon & Palette Segmentation)
  app.post('/api/ai/remove-background', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64) {
        res.status(400).json({ error: 'Missing imageBase64 payload.' });
        return;
      }

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text:
                'Identify the primary foreground subject in this frame for video background removal. ' +
                'Return a tight normalized polygon contour (16 to 28 clockwise points in 0..1000 coordinates, ' +
                'where (0,0) is top-left and (1000,1000) is bottom-right) tracing the silhouette of the primary subject, ' +
                'along with a short subjectLabel and 2-3 dominant background hex colors.',
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjectLabel: { type: Type.STRING },
              foregroundBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER },
                },
                required: ['ymin', 'xmin', 'ymax', 'xmax'],
              },
              polygon: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                  },
                  required: ['x', 'y'],
                },
              },
              backgroundColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['subjectLabel', 'foregroundBox', 'polygon', 'backgroundColors'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleAIError(res, err, 'Failed to analyze subject for background removal.');
    }
  });

  // 2. AI-Generated Subtitles from Audio
  app.post('/api/ai/generate-subtitles', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/wav', duration = 10 } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        duration?: number;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'Missing audioBase64 payload.' });
        return;
      }

      const ai = getAIClient();

      // Step A: Transcribe spoken audio using dedicated gemini-3.5-transcribe model
      const transcribeResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe all spoken dialogue accurately. If there is only instrumental music or silence with no speech, reply with NO_SPEECH.',
            },
          ],
        },
      });

      const transcript = (transcribeResp.text ?? '').trim();
      if (!transcript || transcript === 'NO_SPEECH') {
        res.json({
          cues: [],
          transcript: '',
          message: 'No spoken speech detected in this clip.',
        });
        return;
      }

      // Step B: Align transcript into timed subtitle cues using gemini-4-hydrogen
      const cuesResp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text:
                `Given this audio clip of total duration ${duration.toFixed(2)} seconds and its transcript:\n` +
                `"${transcript}"\n\n` +
                `Segment the speech into concise, readable video subtitle cues (max 8-10 words per cue) with accurate startSec and endSec timestamps within [0, ${duration.toFixed(2)}].`,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startSec: { type: Type.NUMBER },
                    endSec: { type: Type.NUMBER },
                    text: { type: Type.STRING },
                  },
                  required: ['startSec', 'endSec', 'text'],
                },
              },
            },
            required: ['cues'],
          },
        },
      });

      const parsed = JSON.parse((cuesResp.text ?? '{"cues":[]}').trim()) as {
        cues: Array<{ startSec: number; endSec: number; text: string }>;
      };

      res.json({
        transcript,
        cues: Array.isArray(parsed.cues) ? parsed.cues : [],
      });
    } catch (err) {
      handleAIError(res, err, 'Failed to generate AI subtitles.');
    }
  });

  // 3. AI Object Tracking across sampled frames
  app.post('/api/ai/track-object', async (req, res) => {
    try {
      const { frames, targetX, targetY, targetHint } = req.body as {
        frames?: Array<{ timeSec: number; imageBase64: string; mimeType?: string }>;
        targetX: number;
        targetY: number;
        targetHint?: string;
      };

      if (!frames || frames.length === 0) {
        res.status(400).json({ error: 'At least one frame is required for object tracking.' });
        return;
      }

      const ai = getAIClient();
      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

      frames.forEach((f, idx) => {
        parts.push({ text: `Frame ${idx} at t=${f.timeSec.toFixed(2)}s:` });
        parts.push({
          inlineData: {
            mimeType: f.mimeType || 'image/jpeg',
            data: f.imageBase64,
          },
        });
      });

      const normX = Math.round(((targetX + 1) / 2) * 1000);
      const normY = Math.round(((targetY + 1) / 2) * 1000);

      parts.push({
        text:
          `Track the object located at normalized canvas coordinates (${normX}, ${normY}) in Frame 0 ` +
          `${targetHint ? `(hint: "${targetHint}") ` : ''}` +
          `across all ${frames.length} frames (where (0,0) is top-left, (1000,1000) is bottom-right). ` +
          `For each frame index 0..${frames.length - 1}, output the tracked center (x, y in 0..1000), relative scale (around 1.0), and whether the object is visible.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetLabel: { type: Type.STRING },
              keyframes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    frameIndex: { type: Type.INTEGER },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    scale: { type: Type.NUMBER },
                    visible: { type: Type.BOOLEAN },
                  },
                  required: ['frameIndex', 'x', 'y', 'scale', 'visible'],
                },
              },
            },
            required: ['targetLabel', 'keyframes'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        targetLabel?: string;
        keyframes?: Array<{ frameIndex: number; x: number; y: number; scale: number; visible: boolean }>;
      };

      const mappedKeyframes = (parsed.keyframes || []).map((kf) => {
        const frame = frames[Math.min(frames.length - 1, Math.max(0, kf.frameIndex))];
        return {
          time: frame.timeSec,
          x: Math.max(-1, Math.min(1, (kf.x / 1000) * 2 - 1)),
          y: Math.max(-1, Math.min(1, (kf.y / 1000) * 2 - 1)),
          scale: Math.max(0.25, Math.min(2.5, kf.scale || 1)),
          visible: kf.visible !== false,
        };
      });

      res.json({
        targetLabel: parsed.targetLabel || targetHint || 'Tracked Element',
        keyframes: mappedKeyframes,
      });
    } catch (err) {
      handleAIError(res, err, 'Failed to track object across frames.');
    }
  });

  // 4. 1-Click Desktop Installer Package (Windows / macOS / Linux + HN Logo)
  app.get('/api/install-package', (req, res) => {
    try {
      const rawOrigin = String(req.query.origin || '').trim();
      const fallbackOrigin = `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`;
      let safeBaseUrl = fallbackOrigin;
      if (rawOrigin) {
        try {
          const parsed = new URL(rawOrigin);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            safeBaseUrl = parsed.origin;
          }
        } catch {
          // keep fallbackOrigin
        }
      }

      const iconCandidates = [
        path.resolve(process.cwd(), 'public', 'pwa-192x192.png'),
        path.resolve(process.cwd(), 'dist', 'pwa-192x192.png'),
      ];
      let iconBytes: Buffer | null = null;
      for (const candidate of iconCandidates) {
        if (fs.existsSync(candidate)) {
          iconBytes = fs.readFileSync(candidate);
          break;
        }
      }

      const windowsBat = [
        '@echo off',
        'setlocal',
        'set "APP_DIR=%LOCALAPPDATA%\\NovaStudio"',
        'if not exist "%APP_DIR%" mkdir "%APP_DIR%"',
        'if exist "%~dp0nova-studio-icon.png" copy /Y "%~dp0nova-studio-icon.png" "%APP_DIR%\\nova-studio-icon.png" >nul',
        `set "URL=${safeBaseUrl}"`,
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "$png=\'%APP_DIR%\\nova-studio-icon.png\'; $ico=\'%APP_DIR%\\nova-studio.ico\'; if(Test-Path $png){ $b=[IO.File]::ReadAllBytes($png); $ms=New-Object IO.MemoryStream; $bw=New-Object IO.BinaryWriter($ms); $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$b.Length); $bw.Write([UInt32]22); $bw.Write($b); [IO.File]::WriteAllBytes($ico,$ms.ToArray()) }; $target=\'%URL%\'; $exe=\'\'; $args=\'\'; foreach($p in @(\"$env:ProgramFiles(x86)\\Microsoft\\Edge\\Application\\msedge.exe\",\"$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe\",\"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\",\"$env:ProgramFiles(x86)\\Google\\Chrome\\Application\\chrome.exe\",\"$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe\")){ if(Test-Path $p){ $exe=$p; $args=\\\"--app=$target\\\"; break } }; $ws=New-Object -ComObject WScript.Shell; foreach($dir in @($ws.SpecialFolders(\'Desktop\'),\"$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\")){ $sc=$ws.CreateShortcut(\"$dir\\Nova Studio.lnk\"); if($exe){ $sc.TargetPath=$exe; $sc.Arguments=$args } else { $sc.TargetPath=$target }; if(Test-Path $ico){ $sc.IconLocation=\"$ico,0\" }; $sc.Description=\'Nova Studio Video Editor\'; $sc.Save() }; if($exe){ Start-Process $exe -ArgumentList $args } else { Start-Process $target }"',
        'echo Nova Studio installe sur votre Bureau et Menu Demarrer !',
        'timeout /t 3 >nul',
      ].join('\r\n');

      const linuxSh = [
        '#!/usr/bin/env bash',
        'set -e',
        'APP_DIR="$HOME/.local/share/nova-studio"',
        'mkdir -p "$APP_DIR" "$HOME/.local/share/applications"',
        'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
        'if [ -f "$SCRIPT_DIR/nova-studio-icon.png" ]; then cp "$SCRIPT_DIR/nova-studio-icon.png" "$APP_DIR/icon.png"; fi',
        `URL="${safeBaseUrl}"`,
        'BROWSER=""',
        'for bin in google-chrome chromium chromium-browser microsoft-edge brave-browser; do',
        '  if command -v "$bin" >/dev/null 2>&1; then BROWSER="$bin"; break; fi',
        'done',
        'EXEC_CMD="xdg-open $URL"',
        'if [ -n "$BROWSER" ]; then EXEC_CMD="$BROWSER --app=$URL"; fi',
        'DESKTOP_FILE="$HOME/.local/share/applications/nova-studio.desktop"',
        'cat > "$DESKTOP_FILE" <<EOF',
        '[Desktop Entry]',
        'Version=1.0',
        'Type=Application',
        'Name=Nova Studio',
        'Comment=Editeur video multi-pistes libre et sans filigrane',
        'Exec=$EXEC_CMD',
        'Icon=$APP_DIR/icon.png',
        'Terminal=false',
        'Categories=AudioVideo;Video;AudioVideoEditing;',
        'EOF',
        'chmod +x "$DESKTOP_FILE"',
        'if [ -d "$HOME/Desktop" ]; then cp "$DESKTOP_FILE" "$HOME/Desktop/Nova-Studio.desktop" && chmod +x "$HOME/Desktop/Nova-Studio.desktop"; fi',
        'nohup $EXEC_CMD >/dev/null 2>&1 &',
        'echo "Nova Studio installe !"',
      ].join('\n');

      const macCommand = [
        '#!/usr/bin/env bash',
        `URL="${safeBaseUrl}"`,
        'if [ -d "/Applications/Google Chrome.app" ]; then',
        '  open -a "Google Chrome" --args --app="$URL"',
        'elif [ -d "/Applications/Microsoft Edge.app" ]; then',
        '  open -a "Microsoft Edge" --args --app="$URL"',
        'else',
        '  open "$URL"',
        'fi',
      ].join('\n');

      const launcherHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta http-equiv="refresh" content="0;url=${safeBaseUrl}" /><title>Nova Studio</title><style>body{margin:0;min-height:100vh;background:#0B0D11;color:#F1F3F7;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}a{display:inline-block;margin-top:16px;padding:12px 24px;border-radius:10px;background:#f59e0b;color:#0B0D11;font-weight:700;text-decoration:none}</style></head><body><div><h1>Nova Studio</h1><p>Ouverture de votre studio de montage video...</p><a href="${safeBaseUrl}">Ouvrir Nova Studio</a></div></body></html>`;

      const readmeTxt = [
        'NOVA STUDIO - INSTALLATION EN 1 CLIC',
        '=====================================',
        '',
        'Windows :',
        '  Extrayez le dossier puis double-cliquez sur Install-Nova-Studio-Windows.bat',
        '  -> Cree le raccourci avec le logo HN sur le Bureau + Menu Demarrer',
        '  -> Ouvre immediatement Nova Studio en fenetre autonome.',
        '',
        'macOS :',
        '  Double-cliquez sur Install-Nova-Studio-Mac.command',
        '',
        'Linux :',
        '  Lancez : bash Install-Nova-Studio-Linux.sh',
        '',
        `URL directe : ${safeBaseUrl}`,
      ].join('\r\n');

      const entries: Array<{ name: string; data: Buffer }> = [
        { name: 'Install-Nova-Studio-Windows.bat', data: Buffer.from(windowsBat, 'utf8') },
        { name: 'Install-Nova-Studio-Linux.sh', data: Buffer.from(linuxSh, 'utf8') },
        { name: 'Install-Nova-Studio-Mac.command', data: Buffer.from(macCommand, 'utf8') },
        { name: 'Nova-Studio-Launcher.html', data: Buffer.from(launcherHtml, 'utf8') },
        { name: 'LISEZ-MOI.txt', data: Buffer.from(readmeTxt, 'utf8') },
      ];
      if (iconBytes) {
        entries.push({ name: 'nova-studio-icon.png', data: iconBytes });
      }

      const zipBuf = buildStoreZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="Nova-Studio-Setup.zip"');
      res.send(zipBuf);
    } catch (err) {
      handleAIError(res, err, 'Erreur lors de la creation du package d installation.');
    }
  });

  app.get('/api/latest-installer', async (req, res) => {
    const platform = String(req.query.platform || 'win').toLowerCase();
    const ext = platform === 'mac' ? '.dmg' : platform === 'linux' ? '.appimage' : '.exe';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const ghRes = await fetch(
        'https://api.github.com/repos/akakabdelmalek-svg/nova-studio/releases/latest',
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'NovaStudio/1.0',
            Accept: 'application/vnd.github+json',
          },
        }
      );
      if (!ghRes.ok) {
        res.json({ available: false });
        return;
      }
      const data = (await ghRes.json()) as {
        tag_name?: string;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };
      const match = (data.assets || []).find(
        (a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith(ext) && a.browser_download_url
      );
      if (!match || !match.browser_download_url) {
        res.json({ available: false });
        return;
      }
      res.json({
        available: true,
        downloadUrl: match.browser_download_url,
        fileName: match.name,
        version: data.tag_name || 'latest',
      });
    } catch {
      res.json({ available: false });
    } finally {
      clearTimeout(timeout);
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const viteClientShim = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends (typeof HTMLElement !== 'undefined' ? HTMLElement : Object) {}
`;

    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(viteClientShim);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Nova Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Nova Studio server:', err);
  process.exit(1);
});
