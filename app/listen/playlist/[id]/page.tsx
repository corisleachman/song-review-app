'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './listen-playlist.module.css';

type Track = { id: string; title: string; image_url: string | null; audioUrl: string | null };
type Data = { playlist: { id: string; title: string; workspace_name: string | null }; tracks: Track[] };

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d={d} /></svg>
);
const PLAY = 'M8 5v14l11-7z';
const PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z';
const PREV = 'M6 6h2v12H6zm3.5 6l8.5 6V6z';
const NEXT = 'M16 6h2v12h-2zM6 18l8.5-6L6 6z';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/playlist/${id}`, { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((d) => { if (!active) return; if (d) setData(d); else setMissing(true); })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const tracks = data?.tracks ?? [];

  // Play a track synchronously inside the user gesture (mobile-safe).
  const playIndex = useCallback((i: number) => {
    const audio = audioRef.current;
    const track = tracks[i];
    if (!audio || !track?.audioUrl) return;
    setCur(i);
    if (audio.src !== track.audioUrl) { audio.src = track.audioUrl; audio.load(); }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [tracks]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const track = tracks[cur];
    if (!audio || !track?.audioUrl) return;
    if (audio.src !== track.audioUrl) { audio.src = track.audioUrl; audio.load(); }
    if (playing) audio.pause();
    else void audio.play().then(() => setPlaying(true)).catch(() => {});
  }, [playing, cur, tracks]);

  const next = useCallback(() => {
    if (cur < tracks.length - 1) playIndex(cur + 1);
    else setPlaying(false);
  }, [cur, tracks.length, playIndex]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (cur > 0) playIndex(cur - 1);
  }, [cur, playIndex]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.min(dur, Math.max(0, ((e.clientX - r.left) / r.width) * dur));
  };

  if (loading) return <div className={styles.page}><div className={styles.center}>Loading…</div></div>;
  if (missing || !data) return <div className={styles.page}><div className={styles.center}>This playlist isn’t available.</div></div>;

  const current = tracks[cur];
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
              <div className={styles.nowLbl}>Now playing</div>
              <div className={styles.nowTitle}>{current?.title ?? '—'}</div>
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
                <li key={t.id} className={`${styles.track} ${i === cur ? styles.active : ''}`} onClick={() => playIndex(i)}>
                  <span className={styles.idx}>{i === cur && playing ? '♪' : i + 1}</span>
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />
    </div>
  );
}
