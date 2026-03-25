'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity, formatTimestamp } from '@/lib/auth';
import styles from './version.module.css';

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

interface Thread {
  id: string;
  timestamp_seconds: number;
  created_by: string;
  created_at: string;
  comments: Comment[];
}

interface Action {
  id: string;
  description: string;
  status: string;
  suggested_by: string;
  comment_id: string | null;
  timestamp_seconds: number | null;
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

const MARKER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce'];

export default function VersionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const pendingTimestampRef = useRef<number | null>(null);

  const [identity, setIdentity] = useState('');
  const [song, setSong] = useState<Song | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveErr, setWaveErr] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [actionModalCommentId, setActionModalCommentId] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [markedCommentIds, setMarkedCommentIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    const id = getIdentity();
    if (!id) { router.push('/identify'); return; }
    setIdentity(id);
    load();
  }, [songId, versionId]);

  async function load() {
    setLoading(true);
    try {
      const [songRes, versionRes, versionsRes] = await Promise.all([
        supabase.from('songs').select('id, title').eq('id', songId).single(),
        supabase.from('song_versions').select('*').eq('id', versionId).single(),
        supabase.from('song_versions').select('*').eq('song_id', songId).order('version_number', { ascending: true }),
      ]);
      setSong(songRes.data);
      setVersion(versionRes.data);
      setVersions(versionsRes.data || []);

      if (versionRes.data?.file_path) {
        const { data: signed } = await supabase.storage.from('song-files').createSignedUrl(versionRes.data.file_path, 3600);
        if (signed?.signedUrl) {
          setAudioUrl(signed.signedUrl);
        } else {
          const { data: pub } = supabase.storage.from('song-files').getPublicUrl(versionRes.data.file_path);
          setAudioUrl(pub.publicUrl);
        }
      }
      await Promise.all([loadThreads(), loadActions()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadThreads() {
    const { data } = await supabase
      .from('comment_threads')
      .select('*, comments(*)')
      .eq('song_version_id', versionId)
      .order('timestamp_seconds', { ascending: true });
    setThreads(data || []);
  }

  async function loadActions() {
    // Only load actions whose linked comment belongs to a thread on THIS version
    const { data } = await supabase
      .from('actions')
      .select('*, comment_threads!inner(song_version_id)')
      .eq('song_id', songId)
      .eq('comment_threads.song_version_id', versionId)
      .order('created_at', { ascending: false });
    setActions(data || []);
  }

  // Deep link: open thread from email. Re-runs when isReady/duration change
  // so the seek fires even if waveform loads after threads.
  useEffect(() => {
    const threadId = searchParams.get('thread') || searchParams.get('threadId');
    if (!threadId || threads.length === 0) return;
    setSelectedThreadId(threadId);
    const t = threads.find(x => x.id === threadId);
    if (!t) return;
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(t.timestamp_seconds / duration);
    }
  }, [searchParams, threads, isReady, duration]);

  const initWaveSurfer = useCallback(async (container: HTMLDivElement, url: string) => {
    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }
    const WaveSurfer = (await import('wavesurfer.js')).default;
    if (!container.isConnected) return;

    // Create a native <audio> element and pass it to WaveSurfer.
    // This bypasses WaveSurfer's internal fetch entirely — which fixes mobile
    // where signed URLs or CORS can silently block the internal fetch.
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.src = url;

    const ws = WaveSurfer.create({
      container,
      waveColor: 'rgba(255,255,255,0.15)',
      progressColor: 'rgba(255,20,147,0.8)',
      cursorColor: '#00d4ff',
      cursorWidth: 1,
      height: 96,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      normalize: true,
      media: audio,
    });

    ws.on('ready', (dur: number) => { setWaveErr(null); setDuration(dur); setIsReady(true); });
    ws.on('timeupdate', (t: number) => setCurrentTime(t));
    ws.on('seeking', (t: number) => setCurrentTime(t));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (e: Error) => {
      console.error('WaveSurfer error:', e);
      setWaveErr(e?.message || String(e));
    });

    ws.on('click', (relX: number) => {
      const ts = relX * ws.getDuration();
      // Use setThreads callback to get latest threads without stale closure
      setThreads(prev => {
        const nearby = prev.find(t => Math.abs(t.timestamp_seconds - ts) < 2);
        if (nearby) {
          setSelectedThreadId(nearby.id);
          setPendingTimestamp(null);
          pendingTimestampRef.current = null;
        } else {
          pendingTimestampRef.current = ts;
          setPendingTimestamp(ts);
          setNewComment('');
          setSelectedThreadId(null);
        }
        return prev;
      });
    });

    // Audio src already set on the media element — no need to pass url again
    ws.load(audio.src);
    wavesurferRef.current = ws;
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    setIsReady(false);
    let attempts = 0;
    const tryInit = () => {
      if (waveformRef.current) {
        initWaveSurfer(waveformRef.current, audioUrl);
      } else if (attempts++ < 20) {
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

  const toggleAction = async (action: Action) => {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadActions();
  };

  const submitThread = async () => {
    const ts = pendingTimestampRef.current;
    if (!newComment.trim() || ts === null) return;
    setPosting(true);
    try {
      const res = await fetch('/api/threads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, songId, timestamp: ts, author: identity, commentText: newComment.trim() }),
      });
      if (res.ok) {
        const { threadId } = await res.json();
        setNewComment('');
        setPendingTimestamp(null);
        pendingTimestampRef.current = null;
        await loadThreads();
        setSelectedThreadId(threadId);
      }
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (threadId: string) => {
    if (!replyText.trim()) return;
    const res = await fetch('/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, songId, text: replyText.trim(), author: identity }),
    });
    if (res.ok) { setReplyText(''); await loadThreads(); }
  };

  const submitAction = async () => {
    if (!actionModalCommentId || !actionText.trim()) return;
    await fetch('/api/actions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: actionModalCommentId, songId, description: actionText.trim(), suggestedBy: identity }),
    });
    setMarkedCommentIds(prev => { const next = new Set(prev); next.add(actionModalCommentId!); return next; });
    setActionModalCommentId(null);
    setActionText('');
    await loadActions();
  };

  const seekToThread = (thread: Thread) => {
    setSelectedThreadId(thread.id);
    setPendingTimestamp(null);
    pendingTimestampRef.current = null;
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;

  const selectedThread = threads.find(t => t.id === selectedThreadId) ?? null;
  const pendingActions = actions.filter(a => a.status !== 'completed');
  const completedActions = actions.filter(a => a.status === 'completed');

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.songsBtn} onClick={() => router.push('/dashboard')}>Songs</button>
        <h1 className={styles.songTitle}>{song?.title}</h1>
        {version && <span className={styles.versionBadge}>v{version.version_number}</span>}
        <div className={styles.topBarRight}>
          {versions.length > 0 && (
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
          <button className={styles.uploadBtn} onClick={() => router.push(`/songs/${songId}/upload`)}>
            ↑ Upload new version
          </button>
          <div className={styles.avatar}>{identity?.[0]?.toUpperCase()}</div>
        </div>
      </div>

      {/* Player */}
      <div className={styles.playerSection}>
        <div className={styles.playerRow}>
          <button className={styles.playBtn} onClick={() => wavesurferRef.current?.playPause()} disabled={!isReady}>
            {isPlaying
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="2" y="1" width="4" height="12" rx="1"/><rect x="8" y="1" width="4" height="12" rx="1"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path d="M3 1.5l10 5.5-10 5.5z"/></svg>
            }
          </button>
          <span className={styles.timeDisplay}>
            {formatTimestamp(Math.floor(currentTime))} / {formatTimestamp(Math.floor(duration))}
          </span>
          {!isReady && audioUrl && !waveErr && <span className={styles.loadingWave}>Loading waveform…</span>}
          {waveErr && <span className={styles.waveErrMsg}>⚠ {waveErr}</span>}
        </div>

        <div className={styles.waveformWrap}>
          <div ref={waveformRef} className={styles.waveform} style={{ height: 96, minHeight: 96 }} />
          {isReady && duration > 0 && (
            <div className={styles.markers}>
              {threads.map((thread, i) => (
                <button
                  key={thread.id}
                  className={`${styles.marker} ${selectedThreadId === thread.id ? styles.markerActive : ''}`}
                  style={{ left: `${(thread.timestamp_seconds / duration) * 100}%`, background: MARKER_COLORS[i % MARKER_COLORS.length] }}
                  onClick={() => seekToThread(thread)}
                  title={formatTimestamp(thread.timestamp_seconds)}
                />
              ))}
            </div>
          )}
        </div>

        <p className={styles.waveHint}>click anywhere on the waveform to leave a comment</p>

        {pendingTimestamp !== null && (
          <div className={styles.inlineForm}>
            <span className={styles.inlineFormTime}>💬 Comment at {formatTimestamp(Math.floor(pendingTimestamp))}</span>
            <textarea
              className={styles.inlineTextarea}
              placeholder="What's happening here?"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={2}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitThread(); } }}
            />
            <div className={styles.inlineFormActions}>
              <button className={styles.cancelBtn} onClick={() => { setPendingTimestamp(null); pendingTimestampRef.current = null; }}>Cancel</button>
              <button className={styles.postBtn} onClick={submitThread} disabled={!newComment.trim() || posting}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div className={styles.body}>

        {/* Left: Actions */}
        <div className={styles.actionsPanel}>
          <div className={styles.actionsPanelHeader}>
            <span className={styles.actionsPanelTitle}>ACTIONS</span>
            <span className={styles.pendingBadge}>{pendingActions.length} pending</span>
          </div>
          {actions.length === 0 && <p className={styles.empty}>No actions yet</p>}
          {[...pendingActions, ...completedActions].map(action => (
            <div key={action.id} className={`${styles.actionItem} ${action.status === 'completed' ? styles.actionDone : ''}`}>
              <button
                className={`${styles.actionToggle} ${action.status === 'completed' ? styles.actionToggleDone : ''}`}
                onClick={() => toggleAction(action)}
              >
                {action.status === 'completed' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <div className={styles.actionText}>
                <span className={`${styles.actionDesc} ${action.status === 'completed' ? styles.actionDescDone : ''}`}>
                  {action.description}
                </span>
                <span className={styles.actionMeta}>
                  {action.suggested_by}
                  {action.timestamp_seconds != null && (
                    <> · <span className={styles.actionTimestamp}>@ {formatTimestamp(action.timestamp_seconds)}</span></>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Threads */}
        <div className={styles.threadsPanel}>
          {selectedThread ? (
            <>
              <div className={styles.threadsPanelHeader}>
                <div className={styles.threadMarkerDot} style={{ background: MARKER_COLORS[threads.findIndex(t => t.id === selectedThread.id) % MARKER_COLORS.length] }} />
                <span className={styles.threadTimestamp}>@ {formatTimestamp(selectedThread.timestamp_seconds)}</span>
                <button className={styles.threadsDropdown} onClick={() => setSelectedThreadId(null)}>
                  {threads.length} thread{threads.length !== 1 ? 's' : ''} ▾
                </button>
              </div>
              <div className={styles.bubbleList}>
                {selectedThread.comments?.map(c => (
                  <div key={c.id} className={`${styles.bubbleWrap} ${c.author === identity ? styles.bubbleWrapOwn : styles.bubbleWrapOther}`}>
                    {!c.author || c.author !== identity && <span className={styles.bubbleAuthor}>{c.author}</span>}
                    <div className={`${styles.bubble} ${c.author === identity ? styles.bubbleOwn : styles.bubbleOther}`}>
                      {c.body}
                    </div>
                    {c.author === identity && <span className={styles.bubbleAuthor}>{c.author}</span>}
                    {!markedCommentIds.has(c.id) && (
                      <button className={styles.markActionBtn} onClick={() => { setActionModalCommentId(c.id); setActionText(c.body); }}>
                        + Mark as action
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.replyRow}>
                <div className={styles.replyDot} />
                <input
                  className={styles.replyInput}
                  placeholder="Reply…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitReply(selectedThread.id); }}
                />
                <span className={styles.replyTime}>{formatTimestamp(Math.floor(currentTime))}</span>
                <button className={styles.replyBtn} onClick={() => submitReply(selectedThread.id)} disabled={!replyText.trim()}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 7h11M8 3l4 4-4 4"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.threadsPanelHeader}>
                <span className={styles.threadsPanelTitle}>{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
              </div>
              {threads.length === 0
                ? <p className={styles.empty}>No comments yet. Click the waveform to add one.</p>
                : (
                  <div className={styles.threadIndexList}>
                    {threads.map((t, i) => (
                      <button key={t.id} className={styles.threadIndexItem} onClick={() => seekToThread(t)}>
                        <div className={styles.threadIndexDot} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
                        <span className={styles.threadIndexTime}>@ {formatTimestamp(t.timestamp_seconds)}</span>
                        <span className={styles.threadIndexPreview}>{t.comments?.[0]?.body?.slice(0, 50) || '…'}</span>
                      </button>
                    ))}
                  </div>
                )
              }
            </>
          )}
        </div>
      </div>

      {/* Action modal */}
      {actionModalCommentId && (
        <div className={styles.modalOverlay} onClick={() => setActionModalCommentId(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Mark as Action</h3>
            <textarea className={styles.modalTextarea} value={actionText} onChange={e => setActionText(e.target.value)} rows={3} />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setActionModalCommentId(null)}>Cancel</button>
              <button className={styles.postBtn} onClick={submitAction} disabled={!actionText.trim()}>Save Action</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
