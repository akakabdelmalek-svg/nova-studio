import { AudioSynthPreset, TimelineClip, Track } from '../types/studio';

class NovaAudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSources: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = [];
  private previewSource: { source: AudioBufferSourceNode; assetId: string } | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getBuffer(assetId: string): AudioBuffer | undefined {
    return this.bufferCache.get(assetId);
  }

  public computeWaveform(buffer: AudioBuffer, bars = 80): number[] {
    const channelData = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channelData.length / bars));
    const peaks: number[] = [];
    let maxPeak = 0.001;

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > sum) sum = val;
      }
      peaks.push(sum);
      if (sum > maxPeak) maxPeak = sum;
    }

    return peaks.map((p) => Math.max(0.08, Math.min(1, p / maxPeak)));
  }

  public async decodeUrl(
    assetId: string,
    url: string
  ): Promise<{ buffer: AudioBuffer; waveform: number[]; duration: number }> {
    const cached = this.bufferCache.get(assetId);
    if (cached) {
      return {
        buffer: cached,
        waveform: this.computeWaveform(cached),
        duration: cached.duration,
      };
    }

    const ctx = this.getContext();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(assetId, decoded);
    return {
      buffer: decoded,
      waveform: this.computeWaveform(decoded),
      duration: decoded.duration,
    };
  }

  public generateSynthTrack(
    assetId: string,
    preset: AudioSynthPreset
  ): { buffer: AudioBuffer; url: string; waveform: number[]; duration: number } {
    const sampleRate = 44100;
    const durationMap: Record<AudioSynthPreset, number> = {
      'lofi-chill': 12,
      'lofi-midnight': 12,
      'ambient-pad': 12,
      'ambient-nebula': 10,
      'cinematic-swell': 8,
      'cinematic-pulse': 10,
      'cinematic-riser': 4,
      'electronic-arp': 10,
      'electronic-pluck': 10,
      'acoustic-strum': 10,
      'acoustic-piano': 12,
      'whoosh-fx': 1.6,
      'sub-impact': 1.8,
      'pop-click': 0.45,
      'shutter-click': 0.35,
      'glitch-spark': 0.9,
      'wind-sweeper': 2.4,
      'success-chime': 1.4,
    };

    const duration = durationMap[preset] ?? 10;
    const length = Math.floor(sampleRate * duration);
    const ctx = this.getContext();
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    if (preset === 'lofi-chill' || preset === 'lofi-midnight') {
      const chords =
        preset === 'lofi-chill'
          ? [
              [220.0, 261.63, 329.63, 392.0],
              [174.61, 220.0, 261.63, 329.63],
              [130.81, 196.0, 246.94, 329.63],
              [196.0, 246.94, 293.66, 349.23],
            ]
          : [
              [196.0, 233.08, 293.66, 349.23],
              [155.56, 196.0, 233.08, 293.66],
              [174.61, 207.65, 261.63, 311.13],
              [146.83, 174.61, 220.0, 261.63],
            ];
      const tempo = preset === 'lofi-midnight' ? 0.65 : 0.75;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const barIdx = Math.floor(t / 3) % chords.length;
        const barT = t % 3;
        const chord = chords[barIdx];
        const env = Math.min(1, barT / 0.08) * Math.exp(-barT * 0.48);
        let sig = 0;
        for (let c = 0; c < chord.length; c++) {
          const f = chord[c];
          sig += Math.sin(2 * Math.PI * f * t) * 0.13;
          sig += Math.sin(2 * Math.PI * f * 2 * t) * 0.025;
        }
        const beatT = t % tempo;
        const kick =
          Math.sin(2 * Math.PI * (52 + 80 * Math.exp(-beatT * 28)) * beatT) *
          Math.exp(-beatT * 14) *
          0.24;
        const hat =
          beatT > tempo * 0.48 && beatT < tempo * 0.56
            ? (Math.random() * 2 - 1) * Math.exp(-(beatT - tempo * 0.48) * 60) * 0.06
            : 0;
        const masterEnv = Math.min(1, t / 0.2) * Math.min(1, (duration - t) / 0.5);
        const sample = (sig * env + kick + hat) * masterEnv * 0.75;
        left[i] = sample;
        right[i] = sample * 0.96 + Math.sin(2 * Math.PI * 0.5 * t) * 0.01;
      }
    } else if (preset === 'ambient-pad' || preset === 'ambient-nebula') {
      const freqs =
        preset === 'ambient-pad'
          ? [146.83, 220.0, 293.66, 369.99, 440.0]
          : [98.0, 146.83, 185.0, 233.08, 293.66];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const masterEnv = Math.min(1, t / 1.2) * Math.min(1, (duration - t) / 1.4);
        let l = 0;
        let r = 0;
        for (let k = 0; k < freqs.length; k++) {
          const detune = 1 + (k % 2 === 0 ? 0.0028 : -0.0028);
          l += Math.sin(2 * Math.PI * freqs[k] * t + Math.sin(t * 0.4 + k) * 0.5) * 0.12;
          r += Math.sin(2 * Math.PI * freqs[k] * detune * t + Math.cos(t * 0.35 + k) * 0.5) * 0.12;
        }
        left[i] = l * masterEnv;
        right[i] = r * masterEnv;
      }
    } else if (preset === 'cinematic-swell' || preset === 'cinematic-pulse') {
      const freqs =
        preset === 'cinematic-swell'
          ? [65.41, 130.81, 196.0, 261.63]
          : [55.0, 110.0, 164.81, 220.0, 329.63];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const progress = t / duration;
        const swell =
          preset === 'cinematic-swell'
            ? Math.sin(Math.PI * Math.pow(progress, 0.85))
            : (0.45 + 0.55 * Math.pow(Math.abs(Math.sin(Math.PI * t * 2)), 2)) *
              Math.min(1, t / 0.4) *
              Math.min(1, (duration - t) / 0.6);
        let sig = 0;
        for (let k = 0; k < freqs.length; k++) {
          sig += Math.sin(2 * Math.PI * freqs[k] * t) * (0.18 / (k + 1));
        }
        const noise = (Math.random() * 2 - 1) * 0.035 * swell;
        left[i] = (sig * swell + noise) * 0.85;
        right[i] = (sig * swell * 0.98 - noise) * 0.85;
      }
    } else if (preset === 'cinematic-riser') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const p = t / duration;
        const freq = 90 + Math.pow(p, 2.2) * 950;
        const env = Math.pow(p, 1.5) * Math.min(1, (duration - t) / 0.08);
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.35 + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.15;
        const hiss = (Math.random() * 2 - 1) * 0.18 * p;
        left[i] = (tone + hiss) * env;
        right[i] = (tone * 0.97 - hiss) * env;
      }
    } else if (preset === 'electronic-arp' || preset === 'electronic-pluck') {
      const notes =
        preset === 'electronic-arp'
          ? [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 440.0, 523.25]
          : [220.0, 261.63, 329.63, 440.0];
      const stepSec = preset === 'electronic-arp' ? 0.18 : 0.35;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const stepIdx = Math.floor(t / stepSec) % notes.length;
        const stepT = t % stepSec;
        const freq = notes[stepIdx];
        const env = Math.exp(-stepT * (preset === 'electronic-arp' ? 11 : 7));
        const saw = ((t * freq) % 1) * 2 - 1;
        const sine = Math.sin(2 * Math.PI * freq * t);
        const master = Math.min(1, t / 0.1) * Math.min(1, (duration - t) / 0.4);
        const sig = (sine * 0.32 + saw * 0.12) * env * master;
        left[i] = sig;
        right[i] = sig * 0.94;
      }
    } else if (preset === 'acoustic-strum' || preset === 'acoustic-piano') {
      const chords = [
        [261.63, 329.63, 392.0],
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
        [196.0, 246.94, 293.66],
      ];
      const barLen = 2.5;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const barIdx = Math.floor(t / barLen) % chords.length;
        const localT = t % barLen;
        const chord = chords[barIdx];
        let sig = 0;
        chord.forEach((f, idx) => {
          const offset = preset === 'acoustic-strum' ? idx * 0.035 : idx * 0.01;
          if (localT >= offset) {
            const nt = localT - offset;
            const env = Math.exp(-nt * (preset === 'acoustic-strum' ? 2.1 : 1.4));
            sig +=
              (Math.sin(2 * Math.PI * f * nt) * 0.22 +
                Math.sin(2 * Math.PI * f * 2 * nt) * 0.08 * Math.exp(-nt * 3)) *
              env;
          }
        });
        const master = Math.min(1, t / 0.05) * Math.min(1, (duration - t) / 0.4);
        left[i] = sig * master * 0.85;
        right[i] = sig * master * 0.85;
      }
    } else if (preset === 'whoosh-fx' || preset === 'wind-sweeper') {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const norm = t / duration;
        const env = Math.sin(Math.PI * norm);
        const white = Math.random() * 2 - 1;
        const cutoff =
          preset === 'whoosh-fx'
            ? 0.05 + 0.45 * Math.sin(Math.PI * norm)
            : 0.03 + 0.22 * Math.sin(Math.PI * norm);
        lastOut = lastOut + cutoff * (white - lastOut);
        left[i] = lastOut * env * 0.82;
        right[i] = lastOut * env * 0.79;
      }
    } else if (preset === 'sub-impact') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 2.4);
        const freq = 38 + 110 * Math.exp(-t * 14);
        const boom = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
        const transient = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.35;
        left[i] = Math.max(-1, Math.min(1, boom + transient));
        right[i] = left[i];
      }
    } else if (preset === 'shutter-click') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const c1 = (Math.random() * 2 - 1) * Math.exp(-t * 120);
        const c2 = t > 0.07 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.07) * 140) : 0;
        const sig = (c1 + c2 * 0.8) * 0.85;
        left[i] = sig;
        right[i] = sig;
      }
    } else if (preset === 'glitch-spark') {
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const slice = Math.floor(t * 26);
        const freq = 220 + ((slice * 173) % 1400);
        const env = Math.sin(Math.PI * (t / duration));
        const bit = Math.round(Math.sin(2 * Math.PI * freq * t) * 4) / 4;
        left[i] = bit * env * 0.45;
        right[i] = -bit * env * 0.45;
      }
    } else if (preset === 'success-chime') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sig = 0;
        notes.forEach((f, idx) => {
          const onset = idx * 0.11;
          if (t >= onset) {
            const nt = t - onset;
            sig += Math.sin(2 * Math.PI * f * nt) * Math.exp(-nt * 4.5) * 0.25;
          }
        });
        left[i] = sig;
        right[i] = sig;
      }
    } else {
      // pop-click
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 22);
        const freq = 520 + 680 * Math.exp(-t * 35);
        const sig = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
        left[i] = sig;
        right[i] = sig;
      }
    }

    this.bufferCache.set(assetId, buffer);
    const wavBlob = this.audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    return {
      buffer,
      url,
      waveform: this.computeWaveform(buffer),
      duration,
    };
  }

  public stopPreview(): void {
    if (this.previewSource) {
      try {
        this.previewSource.source.stop();
        this.previewSource.source.disconnect();
      } catch {
        // ignore
      }
      this.previewSource = null;
    }
  }

  public togglePreview(assetId: string, onEnd?: () => void): boolean {
    if (this.previewSource && this.previewSource.assetId === assetId) {
      this.stopPreview();
      return false;
    }
    this.stopPreview();
    const buffer = this.bufferCache.get(assetId);
    if (!buffer) return false;
    const ctx = this.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.75;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.onended = () => {
      if (this.previewSource?.source === source) {
        this.previewSource = null;
        onEnd?.();
      }
    };
    source.start(0);
    this.previewSource = { source, assetId };
    return true;
  }

  public audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/wav' });
  }

  public stopAll(): void {
    for (const item of this.activeSources) {
      try {
        item.source.stop();
        item.source.disconnect();
        item.gain.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
  }

  public startPlaybackAt(
    playheadTime: number,
    clips: TimelineClip[],
    tracks: Track[],
    masterMuted: boolean,
    masterVolume: number,
    destination?: AudioNode
  ): void {
    this.stopAll();
    if (masterMuted) return;

    const ctx = this.getContext();
    const targetNode = destination || ctx.destination;
    const now = ctx.currentTime;

    for (const clip of clips) {
      if (clip.kind !== 'audio' || clip.muted) continue;
      const track = tracks.find((t) => t.id === clip.trackId);
      if (track?.muted) continue;
      if (!clip.assetId) continue;

      const buffer = this.bufferCache.get(clip.assetId);
      if (!buffer) continue;

      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd <= playheadTime) continue;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.25, Math.min(4, clip.speed));

      const gain = ctx.createGain();
      const baseVol = (clip.volume / 100) * masterVolume;

      const delay = Math.max(0, clip.startTime - playheadTime);
      const startAt = now + delay;
      const elapsedInClip = Math.max(0, playheadTime - clip.startTime);
      const offsetInSource = (clip.sourceOffset + elapsedInClip * clip.speed) % buffer.duration;
      const remainingDuration = Math.max(0.01, clipEnd - Math.max(playheadTime, clip.startTime));

      gain.gain.setValueAtTime(baseVol, startAt);

      if (clip.fadeIn > 0 && elapsedInClip < clip.fadeIn) {
        const fadeRemaining = clip.fadeIn - elapsedInClip;
        const startRatio = elapsedInClip / clip.fadeIn;
        gain.gain.setValueAtTime(baseVol * startRatio, startAt);
        gain.gain.linearRampToValueAtTime(baseVol, startAt + fadeRemaining);
      }

      if (clip.fadeOut > 0 && remainingDuration > 0.05) {
        const fadeStartOffset = Math.max(0, remainingDuration - clip.fadeOut);
        gain.gain.setValueAtTime(baseVol, startAt + fadeStartOffset);
        gain.gain.linearRampToValueAtTime(0.0001, startAt + remainingDuration);
      }

      source.connect(gain);
      gain.connect(targetNode);

      source.start(startAt, offsetInSource, remainingDuration / clip.speed + 0.05);
      this.activeSources.push({ source, gain });
    }
  }
}

export const audioEngine = new NovaAudioEngine();
