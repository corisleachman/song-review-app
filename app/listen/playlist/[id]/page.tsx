'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './listen-playlist.module.css';

// ── Colour + frequency helpers (mirrored from the single-song listen page) ──
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

function isMobileUA() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

type Track = { id: string; title: string; image_url: string | null; audioUrl: string | null };
type Data = { playlist: { id: string; title: string; workspace_name: string | null }; tracks: Track[] };

function fmt(s: number) { if (!isFinite(s) || s < 0) return '0:00'; const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

const Icon = ({ d }: { d: string }) => (<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d={d} /></svg>);
const PLAY = 'M8 5v14l11-7z', PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z', PREV = 'M6 6h2v12H6zm3.5 6l8.5 6V6z', NEXT = 'M16 6h2v12h-2zM6 18l8.5-6L6 6z';

export default function PublicPlaylistPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) ?? '';
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [palette, setPalette] = useState<{ primary: Rgb; secondary: Rgb }>({ primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY });
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const precomputedRef = useRef<{ freqFrames: Uint8Array[]; fps: number } | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/playlist/${id}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => { if (!active) return; if (d) setData(d); else setMissing(true); })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const tracks = data?.tracks ?? [];
  const current = tracks[cur];

  useEffect(() => {
    const url = current?.image_url;
    if (!url) { setPalette({ primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY }); return; }
    let active = true;
    extractPalette(url).then((p) => { if (active) setPalette(p); }).catch(() => {});
    return () => { active = false; };
  }, [current?.image_url]);

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    const { primary, secondary } = paletteRef.current;
    const bars = 64, barW = canvas.width / bars;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < bars; i++) {
      const x = i / bars;
      const h = canvas.height * (0.05 + Math.sin(x * Math.PI) * 0.10);
      const y = canvas.height - h;
      ctx.fillStyle = mixColor(primary, secondary, x, 0.3);
      ctx.fillRect(i * barW, y, Math.max(1, barW - 2), h);
    }
  }, []);

  const stopDrawing = useCallback(() => {
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const startDrawing = useCallback(() => {
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
        const ct = audioRef.current?.currentTime ?? 0;
        const idx = Math.min(Math.floor(ct * precomputed.fps), precomputed.freqFrames.length - 1);
        const frame = precomputed.freqFrames[Math.max(0, idx)];
        if (frame) freq.set(frame.slice(0, freqBins));
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = Math.max(1, w); canvas.height = Math.max(1, h); }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const { primary, secondary } = paletteRef.current;
        const bars = 64, barW = canvas.width / bars, binStep = Math.floor(freqBins / bars);
        for (let i = 0; i < bars; i++) {
          const bin = Math.min(i * binStep, freqBins - 1);
          const raw = (freq[bin] ?? 0) / 255;
          const boosted = Math.pow(raw, 0.65);
          const bh = Math.max(2, boosted * canvas.height * 0.95);
          const x = i * barW, y = canvas.height - bh, t = i / bars;
          ctx.fillStyle = mixColor(primary, secondary, t, 0.5 + boosted * 0.45);
          ctx.fillRect(x, y, Math.max(1, barW - 2), bh);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => { drawIdle(); }, [drawIdle, palette]);

  const ensureGraph = useCallback(async () => {
    if (isMobileUA()) return false;
    const audio = audioRef.current; if (!audio) return false;
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  const precomputeCurrent = useCallback(async (url: string) => {
    try {
      const buf = await fetch(url).then((r) => r.arrayBuffer());
      const octx = new OfflineAudioContext(1, 1, 44100);
      const decoded = await octx.decodeAudioData(buf);
      precomputedRef.current = await precomputeFrequencyFrames(decoded);
      if (audioRef.current && !audioRef.current.paused) startDrawing();
    } catch { /* ignore */ }
  }, [startDrawing]);

  const playTrack = useCallback((i: number) => {
    const audio = audioRef.current; const track = tracks[i];
    if (!audio || !track?.audioUrl) return;
    setCur(i);
    const changed = audio.src !== track.audioUrl;
    if (changed) { audio.src = track.audioUrl; audio.load(); if (isMobileUA()) precomputedRef.current = null; }
    if (isMobileUA()) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (changed || !precomputedRef.current) void precomputeCurrent(track.audioUrl);
    } else {
      void ensureGraph().then(() => { void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); });
    }
  }, [tracks, ensureGraph, precomputeCurrent]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current; const track = tracks[cur];
    if (!audio || !track?.audioUrl) return;
    if (playing) { audio.pause(); return; }
    if (audio.src !== track.audioUrl) { audio.src = track.audioUrl; audio.load(); }
    if (isMobileUA()) {
      void audio.play().then(() => setPlaying(true)).catch(() => {});
      if (!precomputedRef.current) void precomputeCurrent(track.audioUrl);
    } else {
      void ensureGraph().then(() => { void audio.play().then(() => setPlaying(true)).catch(() => {}); });
    }
  }, [playing, cur, tracks, ensureGraph, precomputeCurrent]);

  const next = useCallback(() => {
    if (cur < tracks.length - 1) playTrack(cur + 1);
    else { setPlaying(false); stopDrawing(); drawIdle(); }
  }, [cur, tracks.length, playTrack, stopDrawing, drawIdle]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    if (cur > 0) playTrack(cur - 1);
  }, [cur, playTrack]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = clamp(((e.clientX - r.left) / r.width) * dur, 0, dur);
  };

  useEffect(() => () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); try { void ctxRef.current?.close(); } catch { /* ignore */ } }, []);

  if (loading) return <div className={styles.page}><div className={styles.center}>Loading…</div></div>;
  if (missing || !data) return <div className={styles.page}><div className={styles.center}>This playlist isn’t available.</div></div>;

  const pct = dur ? (time / dur) * 100 : 0;
  const upNext = tracks[cur + 1];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.brandbar}><span className={styles.brand}>SONG ROOM<span className={styles.dot}>.</span></span></div>
        <header className={styles.head}>
          <h1 className={styles.title}>{data.playlist.title}</h1>
          <div className={styles.by}>{data.playlist.workspace_name ? `shared by ${data.playlist.workspace_name}` : 'A Song Room playlist'}</div>
          <div className={styles.count}>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</div>
        </header>

        {tracks.length === 0 ? (
          <div className={styles.center}>This playlist has no playable songs yet.</div>
        ) : (
          <>
            <div className={styles.now}>
              <div className={styles.nowMain}>
                <div className={styles.art}>
                  {current?.image_url ? <img className={styles.artImg} src={current.image_url} alt="" /> : <span className={styles.artPlaceholder} aria-hidden="true">♫</span>}
                </div>
                <div className={styles.nowInfo}>
                  <div className={styles.nowLbl}>Now playing</div>
                  <div className={styles.nowTitle}>{current?.title ?? '—'}</div>
                </div>
              </div>
              <canvas ref={canvasRef} className={styles.eqCanvas} aria-hidden="true" />
              <div className={styles.progress} onClick={seek}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
              <div className={styles.transport}>
                <button className={styles.tbtn} onClick={prev} aria-label="Previous"><Icon d={PREV} /></button>
                <button className={`${styles.tbtn} ${styles.play}`} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}><Icon d={playing ? PAUSE : PLAY} /></button>
                <button className={styles.tbtn} onClick={next} aria-label="Next"><Icon d={NEXT} /></button>
                <span className={styles.time}>{fmt(time)} / {fmt(dur)}</span>
              </div>
              {upNext && <div className={styles.upnext}>Up next: <b>{upNext.title}</b></div>}
            </div>

            <ol className={styles.list}>
              {tracks.map((t, i) => (
                <li key={t.id} className={`${styles.track} ${i === cur ? styles.active : ''}`} onClick={() => playTrack(i)}>
                  <span className={styles.idx}>{i === cur && playing ? '♪' : i + 1}</span>
                  <span className={styles.trackArt}>{t.image_url ? <img className={styles.trackArtImg} src={t.image_url} alt="" /> : null}</span>
                  <span className={styles.tt}>{t.title}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <div className={styles.footer}>Powered by Song Room</div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onEnded={next}
        onPlay={() => { setPlaying(true); startDrawing(); }}
        onPause={() => { setPlaying(false); stopDrawing(); drawIdle(); }}
        preload="metadata"
      />
    </div>
  );
}
