'use client';

import { useParams } from 'next/navigation';
import { usePlaylistPlayer, fmt } from '@/lib/usePlaylistPlayer';
import styles from './listen-playlist.module.css';

export default function PublicPlaylistPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) ?? '';
  const {
    data, loading, missing, tracks, current, cur, isPlaying, currentTime, duration,
    waveHostRef, eqCanvasRef, handlePlay, goNext, goPrev, loadTrack,
  } = usePlaylistPlayer(id);

  if (loading) return <div className={styles.page}><div className={styles.loadingPage}>Loading…</div></div>;
  if (missing || !data) return <div className={styles.page}><div className={styles.errorPage}><div className={styles.errorInner}><span className={styles.errorWordmark}>The Song Room</span><p className={styles.errorMsg}>This playlist isn’t available.</p><a className={styles.errorCta} href="https://song-room.live">Learn more →</a></div></div></div>;

  const upNext = tracks[cur + 1];

  return (
    <div className={styles.page}>
      <div className={styles.hero} style={current?.image_url ? { backgroundImage: `url(${current.image_url})` } : undefined}>
        <div className={styles.heroOverlay}>
          <div className={styles.topBar}>
            <a href="https://song-room.live" className={styles.wordmark} target="_blank" rel="noopener noreferrer">The Song Room</a>
            <a href="https://song-room.live" className={styles.ctaBtn} target="_blank" rel="noopener noreferrer">Start collaborating free →</a>
          </div>

          <div className={styles.playerContent}>
            <div className={styles.playerLeft}>
              <div className={styles.metaRow}>
                {data.playlist.workspace_name && (
                  <span className={styles.workspaceTag}><span className={styles.workspaceDot} />{data.playlist.workspace_name}</span>
                )}
              </div>
              <h1 className={styles.songTitle}>{current?.title ?? data.playlist.title}</h1>
              <div className={styles.versionMeta}>
                <span className={styles.versionPill}>{data.playlist.title}</span>
                <span className={styles.metaDot}>·</span>
                <span className={styles.durationLabel}>Track {cur + 1} of {tracks.length}</span>
              </div>

              <div className={styles.controls}>
                <button className={styles.navBtn} onClick={() => goPrev()} aria-label="Previous">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                </button>
                <button className={styles.playBtn} onClick={handlePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying
                    ? <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5" /><rect x="12" y="2" width="5" height="16" rx="1.5" /></svg>
                    : <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z" /></svg>}
                </button>
                <button className={styles.navBtn} onClick={() => goNext()} aria-label="Next" disabled={cur >= tracks.length - 1}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" /></svg>
                </button>
                <span className={styles.timeDisplay}>
                  <span className={styles.timeCurrent}>{fmt(currentTime)}</span>
                  <span className={styles.timeSep}> / </span>{fmt(duration)}
                </span>
              </div>
              {upNext && <div className={styles.upNext}>Up next: <b>{upNext.title}</b></div>}
            </div>

            <div className={styles.waveformWrap}>
              <canvas ref={eqCanvasRef} className={styles.eqCanvas} aria-hidden="true" />
            </div>

            <div className={styles.artwork}>
              {current?.image_url
                ? <img src={current.image_url} alt={current.title} className={styles.artworkImg} />
                : <div className={styles.artworkPlaceholder}><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2" /><circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.2)" /></svg></div>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.trackListSection}>
        <div className={styles.trackListInner}>
          <h2 className={styles.trackListHeading}>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</h2>
          {tracks.map((t, i) => (
            <button
              type="button"
              key={t.id}
              className={`${styles.trackRow} ${i === cur ? styles.trackRowActive : ''}`}
              onClick={() => loadTrack(i)}
              aria-current={i === cur ? 'true' : undefined}
              aria-label={`Play ${t.title}, track ${i + 1} of ${tracks.length}`}
            >
              <span className={styles.trackNum}>{i === cur && isPlaying ? '♪' : i + 1}</span>
              <span className={styles.trackThumb}>{t.image_url ? <img src={t.image_url} alt="" /> : null}</span>
              <span className={styles.trackName}>{t.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={waveHostRef} className={styles.wsHost} aria-hidden="true" />
    </div>
  );
}
