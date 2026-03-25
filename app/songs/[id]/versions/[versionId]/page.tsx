'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './version.module.css';

const supabase = createClient();

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
  comments: Comment[];
}

interface Action {
  id: string;
  description: string;
  status: string;
  suggested_by: string;
  comment_id?: string;
  timestamp_seconds?: number;
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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VersionContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const [identity, setIdentity] = useState('');
  const [song, setSong] = useState<Song | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [pendingComment, setPendingComment] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  useEffect(() => {
    const id = getIdentity();
    if (!id) { router.push('/identify'); return; }
    setIdentity(id);
    loadData();
  }, [versionId]);

  useEffect(() => {
    const threadParam = searchParams.get('threadId');
    if (threadParam) setActiveThreadId(threadParam);
  }, [searchParams, threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.comments?.length]);

  async function loadData() {
    const [songRes, versionsRes] = await Promise.all([
      supabase.from('songs').select('id, title').eq('id', songId).single(),
      supabase.from('song_versions').select('*').eq('song_id', songId).order('version_number', { ascending: false }),
    ]);
    setSong(songRes.data);
    setVersions(versionsRes.data ?? []);
    const ver = versionsRes.data?.find((v: Version) => v.id === versionId) ?? null;
    setCurrentVersion(ver);
    if (ver) {
      const { data: urlData } = await supabase.storage.from('song-files').createSignedUrl(ver.file_path, 3600);
      if (urlData?.signedUrl) setAudioUrl(urlData.signedUrl);
    }
    await loadThreads();
    await loadActions();
  }

  async function loadThreads() {
    const { data } = await supabase
      .from('comment_threads')
      .select('*, comments(*)')
      .eq('song_version_id', versionId)
      .order('timestamp_seconds', { ascending: true });
    setThreads(data?.map((t: any) => ({ ...t, comments: t.comments ?? [] })) ?? []);
  }

  async function loadActions() {
    const { data } = await supabase
      .from('actions')
      .select('*')
      .eq('song_id', songId)
      .order('created_at', { ascending: false });
    setActions(data ?? []);
  }

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;
    let ws: any;
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (wavesurferRef.current) wavesurferRef.current.destroy();
      ws = WaveSurfer.create({
        container: waveformRef.current!,
        waveColor: 'rgba(255,255,255,0.15)',
        progressColor: 'rgba(255,20,147,0.7)',
        cursorColor: '#ff1493',
        cursorWidth: 1.5,
        height: 80,
        barWidth: 2.5,
        barGap: 1.5,
        barRadius: 1,
        interact: true,
      });
      ws.load(audioUrl);
      ws.on('ready', () => setDuration(ws.getDuration()));
      ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));
      wavesurferRef.current = ws;
    });
    return () => { ws?.destroy(); };
  }, [audioUrl]);

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!waveformRef.current || !wavesurferRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const ts = ratio * duration;
    wavesurferRef.current.seekTo(ratio);
    setPendingTimestamp(ts);
    setPendingComment('');
    setActiveThreadId(null);
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  }

  function handleMarkerClick(thread: Thread, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveThreadId(thread.id);
    setPendingTimestamp(null);
    if (wavesurferRef.current && duration > 0) {
      wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
    }
  }

  async function submitNewThread() {
    if (!pendingComment.trim() || pendingTimestamp === null) return;
    setSending(true);
    const res = await fetch('/api/threads/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, timestampSeconds: pendingTimestamp, createdBy: identity, initialComment: pendingComment }),
    });
    const data = await res.json();
    setSending(false);
    setPendingTimestamp(null);
    setPendingComment('');
    await loadThreads();
    if (data.threadId) setActiveThreadId(data.threadId);
  }

  async function submitReply() {
    if (!replyText.trim() || !activeThreadId) return;
    setSending(true);
    await fetch('/api/threads/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: activeThreadId, author: identity, body: replyText, versionId }),
    });
    setSending(false);
    setReplyText('');
    await loadThreads();
  }

  async function markAsAction(comment: Comment) {
    await fetch('/api/actions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId,
        commentId: comment.id,
        description: comment.body,
        suggestedBy: identity,
        timestampSeconds: activeThread?.timestamp_seconds,
      }),
    });
    await loadActions();
  }

  async function toggleAction(action: Action) {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('actions').update({ status: newStatus }).eq('id', action.id);
    loadActions();
  }

  async function uploadNewVersion(file: File) {
    setUploadingVersion(true);
    const res = await fetch('/api/versions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, fileName: file.name, fileSize: file.size, createdBy: identity }),
    });
    const { uploadUrl, versionId: newVerId } = await res.json();
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    setUploadingVersion(false);
    router.push(`/songs/${songId}/versions/${newVerId}`);
  }

  const pendingCount = actions.filter(a => a.status === 'pending').length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Songs
          </button>
          <span className={styles.songTitle}>{song?.title ?? '…'}</span>
          {currentVersion && <span className={styles.versionBadge}>v{currentVersion.version_number}</span>}
        </div>
        <div className={styles.headerRight}>
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
          <button
            className={styles.uploadBtn}
            onClick={() => audioUploadRef.current?.click()}
            disabled={uploadingVersion}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 9V4M4 6.5l2.5-2.5 2.5 2.5M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {uploadingVersion ? 'Uploading…' : 'Upload new version'}
          </button>
          <div
            className={styles.avatar}
            style={{
              background: identity === 'Coris' ? 'rgba(255,20,147,0.2)' : 'rgba(0,212,255,0.2)',
              color: identity === 'Coris' ? '#ff1493' : '#00d4ff',
            }}
          >
            {identity?.[0]}
          </div>
        </div>
      </header>

      {/* Player */}
      <div className={styles.playerArea}>
        <div className={styles.playerControls}>
          <button className={styles.playBtn} onClick={() => wavesurferRef.current?.playPause()}>
            {isPlaying
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><rect x="2" y="1" width="4" height="12" rx="1"/><rect x="8" y="1" width="4" height="12" rx="1"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><path d="M3 1.5l10 5.5-10 5.5z"/></svg>
            }
          </button>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <span className={styles.timeSep}>/</span>
          <span className={styles.timeDur}>{formatTime(duration)}</span>
        </div>

        <div className={styles.waveformWrap} onClick={handleWaveformClick}>
          <div ref={waveformRef} className={styles.waveform} />
          {threads.map((thread, i) => (
            <div
              key={thread.id}
              className={`${styles.marker} ${activeThreadId === thread.id ? styles.markerActive : ''}`}
              style={{ left: `${(thread.timestamp_seconds / (duration || 1)) * 100}%` }}
              onClick={e => handleMarkerClick(thread, e)}
            >
              <div className={styles.markerDot} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
              <div className={styles.markerLine} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
            </div>
          ))}
        </div>

        <p className={styles.waveformHint}>click anywhere on the waveform to leave a comment</p>

        {/* Inline comment bar — appears below waveform on click */}
        {pendingTimestamp !== null && (
          <div className={styles.inlineCommentBar}>
            <span className={styles.inlineTimestamp}>{formatTime(pendingTimestamp)}</span>
            <input
              ref={inlineInputRef}
              className={styles.inlineInput}
              placeholder="Add a comment at this point…"
              value={pendingComment}
              onChange={e => setPendingComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNewThread();
                if (e.key === 'Escape') setPendingTimestamp(null);
              }}
            />
            <button className={styles.sendBtn} onClick={submitNewThread} disabled={sending || !pendingComment.trim()}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5h9M7 3l4.5 3.5L7 10" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className={styles.cancelInline} onClick={() => setPendingTimestamp(null)}>✕</button>
          </div>
        )}
      </div>

      {/* Main body — actions left, comments right */}
      <div className={styles.mainBody}>
        {/* Actions panel */}
        <div className={styles.actionsCol}>
          <div className={styles.colHeader}>
            <span className={styles.colLabel}>Actions</span>
            {pendingCount > 0 && <span className={styles.pendingBadge}>{pendingCount} pending</span>}
          </div>
          <div className={styles.actionsList}>
            {actions.length === 0 && (
              <p className={styles.emptyHint}>Mark comments as actions to track them here</p>
            )}
            {actions.map(action => (
              <div key={action.id} className={styles.actionItem}>
                <button
                  className={`${styles.actionCheck} ${action.status === 'completed' ? styles.actionDone : ''}`}
                  onClick={() => toggleAction(action)}
                >
                  {action.status === 'completed' && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
                <div className={styles.actionContent}>
                  <div className={`${styles.actionText} ${action.status === 'completed' ? styles.actionTextDone : ''}`}>
                    {action.description}
                  </div>
                  {action.timestamp_seconds != null && (
                    <div className={styles.actionTs}>@ {formatTime(action.timestamp_seconds)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments panel */}
        <div className={styles.commentsCol}>
          <div className={styles.colHeader}>
            {activeThread ? (
              <div className={styles.threadHeader}>
                <div
                  className={styles.threadDot}
                  style={{ background: MARKER_COLORS[threads.findIndex(t => t.id === activeThreadId) % MARKER_COLORS.length] }}
                />
                <span className={styles.threadTime}>@ {formatTime(activeThread.timestamp_seconds)}</span>
                <button className={styles.backToList} onClick={() => setActiveThreadId(null)}>All threads</button>
              </div>
            ) : (
              <span className={styles.colLabel}>Comments</span>
            )}
            {threads.length > 0 && !activeThread && (
              <span className={styles.threadCount}>{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* No threads yet */}
          {!activeThread && threads.length === 0 && (
            <div className={styles.emptyComments}>
              <p>No comments yet.</p>
              <p>Click anywhere on the waveform to start a thread.</p>
            </div>
          )}

          {/* Thread list */}
          {!activeThread && threads.length > 0 && (
            <div className={styles.threadList}>
              {threads.map((thread, i) => (
                <div key={thread.id} className={styles.threadListItem} onClick={() => setActiveThreadId(thread.id)}>
                  <div className={styles.threadListDot} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
                  <div className={styles.threadListInfo}>
                    <div className={styles.threadListTime}>@ {formatTime(thread.timestamp_seconds)}</div>
                    <div className={styles.threadListPreview}>
                      {thread.comments[0]?.body?.substring(0, 60)}{(thread.comments[0]?.body?.length ?? 0) > 60 ? '…' : ''}
                    </div>
                  </div>
                  <div className={styles.threadListCount}>{thread.comments.length}</div>
                </div>
              ))}
            </div>
          )}

          {/* Active thread — iMessage style */}
          {activeThread && (
            <>
              <div className={styles.messages}>
                {activeThread.comments.map(comment => {
                  const isMe = comment.author === identity;
                  const isActioned = actions.some(a => a.comment_id === comment.id);
                  return (
                    <div key={comment.id} className={`${styles.msgGroup} ${isMe ? styles.msgMe : styles.msgThem}`}>
                      {!isMe && <div className={styles.msgAuthor}>{comment.author}</div>}
                      <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                        {comment.body}
                      </div>
                      {isActioned ? (
                        <div className={styles.actionedPill}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                          Action added
                        </div>
                      ) : (
                        <button className={styles.markActionBtn} onClick={() => markAsAction(comment)}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1 4.5h7M4.5 1v7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                          Mark as action
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.replyBar}>
                <input
                  ref={replyInputRef}
                  className={styles.replyInput}
                  placeholder="Reply…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitReply(); }}
                />
                <button className={styles.sendBtn} onClick={submitReply} disabled={sending || !replyText.trim()}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 6.5h9M7 3l4.5 3.5L7 10" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={audioUploadRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadNewVersion(f); }}
      />
    </div>
  );
}

export default function VersionPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '2rem' }}>Loading…</div>}>
      <VersionContent />
    </Suspense>
  );
}
