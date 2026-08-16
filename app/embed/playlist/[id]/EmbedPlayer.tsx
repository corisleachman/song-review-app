'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './embed.module.css';

// ── Colour + frequency helpers (ported from the /listen playlist player) ──
type Rgb = { r: number; g: number; b: number };
const DEFAULT_PRIMARY: Rgb = { r: 192, g: 57, b: 43 };
const DEFAULT_SECONDARY: Rgb = { r: 240, g: 228, b: 140 };
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function mixColor(s: Rgb, e: Rgb, amt: number, a: number) {
  const r = Math.round(s.r + (e.r - s.r) * amt), g = Math.round(s.g + (e.g - s.g) * amt), b = Math.round(s.b + (e.b - s.b) * amt);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function brighten(c: Rgb, a: number): Rgb { return { r: clamp(Math.round(c.r + (255 - c.r) * a), 0, 255), g: clamp(Math.round(c.g + (255 - c.g) * a), 0, 255), b: clamp(Math.round(c.b + (255 - c.b) * a), 0, 255) }; }

async function extractPalette(url: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('nope')); img.src = url;
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no ctx');
  canvas.width = 40; canvas.height = 40; ctx.drawImage(image, 0, 0, 40, 40);
  const { data } = ctx.getImageData(0, 0, 40, 40);
  let sR = 0, sG = 0, sB = 0, sW = 0, soR = 0, soG = 0, soB = 0, soW = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3] / 255;
    if (a < 0.5) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const bri = (r + g + b) / 3 / 255;
    const vW = sat * 0.8 + bri * 0.2 + 0.1, sfW = (1 - sat) * 0.35 + bri * 0.65 + 0.1;
    sR += r * vW; sG += g * vW; sB += b * vW; sW += vW;
    soR += r * sfW; soG += g * sfW; soB += b * sfW; soW += sfW;
  }
  const base = sW ? { r: Math.round(sR / sW), g: Math.round(sG / sW), b: Math.round(sB / sW) } : DEFAULT_PRIMARY;
  const comp = soW ? { r: Math.round(soR / soW), g: Math.round(soG / soW), b: Math.round(soB / soW) } : DEFAULT_SECONDARY;
  return { primary: brighten(base, 0.08), secondary: brighten(comp, 0.18) };
}

async function precomputeFrequencyFrames(audioBuffer: AudioBuffer) {
  const fps = 24;
  const totalFrames = Math.ceil(audioBuffer.duration * fps);
  const fftSize = 2048; const freqBins = fftSize / 2;
  const freqFrames: Uint8Array[] = []; const chunkSize = 60;
  for (let chunkStart = 0; chunkStart < totalFrames; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, totalFrames);
    const chunkDuration = (chunkEnd - chunkStart) / fps;
    const startTime = chunkStart / fps;
    const { sampleRate } = audioBuffer;
    const frameSamples = Math.ceil(sampleRate / fps);
    const chunkSamples = (chunkEnd - chunkStart) * frameSamples;
    try {
      const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, chunkSamples, sampleRate);
      const src = offline.createBufferSource(); src.buffer = audioBuffer; src.connect(offline.destination);
      src.start(0, startTime, chunkDuration);
      const rendered = await offline.startRendering();
      const channelData = rendered.getChannelData(0);
      for (let f = chunkStart; f < chunkEnd; f++) {
        const off = (f - chunkStart) * frameSamples;
        const slice = channelData.slice(off, off + fftSize);
        const ff = new Uint8Array(freqBins);
        const bkt = Math.floor(fftSize / freqBins);
        for (let b = 0; b < freqBins; b++) {
          let e = 0; for (let s = 0; s < bkt; s++) { const sm = slice[b * bkt + s] ?? 0; e += sm * sm; }
          ff[b] = Math.min(255, Math.round(Math.sqrt(e / bkt) * 600));
        }
        freqFrames.push(ff);
      }
    } catch {
      for (let f = chunkStart; f < chunkEnd; f++) freqFrames.push(new Uint8Array(freqBins));
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  return { freqFrames, fps };
}

function isMobileUA() { return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); }
function fmt(s: number) { if (!isFinite(s) || s < 0) return '0:00'; const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

type Track = { id: string; title: string; image_url: string | null; audioUrl: string | null };
type Data = { playlist: { id: string; title: string; workspace_name: string | null }; tracks: Track[] };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function EmbedPlayer({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [cur, setCur] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [palette, setPalette] = useState<{ primary: Rgb; secondary: Rgb }>({ primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY });
  const paletteRef = useRef(palette); paletteRef.current = palette;

  const wsRef = useRef<any>(null);
  const waveHostRef = useRef<HTMLDivElement | null>(null);
  const eqCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const precomputedRef = useRef<{ freqFrames: Uint8Array[]; fps: number } | null>(null);
  const animRef = useRef<number | null>(null);
  const audioLoadedRef = useRef(false);

  const curRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const titleRef = useRef('');
  const imageRef = useRef('');
  const goNextRef = useRef<() => void>(() => {});
  const goPrevRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    fetch(`/api/public/playlist/${id}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: Data | null) => { if (!active) return; if (d) { setData(d); tracksRef.current = d.tracks; } else setMissing(true); })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const tracks = data?.tracks ?? [];
  tracksRef.current = tracks;
  const current = tracks[cur];

  useEffect(() => {
    const url = current?.image_url;
    titleRef.current = current?.title ?? '';
    imageRef.current = url ?? '';
    if (!url) { setPalette({ primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY }); return; }
    let active = true;
    extractPalette(url).then((p) => { if (active) setPalette(p); }).catch(() => {});
    return () => { active = false; };
  }, [current?.image_url, current?.title]);

  const getCanvases = useCallback(() => [eqCanvasRef.current].filter((c): c is HTMLCanvasElement => Boolean(c)), []);

  const drawReactiveIdle = useCallback(() => {
    const { primary, secondary } = paletteRef.current;
    for (const canvas of getCanvases()) {
      const ctx = canvas.getContext('2d'); if (!ctx) continue;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      const bars = 64, barW = canvas.width / bars;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        const x = i / bars;
        const h = canvas.height * (0.05 + Math.sin(x * Math.PI) * 0.08);
        ctx.fillStyle = mixColor(primary, secondary, x, 0.32);
        ctx.fillRect(i * barW, canvas.height - h, Math.max(1, barW - 2), h);
      }
    }
  }, [getCanvases]);

  const stopReactiveDrawing = useCallback(() => {
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const startReactiveDrawing = useCallback(() => {
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    const analyser = analyserRef.current; const precomputed = precomputedRef.current;
    if (!analyser && !precomputed) return;
    const freqBins = analyser ? analyser.frequencyBinCount : 1024;
    const freq = new Uint8Array(freqBins);
    const targetFps = precomputed ? precomputed.fps : 30, frameMs = 1000 / targetFps;
    let last = 0;
    const draw = (now: number) => {
      if (now - last < frameMs - 2) { animRef.current = requestAnimationFrame(draw); return; }
      last = now;
      if (analyser) analyser.getByteFrequencyData(freq);
      else if (precomputed) {
        const ct = wsRef.current?.getCurrentTime?.() ?? 0;
        const idx = Math.min(Math.floor(ct * precomputed.fps), precomputed.freqFrames.length - 1);
        const frame = precomputed.freqFrames[Math.max(0, idx)];
        if (frame) freq.set(frame.slice(0, freqBins));
      }
      const { primary, secondary } = paletteRef.current;
      for (const canvas of getCanvases()) {
        const ctx = canvas.getContext('2d'); if (!ctx) continue;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = Math.max(1, w); canvas.height = Math.max(1, h); }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 64, barW = canvas.width / bars, binStep = Math.floor(freqBins / bars);
        for (let i = 0; i < bars; i++) {
          const bin = Math.min(i * binStep, freqBins - 1);
          const raw = (freq[bin] ?? 0) / 255;
          const boosted = Math.pow(raw, 0.65);
          const bh = Math.max(2, boosted * canvas.height * 0.95);
          ctx.fillStyle = mixColor(primary, secondary, i / bars, 0.5 + boosted * 0.45);
          ctx.fillRect(i * barW, canvas.height - bh, Math.max(1, barW - 2), bh);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
  }, [getCanvases]);

  useEffect(() => { drawReactiveIdle(); }, [drawReactiveIdle, palette]);

  const ensureReactiveAudioGraph = useCallback(async (audio: HTMLAudioElement) => {
    if (isMobileUA()) return false;
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return false;
        ctxRef.current = new Ctor();
      }
      if (!sourceRef.current) {
        sourceRef.current = ctxRef.current.createMediaElementSource(audio);
        analyserRef.current = ctxRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.82;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctxRef.current.destination);
      }
      if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
      return true;
    } catch { return false; }
  }, []);

  const setMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    const artwork: MediaImage[] = imageRef.current ? [{ src: imageRef.current, sizes: '512x512', type: 'image/jpeg' }] : [];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: titleRef.current || 'The Song Room', artist: '', artwork });
      navigator.mediaSession.setActionHandler('play', () => { void wsRef.current?.play(); });
      navigator.mediaSession.setActionHandler('pause', () => { wsRef.current?.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', () => goPrevRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => goNextRef.current());
      navigator.mediaSession.playbackState = 'playing';
    } catch { /* some browsers restrict Media Session inside cross-origin frames */ }
  }, []);

  const spinUpTrack = useCallback(async (url: string) => {
    const host = waveHostRef.current; if (!host) return;
    const WaveSurfer = (await import('wavesurfer.js')).default;
    const ws = WaveSurfer.create({
      container: host, waveColor: 'rgba(244,237,228,0.18)', progressColor: '#C0392B',
      cursorColor: 'transparent', barWidth: 2, barGap: 1, height: 80, normalize: true,
      interact: false, fetchParams: { credentials: 'omit' },
    });
    wsRef.current = ws;
    ws.on('ready', () => { setDuration(ws.getDuration()); });
    ws.on('audioprocess', (t: number) => setCurrentTime(t));
    ws.on('play', () => {
      setIsPlaying(true);
      const audio = (ws as any).getMediaElement?.() ?? null;
      if (audio && !isMobileUA()) ensureReactiveAudioGraph(audio).then((ok) => { if (ok) startReactiveDrawing(); }).catch(() => {});
      setMediaSession();
    });
    ws.on('pause', () => { setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
    ws.on('finish', () => { goNextRef.current(); });
    ws.on('error', () => {});
    ws.once('ready', () => {
      void ws.play();
      if (isMobileUA()) {
        try {
          const buf = (ws as any).getDecodedData?.();
          if (buf) void precomputeFrequencyFrames(buf).then((f) => { precomputedRef.current = f; if (wsRef.current === ws && ws.isPlaying?.()) startReactiveDrawing(); });
        } catch { /* ignore */ }
      }
    });
    void ws.load(url).catch(() => {});
  }, [ensureReactiveAudioGraph, startReactiveDrawing, stopReactiveDrawing, drawReactiveIdle, setMediaSession]);

  const loadTrack = useCallback((i: number) => {
    const track = tracksRef.current[i];
    if (!track?.audioUrl) return;
    curRef.current = i; setCur(i);
    titleRef.current = track.title; imageRef.current = track.image_url ?? '';
    setCurrentTime(0); setDuration(0);
    audioLoadedRef.current = true; setIsPlaying(true);
    stopReactiveDrawing();
    precomputedRef.current = null;
    // tear down the previous track completely, then spin up a fresh engine
    if (wsRef.current) { try { wsRef.current.destroy(); } catch { /* ignore */ } wsRef.current = null; }
    try { sourceRef.current?.disconnect(); } catch { /* ignore */ }
    try { analyserRef.current?.disconnect(); } catch { /* ignore */ }
    sourceRef.current = null; analyserRef.current = null;
    void spinUpTrack(track.audioUrl);
  }, [spinUpTrack, stopReactiveDrawing]);

  // keep nav handlers current for WaveSurfer/media-session callbacks
  useEffect(() => {
    goNextRef.current = () => {
      const i = curRef.current + 1;
      if (i < tracksRef.current.length) loadTrack(i);
      else { setIsPlaying(false); stopReactiveDrawing(); drawReactiveIdle(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'; }
    };
    goPrevRef.current = () => {
      const ws = wsRef.current;
      if (ws && (ws.getCurrentTime?.() ?? 0) > 3) { ws.setTime?.(0); return; }
      const i = curRef.current - 1;
      if (i >= 0) loadTrack(i);
    };
  }, [loadTrack, stopReactiveDrawing, drawReactiveIdle]);

  // tear down the audio engine on unmount
  useEffect(() => () => { try { wsRef.current?.destroy(); } catch { /* ignore */ } wsRef.current = null; stopReactiveDrawing(); }, [stopReactiveDrawing]);

  useEffect(() => () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); try { void ctxRef.current?.close(); } catch { /* ignore */ } }, []);

  const handlePlay = useCallback(() => {
    if (!audioLoadedRef.current) { loadTrack(curRef.current || 0); return; }
    const ws = wsRef.current; if (!ws) return;
    void ws.playPause();
  }, [loadTrack]);

  if (loading) return <div className={styles.embed}><div className={styles.loading}>Loading…</div></div>;
  if (missing || !data) return (
    <div className={styles.gate}>
      <div className={styles.gateInner}>
        <span className={styles.gateWordmark}>The Song Room</span>
        <p className={styles.gateMsg}>This playlist isn’t available.</p>
        <a className={styles.gateCta} href="https://song-room.live" target="_blank" rel="noopener noreferrer">Learn more →</a>
      </div>
    </div>
  );

  return (
    <div className={styles.embed}>
      <div className={styles.main}>
        <div className={styles.art}>
          {current?.image_url
            ? <img src={current.image_url} alt={current.title} className={styles.artImg} />
            : <div className={styles.artPlaceholder}><svg width="40" height="40" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2" /><circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.2)" /></svg></div>}
          {isPlaying && <span className={styles.np} aria-hidden="true">♪</span>}
        </div>

        <div className={styles.mid}>
          {data.playlist.workspace_name && (
            <span className={styles.wtag}><span className={styles.wdot} />{data.playlist.workspace_name}</span>
          )}
          <div className={styles.title}>{current?.title ?? data.playlist.title}</div>
          <div className={styles.sub}>
            <span className={styles.pill}>{data.playlist.title}</span>
            <span className={styles.sep}> · </span>
            <span>Track {cur + 1} of {tracks.length}</span>
          </div>

          <div className={styles.controls}>
            <button className={styles.navBtn} onClick={() => goPrevRef.current()} aria-label="Previous">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button className={styles.playBtn} onClick={handlePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5" /><rect x="12" y="2" width="5" height="16" rx="1.5" /></svg>
                : <svg width="16" height="16" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z" /></svg>}
            </button>
            <button className={styles.navBtn} onClick={() => goNextRef.current()} aria-label="Next" disabled={cur >= tracks.length - 1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" /></svg>
            </button>
            <span className={styles.time}>
              <b>{fmt(currentTime)}</b><span className={styles.timeSep}> / </span>{fmt(duration)}
            </span>
          </div>
        </div>
      </div>

      <canvas ref={eqCanvasRef} className={styles.eq} aria-hidden="true" />

      <div className={styles.tracklist}>
        {tracks.map((t, i) => (
          <div key={t.id} className={`${styles.trackRow} ${i === cur ? styles.trackRowActive : ''}`} onClick={() => loadTrack(i)}>
            <span className={styles.trackNum}>{i === cur && isPlaying ? '♪' : i + 1}</span>
            <span className={styles.trackThumb}>{t.image_url ? <img src={t.image_url} alt="" /> : null}</span>
            <span className={styles.trackName}>{t.title}</span>
          </div>
        ))}
      </div>

      <div className={styles.foot}>
        <span className={styles.footWordmark}>The Song Room</span>
        <a className={styles.footLink} href="https://song-room.live" target="_blank" rel="noopener noreferrer">Listen on song-room.live ↗</a>
      </div>

      <div ref={waveHostRef} className={styles.wsHost} aria-hidden="true" />
    </div>
  );
}
