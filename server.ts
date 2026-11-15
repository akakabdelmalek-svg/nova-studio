import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);

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
