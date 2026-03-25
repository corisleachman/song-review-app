'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './version.module.css';

interface Thread {
  id: string;
  timestamp_seconds: number;
  created_by: string;
  created_at: string;
  comments: Comment[];
}

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
}

interface Song {
  id: string;
  title: string;
}

export default function VersionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [clickedTime, setClickedTime] = useState<number | null>(null);
  const [identity, setIdentity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [waveError, setWaveError] = useState<string | null>(null);

  const supabase = createClient();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // ─── Load page data ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = getIdentity();
    if (!id) { router.push('/identify'); return; }
    setIdentity(id);

    async function load() {
      setLoading(true);
      try {
        // Song
        const { data: songData } = await supabase
          .from('songs')
          .select('id, title')
          .eq('id', songId)
          .single();
        setSong(songData);

        // All versions for this song (for selector)
        const { data: versionsData } = await supabase
          .from('song_versions')
          .select('*')
          .eq('song_id', songId)
          .order('version_number', { ascending: true });
        setVersions(versionsData || []);

        // Current version
        const { data: versionData } = await supabase
          .from('song_versions')
          .select('*')
          .eq('id', versionId)
          .single();
        setVersion(versionData);

        if (versionData?.file_path) {
          // Prefer signed URL (works regardless of bucket public/private setting)
          const { data: signedData } = await supabase.storage
            .from('song-files')
            .createSignedUrl(versionData.file_path, 3600);
          if (signedData?.signedUrl) {
            setAudioUrl(signedData.signedUrl);
          } else {
            const { data: urlData } = supabase.storage
              .from('song-files')
              .getPublicUrl(versionData.file_path);
            setAudioUrl(urlData.publicUrl);
          }
        }

        // Threads + comments
        await loadThreads();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [songId, versionId]);

  async function loadThreads() {
    const { data: threadData } = await supabase
      .from('comment_threads')
      .select('*, comments(*)')
      .eq('song_version_id', versionId)
      .order('timestamp_seconds', { ascending: true });
    setThreads(threadData || []);
  }

  // ─── WaveSurfer init ──────────────────────────────────────────────────────
  // We wait until audioUrl is set AND the waveformRef div is mounted.
  // Using a callback ref guarantees the div is in the DOM before we init.
  const initWaveSurfer = useCallback(async (container: HTMLDivElement, url: string) => {
    // Destroy any existing instance
    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }

    // Dynamic import — WaveSurfer is browser-only
    const WaveSurfer = (await import('wavesurfer.js')).default;

    // Guard: container may have been unmounted while we were importing
    if (!container.isConnected) return;

    const ws = WaveSurfer.create({
      container,
      waveColor: '#4a3060',
      progressColor: '#ff1493',
      cursorColor: '#00d4ff',
      height: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      normalize: true,
    });

    ws.on('ready', (duration) => {
      setWaveError(null);
      setDuration(duration);
      setIsReady(true);
    });

    ws.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setWaveError(err.message ?? String(err));
    });

    ws.on('timeupdate', (currentTime) => {
      setCurrentTime(currentTime);
    });

    ws.on('seeking', (currentTime) => {
      setCurrentTime(currentTime);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    // Click on waveform → capture timestamp for new thread
    ws.on('interaction', (newTime) => {
      setClickedTime(newTime);
    });

    ws.load(url);
    wavesurferRef.current = ws;
  }, []);

  // Trigger init when audioUrl is ready — retry until ref is attached
  useEffect(() => {
    if (!audioUrl) return;
    setIsReady(false);
    setWaveError(null);

    // The waveformRef may not be attached on the very first microtask,
    // so we poll briefly (max 20 × 50ms = 1s) before giving up.
    let attempts = 0;
    const tryInit = () => {
      if (waveformRef.current) {
        initWaveSurfer(waveformRef.current, audioUrl);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryInit, 50);
      }
    };
    tryInit();

    return () => {
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch {}
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, initWaveSurfer]);

  // Deep-link: jump to thread from email link
  useEffect(() => {
    const threadId = searchParams.get('threadId');
    if (threadId && threads.length > 0) {
      setActiveThread(threadId);
      const thread = threads.find(t => t.id === threadId);
      if (thread && wavesurferRef.current && isReady) {
        wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
      }
    }
  }, [searchParams, threads, isReady]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.playPause();
    }
  };

  const seekToThread = (thread: Thread) => {
    setActiveThread(thread.id);
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
    }
  };

  // ─── Submit new thread ────────────────────────────────────────────────────
  const submitThread = async () => {
    if (!newComment.trim() || clickedTime === null) return;
    const res = await fetch('/api/threads/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versionId,
        songId,
        timestamp: clickedTime,
        author: identity,
        commentText: newComment.trim(),
      }),
    });
    if (res.ok) {
      setNewComment('');
      setClickedTime(null);
      await loadThreads();
    }
  };

  // ─── Submit reply ─────────────────────────────────────────────────────────
  const submitReply = async (threadId: string) => {
    if (!replyText.trim()) return;
    const res = await fetch('/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        songId,
        text: replyText.trim(),
        author: identity,
      }),
    });
    if (res.ok) {
      setReplyText('');
      await loadThreads();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className={styles.loading}>Loading...</div>;

  const activeThreadData = threads.find(t => t.id === activeThread);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          ← Dashboard
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{song?.title}</h1>
          {version && (
            <span className={styles.versionLabel}>
              v{version.version_number}{version.label ? ` — ${version.label}` : ''}
            </span>
          )}
        </div>
        {versions.length > 1 && (
          <select
            className={styles.versionSelect}
            value={versionId}
            onChange={e => router.push(`/songs/${songId}/versions/${e.target.value}`)}
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                v{v.version_number}{v.label ? ` — ${v.label}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Player */}
      <div className={styles.playerSection}>
        <div className={styles.controls}>
          <button
            className={styles.playBtn}
            onClick={togglePlay}
            disabled={!isReady}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {!isReady && audioUrl && !waveError && (
            <span className={styles.loadingWave}>Loading waveform…</span>
          )}
          {waveError && (
            <span className={styles.waveError}>⚠ Audio error: {waveError}</span>
          )}
        </div>

        {/* THE WAVEFORM CONTAINER — explicit height so WaveSurfer can measure it */}
        <div
          ref={waveformRef}
          className={styles.waveform}
          style={{ height: 80, minHeight: 80 }}
        />

        {/* Thread markers */}
        {isReady && duration > 0 && (
          <div className={styles.markers}>
            {threads.map(thread => (
              <button
                key={thread.id}
                className={`${styles.marker} ${activeThread === thread.id ? styles.markerActive : ''}`}
                style={{ left: `${(thread.timestamp_seconds / duration) * 100}%` }}
                onClick={() => seekToThread(thread)}
                title={`${formatTime(thread.timestamp_seconds)} — ${thread.created_by}`}
              />
            ))}
          </div>
        )}

        {/* Click-to-comment hint */}
        {isReady && clickedTime === null && (
          <p className={styles.hint}>Click the waveform to leave a comment at that point</p>
        )}

        {/* New thread input */}
        {clickedTime !== null && (
          <div className={styles.newThreadBox}>
            <span className={styles.newThreadTime}>💬 Comment at {formatTime(clickedTime)}</span>
            <textarea
              className={styles.commentInput}
              placeholder="What's happening here?"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className={styles.newThreadActions}>
              <button className={styles.cancelBtn} onClick={() => setClickedTime(null)}>Cancel</button>
              <button className={styles.submitBtn} onClick={submitThread} disabled={!newComment.trim()}>
                Post
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Threads panel */}
      <div className={styles.threadsSection}>
        <div className={styles.threadsList}>
          <h2 className={styles.threadsTitle}>Comments ({threads.length})</h2>
          {threads.length === 0 && (
            <p className={styles.empty}>No comments yet. Click the waveform to add one.</p>
          )}
          {threads.map(thread => (
            <div
              key={thread.id}
              className={`${styles.threadCard} ${activeThread === thread.id ? styles.threadCardActive : ''}`}
              onClick={() => seekToThread(thread)}
            >
              <div className={styles.threadMeta}>
                <span className={styles.threadTime}>{formatTime(thread.timestamp_seconds)}</span>
                <span className={styles.threadAuthor}>{thread.created_by}</span>
              </div>
              {thread.comments?.map(c => (
                <div
                  key={c.id}
                  className={`${styles.bubble} ${c.author === identity ? styles.bubbleOwn : styles.bubbleOther}`}
                >
                  <span className={styles.bubbleAuthor}>{c.author}</span>
                  <p className={styles.bubbleText}>{c.body}</p>
                </div>
              ))}
              {activeThread === thread.id && (
                <div
                  className={styles.replyBox}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    className={styles.replyInput}
                    placeholder="Reply…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(thread.id); }}}
                  />
                  <button
                    className={styles.submitBtn}
                    onClick={() => submitReply(thread.id)}
                    disabled={!replyText.trim()}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
