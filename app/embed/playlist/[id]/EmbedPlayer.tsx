'use client';

import { usePlaylistPlayer, fmt } from '@/lib/usePlaylistPlayer';
import styles from './embed.module.css';

export default function EmbedPlayer({ id }: { id: string }) {
  const {
    data, loading, missing, tracks, current, cur, isPlaying, currentTime, duration,
    waveHostRef, eqCanvasRef, handlePlay, goNext, goPrev, loadTrack,
  } = usePlaylistPlayer(id);

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
            <button className={styles.navBtn} onClick={() => goPrev()} aria-label="Previous">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button className={styles.playBtn} onClick={handlePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5" /><rect x="12" y="2" width="5" height="16" rx="1.5" /></svg>
                : <svg width="16" height="16" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z" /></svg>}
            </button>
            <button className={styles.navBtn} onClick={() => goNext()} aria-label="Next" disabled={cur >= tracks.length - 1}>
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
