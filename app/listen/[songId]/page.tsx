'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import { formatTimestamp } from '@/lib/auth';
import styles from './listen.module.css';

// ─── Colour helpers (mirrored from version page) ───────────────────────────

type Rgb = { r: number; g: number; b: number };

const DEFAULT_REACTIVE_PRIMARY: Rgb = { r: 192, g: 57, b: 43 };
const DEFAULT_REACTIVE_SECONDARY: Rgb = { r: 240, g: 228, b: 140 };

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

function mixColor(start: Rgb, end: Rgb, amount: number, alpha: number) {
  const r = Math.round(start.r + (end.r - start.r) * amount);
  const g = Math.round(start.g + (end.g - start.g) * amount);
  const b = Math.round(start.b + (end.b - start.b) * amount);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function brighten(c: Rgb, a: number): Rgb {
  return { r: clamp(Math.round(c.r + (255 - c.r) * a), 0, 255), g: clamp(Math.round(c.g + (255 - c.g) * a), 0, 255), b: clamp(Math.round(c.b + (255 - c.b) * a), 0, 255) };
}
function darken(c: Rgb, a: number): Rgb {
  return { r: clamp(Math.round(c.r * (1 - a)), 0, 255), g: clamp(Math.round(c.g * (1 - a)), 0, 255), b: clamp(Math.round(c.b * (1 - a)), 0, 255) };
}

async function extractPaletteFromImageUrl(url: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read artwork colors.'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No canvas context');
  canvas.width = 40; canvas.height = 40;
  ctx.drawImage(image, 0, 0, 40, 40);
  const { data } = ctx.getImageData(0, 0, 40, 40);
  let sR = 0, sG = 0, sB = 0, sW = 0, soR = 0, soG = 0, soB = 0, soW = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3] / 255;
    if (a < 0.5) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const bri = (r + g + b) / 3 / 255;
    const vW = sat * 0.8 + bri * 0.2 + 0.1;
    const sfW = (1 - sat) * 0.35 + bri * 0.65 + 0.1;
    sR += r * vW; sG += g * vW; sB += b * vW; sW += vW;
    soR += r * sfW; soG += g * sfW; soB += b * sfW; soW += sfW;
  }
  const base = sW ? { r: Math.round(sR / sW), g: Math.round(sG / sW), b: Math.round(sB / sW) } : DEFAULT_REACTIVE_PRIMARY;
  const comp = soW ? { r: Math.round(soR / soW), g: Math.round(soG / soW), b: Math.round(soB / soW) } : DEFAULT_REACTIVE_SECONDARY;
  return { primary: brighten(base, 0.08), secondary: brighten(comp, 0.18), shadow: darken(base, 0.42) };
}

// ─── Precompute frequency data via OfflineAudioContext (mobile-safe) ────────

async function precomputeFrequencyFrames(audioBuffer: AudioBuffer) {
  const fps = 24;
  const totalFrames = Math.ceil(audioBuffer.duration * fps);
  const fftSize = 2048;
  const freqBins = fftSize / 2;
  const freqFrames: Uint8Array[] = [];
  const timeFrames: Uint8Array[] = [];
  const chunkSize = 60;

  for (let chunkStart = 0; chunkStart < totalFrames; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, totalFrames);
    const chunkDuration = (chunkEnd - chunkStart) / fps;
    const startTime = chunkStart / fps;
    const { sampleRate } = audioBuffer;
    const frameSamples = Math.ceil(sampleRate / fps);
    const chunkSamples = (chunkEnd - chunkStart) * frameSamples;
    try {
      const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, chunkSamples, sampleRate);
      const src = offline.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(offline.destination);
      src.start(0, startTime, chunkDuration);
      const rendered = await offline.startRendering();
      const channelData = rendered.getChannelData(0);
      for (let f = chunkStart; f < chunkEnd; f++) {
        const off = (f - chunkStart) * frameSamples;
        const slice = channelData.slice(off, off + fftSize);
        const tf = new Uint8Array(fftSize);
        for (let i = 0; i < fftSize; i++) tf[i] = Math.round(((slice[i] ?? 0) + 1) * 127.5);
        timeFrames.push(tf);
        const ff = new Uint8Array(freqBins);
        const bkt = Math.floor(fftSize / freqBins);
        for (let b = 0; b < freqBins; b++) {
          let e = 0;
          for (let s = 0; s < bkt; s++) { const sm = slice[b * bkt + s] ?? 0; e += sm * sm; }
          ff[b] = Math.min(255, Math.round(Math.sqrt(e / bkt) * 600));
        }
        freqFrames.push(ff);
      }
    } catch {
      for (let f = chunkStart; f < chunkEnd; f++) {
        freqFrames.push(new Uint8Array(freqBins));
        timeFrames.push(new Uint8Array(fftSize).fill(128));
      }
    }
    await new Promise(r => setTimeout(r, 0));
  }
  return { freqFrames, timeFrames, fps };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PublicSongData {
  song: { id: string; title: string; image_url: string | null; workspace_name: string | null };
  version: { id: string; version_number: number; label: string | null; display_name?: string; file_path: string; audioUrl: string | null };
}

// ─── Inner component ────────────────────────────────────────────────────────

function ListenPageInner() {
  const params = useParams();
  const songId = params.songId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioLoadedRef = useRef(false);
  const nativeAudioFallbackRef = useRef(false);
  const nativeAudioCleanupRef = useRef<(() => void) | null>(null);
  const waveLoadIdRef = useRef(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);

  // Reactive canvas
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
  const reactiveAudioContextRef = useRef<AudioContext | null>(null);
  const reactiveAnalyserRef = useRef<AnalyserNode | null>(null);
  const reactiveSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reactiveSourceElementRef = useRef<HTMLAudioElement | null>(null);
  const reactiveAnimFrameRef = useRef<number | null>(null);
  const reactiveRefreshTimeoutRef = useRef<number | null>(null);
  const reactivePlayingRef = useRef(false);
  const precomputedFreqRef = useRef<{ freqFrames: Uint8Array[]; timeFrames: Uint8Array[]; fps: number } | null>(null);

  const [data, setData] = useState<PublicSongData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [waveErr, setWaveErr] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveReloadNonce, setWaveReloadNonce] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reactivePalette, setReactivePalette] = useState(() => ({
    primary: DEFAULT_REACTIVE_PRIMARY,
    secondary: DEFAULT_REACTIVE_SECONDARY,
    shadow: darken(DEFAULT_REACTIVE_PRIMARY, 0.42),
  }));

  // ── Fetch public song data ────────────────────────────────────────────────
  useEffect(() => {
    if (!songId) return;
    fetch(`/api/public/song/${songId}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'This link is no longer available.' : 'Failed to load.');
        return r.json() as Promise<PublicSongData>;
      })
      .then(d => {
        setData(d);
        if (d.version.audioUrl) setAudioUrl(d.version.audioUrl);
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load.'));
  }, [songId]);

  // ── Extract palette from artwork ──────────────────────────────────────────
  useEffect(() => {
    if (!data?.song.image_url) return;
    extractPaletteFromImageUrl(data.song.image_url)
      .then(p => setReactivePalette(p))
      .catch(() => {});
  }, [data?.song.image_url]);

  // ── Reactive canvas drawing ───────────────────────────────────────────────
  const getCanvases = useCallback(() =>
    [
      { canvas: desktopCanvasRef.current },
      { canvas: mobileCanvasRef.current },
    ].filter((e): e is { canvas: HTMLCanvasElement } => Boolean(e.canvas)),
  []);

  const stopReactiveDrawing = useCallback(() => {
    if (reactiveAnimFrameRef.current !== null) {
      cancelAnimationFrame(reactiveAnimFrameRef.current);
      reactiveAnimFrameRef.current = null;
    }
    reactivePlayingRef.current = false;
  }, []);

  const drawReactiveIdle = useCallback(() => {
    const { primary, secondary } = reactivePalette;
    for (const { canvas } of getCanvases()) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      const w = canvas.clientWidth * (window.devicePixelRatio || 1);
      const h = canvas.clientHeight * (window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));
      const bars = 80;
      const barW = canvas.width / bars;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, mixColor(primary, secondary, 0.18, 0.16));
      gradient.addColorStop(1, mixColor(primary, secondary, 0.82, 0.08));
      ctx.fillStyle = gradient;
      for (let i = 0; i < bars; i++) {
        const x = i / bars;
        const h2 = canvas.height * (0.04 + Math.sin(x * Math.PI) * 0.12 + Math.sin(x * Math.PI * 7) * 0.04);
        const y = (canvas.height - h2) / 2;
        ctx.fillRect(i * barW, y, Math.max(1, barW - 2), h2);
      }
    }
  }, [reactivePalette, getCanvases]);

  const startReactiveDrawing = useCallback(() => {
    const analyser = reactiveAnalyserRef.current;
    const precomputed = precomputedFreqRef.current;
    if (!analyser && !precomputed) return;

    const fftSize = analyser ? analyser.fftSize : 2048;
    const freqBins = analyser ? analyser.frequencyBinCount : 1024;
    const frequencyData = new Uint8Array(freqBins);
    const { primary, secondary } = reactivePalette;
    let lastFrameTime = 0;
    const targetFps = precomputed ? precomputed.fps : 30;
    const frameMs = 1000 / targetFps;

    function draw(now: number) {
      if (now - lastFrameTime < frameMs - 2) {
        reactiveAnimFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = now;

      if (analyser) {
        analyser.getByteFrequencyData(frequencyData);
      } else if (precomputed) {
        const ws = wavesurferRef.current;
        const audio = audioRef.current;
        const ct = ws ? ws.getCurrentTime?.() : (audio?.currentTime ?? 0);
        const frameIdx = Math.min(Math.floor((ct || 0) * precomputed.fps), precomputed.freqFrames.length - 1);
        const frame = precomputed.freqFrames[Math.max(0, frameIdx)];
        if (frame) frequencyData.set(frame.slice(0, freqBins));
      }

      for (const { canvas } of getCanvases()) {
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        const w = canvas.clientWidth * (window.devicePixelRatio || 1);
        const h = canvas.clientHeight * (window.devicePixelRatio || 1);
        if (canvas.width !== Math.floor(w) || canvas.height !== Math.floor(h)) {
          canvas.width = Math.max(1, Math.floor(w));
          canvas.height = Math.max(1, Math.floor(h));
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 80;
        const barW = canvas.width / bars;
        const binStep = Math.floor(freqBins / bars);
        for (let i = 0; i < bars; i++) {
          const bin = Math.min(i * binStep, freqBins - 1);
          const raw = (frequencyData[bin] ?? 0) / 255;
          const boosted = Math.pow(raw, 0.65);
          const bh = Math.max(2, boosted * canvas.height * 0.92);
          const x = i * barW;
          const y = (canvas.height - bh) / 2;
          const t = i / bars;
          const col = mixColor(primary, secondary, t, 0.55 + boosted * 0.4);
          ctx.fillStyle = col;
          ctx.fillRect(x, y, Math.max(1, barW - 2), bh);
        }
      }

      reactiveAnimFrameRef.current = requestAnimationFrame(draw);
    }

    reactivePlayingRef.current = true;
    reactiveAnimFrameRef.current = requestAnimationFrame(draw);
  }, [reactivePalette, getCanvases]);

  useEffect(() => {
    drawReactiveIdle();
  }, [drawReactiveIdle]);

  // ── Ensure reactive audio graph (desktop only — uses createMediaElementSource) ──
  const ensureReactiveAudioGraph = useCallback(async (audio: HTMLAudioElement) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return false;

    if (reactiveSourceElementRef.current && reactiveSourceElementRef.current !== audio) {
      if (reactiveAudioContextRef.current) await reactiveAudioContextRef.current.close();
      reactiveAudioContextRef.current = null;
      reactiveSourceRef.current = null;
      reactiveAnalyserRef.current = null;
      reactiveSourceElementRef.current = null;
    }
    if (!reactiveAudioContextRef.current) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return false;
      reactiveAudioContextRef.current = new Ctor();
    }
    if (!reactiveSourceRef.current) {
      reactiveSourceRef.current = reactiveAudioContextRef.current.createMediaElementSource(audio);
      reactiveSourceElementRef.current = audio;
      reactiveAnalyserRef.current = reactiveAudioContextRef.current.createAnalyser();
      reactiveAnalyserRef.current.fftSize = 2048;
      reactiveAnalyserRef.current.smoothingTimeConstant = 0.82;
      reactiveSourceRef.current.connect(reactiveAnalyserRef.current);
      reactiveAnalyserRef.current.connect(reactiveAudioContextRef.current.destination);
    }
    if (reactiveAudioContextRef.current.state === 'suspended') {
      await reactiveAudioContextRef.current.resume();
    }
    return true;
  }, []);

  // ── Native audio events ───────────────────────────────────────────────────
  const attachNativeAudioEvents = useCallback((audio: HTMLAudioElement, loadId: number) => {
    nativeAudioCleanupRef.current?.();
    const upDur = () => { if (loadId !== waveLoadIdRef.current) return; if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration); };
    const upTime = () => { if (loadId === waveLoadIdRef.current) setCurrentTime(audio.currentTime || 0); };
    const onPlay = () => { if (loadId !== waveLoadIdRef.current) return; setIsPlaying(true); startReactiveDrawing(); };
    const onPause = () => { if (loadId !== waveLoadIdRef.current) return; setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); };
    const onEnded = () => { if (loadId !== waveLoadIdRef.current) return; setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); };
    audio.addEventListener('loadedmetadata', upDur);
    audio.addEventListener('durationchange', upDur);
    audio.addEventListener('timeupdate', upTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    nativeAudioCleanupRef.current = () => {
      audio.removeEventListener('loadedmetadata', upDur);
      audio.removeEventListener('durationchange', upDur);
      audio.removeEventListener('timeupdate', upTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [startReactiveDrawing, stopReactiveDrawing, drawReactiveIdle]);

  const playNativeAudioFallback = useCallback(async (url: string) => {
    let audio = nativeAudioRef.current;
    if (!audio) { audio = new Audio(); audio.preload = 'metadata'; nativeAudioRef.current = audio; }
    nativeAudioFallbackRef.current = true;
    audioRef.current = audio;
    const loadId = ++waveLoadIdRef.current;
    attachNativeAudioEvents(audio, loadId);
    audio.src = url;
    setIsReady(true);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      try {
        await ensureReactiveAudioGraph(audio);
        startReactiveDrawing();
      } catch {}
    } else {
      // Precompute on mobile
      try {
        const buf = await fetch(url).then(r => r.arrayBuffer());
        const ctx = new OfflineAudioContext(1, 1, 44100);
        const decoded = await ctx.decodeAudioData(buf);
        precomputedFreqRef.current = await precomputeFrequencyFrames(decoded);
        startReactiveDrawing();
      } catch {}
    }
    setIsPlaying(true);
    await audio.play();
  }, [attachNativeAudioEvents, ensureReactiveAudioGraph, startReactiveDrawing]);

  // ── WaveSurfer init ───────────────────────────────────────────────────────
  const initWaveSurfer = useCallback(async (container: HTMLDivElement, url: string) => {
    const loadId = ++waveLoadIdRef.current;
    if (wavesurferRef.current) { try { wavesurferRef.current.destroy(); } catch {} wavesurferRef.current = null; }

    const WaveSurfer = (await import('wavesurfer.js')).default;
    if (loadId !== waveLoadIdRef.current) return;

    const ws = WaveSurfer.create({
      container,
      waveColor: 'rgba(244,237,228,0.18)',
      progressColor: '#C0392B',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      height: 80,
      normalize: true,
      interact: true,
      fetchParams: { credentials: 'omit' },
    });

    const internalAudio = (ws as any).getMediaElement?.() ?? null;
    if (internalAudio) { audioRef.current = internalAudio; }

    ws.on('ready', () => {
      if (loadId !== waveLoadIdRef.current) return;
      setIsReady(true);
      setDuration(ws.getDuration());
      const audio = (ws as any).getMediaElement?.() ?? null;
      if (audio) audioRef.current = audio;
    });
    ws.on('audioprocess', (t: number) => { if (loadId === waveLoadIdRef.current) setCurrentTime(t); });
    ws.on('seeking', (t: number) => { if (loadId === waveLoadIdRef.current) setCurrentTime(t); });
    ws.on('play', () => {
      if (loadId !== waveLoadIdRef.current) return;
      setIsPlaying(true);
      const audio = (ws as any).getMediaElement?.() ?? null;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (audio && !isMobile) {
        ensureReactiveAudioGraph(audio).then(ok => { if (ok) startReactiveDrawing(); }).catch(() => {});
      }
    });
    ws.on('pause', () => { if (loadId === waveLoadIdRef.current) { setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); } });
    ws.on('finish', () => { if (loadId === waveLoadIdRef.current) { setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); } });
    ws.on('error', async (e: Error) => {
      if (loadId !== waveLoadIdRef.current) return;
      setWaveErr('Could not load audio. Tap to try again.');
      try { await playNativeAudioFallback(url); } catch {}
    });

    wavesurferRef.current = ws;
  }, [ensureReactiveAudioGraph, startReactiveDrawing, stopReactiveDrawing, drawReactiveIdle, playNativeAudioFallback]);

  // ── Mount WaveSurfer when audioUrl is ready ───────────────────────────────
  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;
    void initWaveSurfer(waveformRef.current, audioUrl);
    return () => {
      if (wavesurferRef.current) { try { wavesurferRef.current.destroy(); } catch {} wavesurferRef.current = null; }
      nativeAudioCleanupRef.current?.();
      stopReactiveDrawing();
    };
  }, [audioUrl, waveReloadNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play handler ──────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const ws = wavesurferRef.current;
    const audio = audioRef.current;
    if (!audioUrl) return;

    if (nativeAudioFallbackRef.current && audio) {
      if (audio.paused) { setIsPlaying(true); void audio.play(); }
      else { setIsPlaying(false); audio.pause(); }
      return;
    }
    if (!ws) return;
    if (!audioLoadedRef.current) {
      audioLoadedRef.current = true;
      setIsPlaying(true);
      void ws.load(audioUrl).catch(async (err: Error) => {
        const msg = err?.message || String(err);
        setIsPlaying(false);
        if (!msg.toLowerCase().includes('aborted')) {
          try { await playNativeAudioFallback(audioUrl); } catch (fe) {
            setWaveErr(fe instanceof Error ? fe.message : 'Failed to load audio.');
          }
        }
      });
      ws.once('ready', () => { void ws.play(); });
    } else {
      setIsPlaying(prev => !prev);
      ws.playPause();
    }
  }, [audioUrl, playNativeAudioFallback]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopReactiveDrawing();
      if (reactiveAudioContextRef.current) { reactiveAudioContextRef.current.close().catch(() => {}); }
    };
  }, [stopReactiveDrawing]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorInner}>
          <span className={styles.errorWordmark}>The Song Room</span>
          <p className={styles.errorMsg}>{loadError}</p>
          <a className={styles.errorCta} href="https://song-room.live">Learn more →</a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingWordmark}>The Song Room</span>
      </div>
    );
  }

  const { song, version } = data;

  return (
    <div className={styles.page}>
      <div
        ref={heroRef}
        className={styles.hero}
        style={song.image_url ? { backgroundImage: `url(${song.image_url})` } : undefined}
      >
        {/* Reactive canvases */}
        <canvas ref={mobileCanvasRef} className={styles.reactiveCanvasMobile} aria-hidden="true" />
        <div ref={heroOverlayRef} className={styles.heroOverlay}>
          <canvas ref={desktopCanvasRef} className={styles.reactiveCanvasDesktop} aria-hidden="true" />

          {/* Top bar */}
          <div className={styles.topBar}>
            <a href="https://song-room.live" className={styles.wordmark} target="_blank" rel="noopener noreferrer">
              The Song Room
            </a>
            <a href="https://song-room.live" className={styles.ctaBtn} target="_blank" rel="noopener noreferrer">
              Start collaborating free →
            </a>
          </div>

          {/* Player content */}
          <div className={styles.playerContent}>
            {/* Left: info + controls + waveform */}
            <div className={styles.playerLeft}>
              <div className={styles.metaRow}>
                {song.workspace_name && (
                  <span className={styles.workspaceTag}>
                    <span className={styles.workspaceDot} />
                    {song.workspace_name}
                  </span>
                )}
              </div>
              <h1 className={styles.songTitle}>{song.title}</h1>
              <div className={styles.versionMeta}>
                <span className={styles.versionPill}>
                  {version.display_name ?? `Version ${version.version_number}`}
                </span>
                {duration > 0 && (
                  <>
                    <span className={styles.metaDot}>·</span>
                    <span className={styles.durationLabel}>{formatTimestamp(Math.floor(duration))}</span>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className={styles.controls}>
                <button
                  className={styles.playBtn}
                  onClick={handlePlay}
                  disabled={!audioUrl}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying
                    ? <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5"/><rect x="12" y="2" width="5" height="16" rx="1.5"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z"/></svg>
                  }
                </button>
                <span className={styles.timeDisplay}>
                  <span className={styles.timeCurrent}>{formatTimestamp(Math.floor(currentTime))}</span>
                  <span className={styles.timeSep}> / </span>
                  {formatTimestamp(Math.floor(duration))}
                </span>
                {waveErr && (
                  <span className={styles.waveErrMsg}>⚠ {waveErr}</span>
                )}
              </div>

              {/* Waveform */}
              <div className={styles.waveformWrap}>
                <div ref={waveformRef} className={styles.waveform} style={{ height: 80, minHeight: 80 }} />
                {!audioLoadedRef.current && (
                  <p className={styles.waveHint}>press play to load audio</p>
                )}
              </div>
            </div>

            {/* Right: artwork */}
            <div className={styles.artwork}>
              {song.image_url ? (
                <img src={song.image_url} alt={song.title} className={styles.artworkImg} />
              ) : (
                <div className={styles.artworkPlaceholder}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                    <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.2)"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <span className={styles.footerText}>
              Shared via{' '}
              <a href="https://song-room.live" className={styles.footerLink} target="_blank" rel="noopener noreferrer">
                The Song Room
              </a>
              {' '}— music collaboration for serious artists
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListenPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0E0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Thunder, sans-serif', fontSize: 18, color: '#F0E48C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>The Song Room</span>
      </div>
    }>
      <ListenPageInner />
    </Suspense>
  );
}
