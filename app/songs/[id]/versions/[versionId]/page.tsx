'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getAuth, getIdentity, formatTimestamp } from '@/lib/auth';
import WaveSurfer from 'wavesurfer.js';
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

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  file_path: string;
  file_name: string;
}

interface Song {
  id: string;
  title: string;
}

const MARKER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce'];

function VersionContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;
  const focusThreadId = searchParams.get('thread');

  const identity = getIdentity();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const markersRef = useRef<HTMLDivElement>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [creatingThread, setCreatingThread] = useState(false);
  const [threadTimestamp, setThreadTimestamp] = useState<number | null>(null);
  const [threadCommentText, setThreadCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformDuration, setWaveformDuration] = useState(0);
  const [markedActions, setMarkedActions] = useState<Set<string>>(new Set());
  const [showActionModal, setShowActionModal] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }
    loadData();
  }, [router, identity, songId, versionId]);

  const loadData = async () => {
    try {
      const supabase = createClient();

      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title')
        .eq('id', songId)
        .single();

      if (songError) throw songError;
      setSong(songData);

      const { data: versionData, error: versionError } = await supabase
        .from('song_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;
      setVersion(versionData);

      // Fetch all versions for this song
      const { data: allVersionsData, error: allVersionsError } = await supabase
        .from('song_versions')
        .select('*')
        .eq('song_id', songId)
        .order('version_number', { ascending: false });

      if (allVersionsError) throw allVersionsError;
      setAllVersions(allVersionsData || []);

      const { data: urlData } = supabase.storage.from('song-files').getPublicUrl(versionData.file_path);
      setAudioUrl(urlData.publicUrl);

      const { data: threadsData, error: threadsError } = await supabase
        .from('comment_threads')
        .select(`
          id,
          timestamp_seconds,
          created_by,
          created_at,
          comments(id, author, body, created_at)
        `)
        .eq('song_version_id', versionId)
        .order('timestamp_seconds', { ascending: true });

      if (threadsError) throw threadsError;
      setThreads(threadsData || []);

      if (focusThreadId && threadsData) {
        const thread = threadsData.find((t) => t.id === focusThreadId);
        if (thread) {
          setSelectedThreadId(focusThreadId);
          setTimeout(() => {
            if (wavesurferRef.current) {
              const duration = wavesurferRef.current.getDuration();
              if (duration > 0) {
                wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
              }
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load version');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#e0e7ff',
      progressColor: '#3b82f6',
      url: audioUrl,
      height: 100,
      cursorWidth: 2,
      cursorColor: '#3b82f6',
    });

    ws.on('ready', () => {
      const duration = ws.getDuration();
      setWaveformDuration(duration);
      renderMarkers();
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    ws.on('click', (relativeX) => {
      const duration = ws.getDuration();
      const clickedTime = relativeX * duration;
      const roundedSeconds = Math.round(clickedTime);

      const existingThread = threads.find((t) => Math.abs(t.timestamp_seconds - roundedSeconds) < 1);

      if (existingThread) {
        setSelectedThreadId(existingThread.id);
        setCreatingThread(false);
      } else {
        setCreatingThread(true);
        setThreadTimestamp(roundedSeconds);
        setThreadCommentText('');
      }
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, threads]);

  const renderMarkers = () => {
    if (!markersRef.current || !threads.length || waveformDuration === 0) return;

    markersRef.current.innerHTML = '';

    threads.forEach((thread, index) => {
      const percent = (thread.timestamp_seconds / waveformDuration) * 100;
      
      const marker = document.createElement('button');
      marker.className = styles.marker;
      marker.style.left = `${percent}%`;
      marker.style.background = MARKER_COLORS[index % MARKER_COLORS.length];
      
      const commentCount = thread.comments?.length || 0;
      marker.innerHTML = `
        <span style="font-size: 14px; font-weight: 600;">●</span>
      `;
      
      marker.title = `${formatTimestamp(thread.timestamp_seconds)} • ${commentCount} comment${commentCount !== 1 ? 's' : ''}`;
      
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedThreadId(thread.id);
        if (wavesurferRef.current) {
          wavesurferRef.current.seekTo(thread.timestamp_seconds / wavesurferRef.current.getDuration());
        }
      });

      marker.addEventListener('mouseenter', () => setHoveredMarkerId(thread.id));
      marker.addEventListener('mouseleave', () => setHoveredMarkerId(null));

      markersRef.current?.appendChild(marker);
    });
  };

  useEffect(() => {
    renderMarkers();
  }, [threads, waveformDuration]);

  const handleCreateThread = async () => {
    if (!threadCommentText.trim() || threadTimestamp === null) return;

    try {
      const response = await fetch('/api/threads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          songId,
          timestamp: threadTimestamp,
          author: identity,
          commentText: threadCommentText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create thread');
      }

      setThreadCommentText('');
      setCreatingThread(false);
      setThreadTimestamp(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating thread');
    }
  };

  const handleReply = async (threadId: string) => {
    if (!replyText.trim()) return;

    try {
      const response = await fetch('/api/threads/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          author: identity,
          text: replyText,
          songId,
          versionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post reply');
      }

      setReplyText('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error posting reply');
    }
  };

  const handleMarkAsAction = async (commentId: string, commentBody: string) => {
    try {
      const description = actionText.trim() || commentBody;

      const response = await fetch('/api/actions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          songId,
          description,
          suggestedBy: identity,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as action');
      }

      setMarkedActions(prev => new Set([...Array.from(prev), commentId]));
      setShowActionModal(null);
      setActionText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error marking as action');
    }
  };

  const getMarkerColor = (index: number) => MARKER_COLORS[index % MARKER_COLORS.length];

  if (loading) return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  if (!song || !version) return <div className={styles.error}>Not found</div>;

  const selectedThread = selectedThreadId ? threads.find((t) => t.id === selectedThreadId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => router.push('/dashboard')}
            className={styles.homeIcon}
            title="Back to Dashboard"
          >
            🏠
          </button>
          <div>
            <h1 className={styles.songTitle}>{song.title}</h1>
            <p className={styles.versionLabel}>
              Version {version.version_number}
              {version.label && ` • ${version.label}`}
            </p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {allVersions && allVersions.length > 1 && (
            <select
              value={versionId}
              onChange={(e) => {
                const newVersionId = e.target.value;
                router.push(`/songs/${songId}/versions/${newVersionId}`);
              }}
              className={styles.versionPicker}
            >
              {allVersions
                .sort((a, b) => b.version_number - a.version_number)
                .map(v => (
                  <option key={v.id} value={v.id}>
                    Version {v.version_number}{v.label ? ` - ${v.label}` : ''}
                  </option>
                ))}
            </select>
          )}
          <p className={styles.user}>
            <span className={styles.userBadge}>{identity?.[0]}</span>
            {identity}
          </p>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.playerPanel}>
          <div className={styles.playerControls}>
            <button
              onClick={() => wavesurferRef.current?.playPause()}
              className={styles.playButton}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <p className={styles.instruction}>Click the waveform to add a comment</p>
          </div>

          <div className={styles.waveformContainer}>
            <div ref={waveformRef} className={styles.waveform} />
            <div ref={markersRef} className={styles.markerTrack} />
          </div>

          {hoveredMarkerId && (
            <div className={styles.markerTooltip}>
              {threads.find(t => t.id === hoveredMarkerId) && (
                <>
                  <p className={styles.tooltipTime}>
                    {formatTimestamp(threads.find(t => t.id === hoveredMarkerId)!.timestamp_seconds)}
                  </p>
                  <p className={styles.tooltipCount}>
                    {threads.find(t => t.id === hoveredMarkerId)!.comments.length} comment
                    {threads.find(t => t.id === hoveredMarkerId)!.comments.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.commentsPanel}>
          {creatingThread && threadTimestamp !== null ? (
            <div className={styles.threadCard}>
              <div className={styles.threadTime}>
                <span className={styles.timeBadge}>{formatTimestamp(threadTimestamp)}</span>
                <h3>New Comment</h3>
              </div>
              <textarea
                value={threadCommentText}
                onChange={(e) => setThreadCommentText(e.target.value)}
                placeholder="What's on your mind..."
                autoFocus
                className={styles.textarea}
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button onClick={handleCreateThread} disabled={!threadCommentText.trim()} className={styles.submitButton}>
                  Post Comment
                </button>
                <button
                  onClick={() => {
                    setCreatingThread(false);
                    setThreadTimestamp(null);
                    setThreadCommentText('');
                    setError('');
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : selectedThread ? (
            <div className={styles.threadCard}>
              <div className={styles.threadTime}>
                <span className={styles.timeBadge}>{formatTimestamp(selectedThread.timestamp_seconds)}</span>
                <h3>Comments</h3>
              </div>

              <div className={styles.messagesContainer}>
                {selectedThread.comments && selectedThread.comments.length > 0 ? (
                  selectedThread.comments.map((comment, idx) => (
                    <div key={comment.id} className={styles.messageCard}>
                      <div className={styles.messageHeader}>
                        <div className={styles.avatarSection}>
                          <div
                            className={styles.avatar}
                            style={{
                              background:
                                ['#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'][
                                  idx % 6
                                ],
                            }}
                          >
                            {comment.author[0]}
                          </div>
                          <div>
                            <strong className={styles.author}>{comment.author}</strong>
                            <span className={styles.timestamp}>{new Date(comment.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className={styles.messageBody}>{comment.body}</p>
                      {!markedActions.has(comment.id) && (
                        <button
                          onClick={() => {
                            setShowActionModal(comment.id);
                            setActionText(comment.body);
                          }}
                          className={styles.actionButton}
                        >
                          📌 Mark as Action
                        </button>
                      )}
                      {markedActions.has(comment.id) && <div className={styles.actionBadge}>✓ Action</div>}
                    </div>
                  ))
                ) : (
                  <p className={styles.empty}>No comments yet</p>
                )}
              </div>

              <div className={styles.replyForm}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply..."
                  className={styles.textarea}
                />
                <button onClick={() => handleReply(selectedThread.id)} disabled={!replyText.trim()} className={styles.submitButton}>
                  Reply
                </button>
              </div>
            </div>
          ) : threads.length > 0 ? (
            <div className={styles.threadsList}>
              <h3 className={styles.panelTitle}>Comments ({threads.length})</h3>
              <div className={styles.threadsGrid}>
                {threads.map((thread, index) => (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      if (wavesurferRef.current) {
                        wavesurferRef.current.seekTo(thread.timestamp_seconds / wavesurferRef.current.getDuration());
                      }
                    }}
                    className={styles.threadPreview}
                  >
                    <div
                      className={styles.threadDot}
                      style={{ background: getMarkerColor(index) }}
                    />
                    <div className={styles.threadInfo}>
                      <span className={styles.threadTime}>{formatTimestamp(thread.timestamp_seconds)}</span>
                      <p className={styles.preview}>
                        {thread.comments?.[0]?.body.substring(0, 50)}...
                      </p>
                    </div>
                    <span className={styles.count}>{thread.comments?.length || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No comments yet. Click the waveform to add one.</p>
            </div>
          )}
        </div>
      </div>

      {showActionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Mark as Action</h3>
            <textarea value={actionText} onChange={(e) => setActionText(e.target.value)} className={styles.textarea} />
            <div className={styles.actions}>
              <button onClick={() => handleMarkAsAction(showActionModal, actionText)} className={styles.submitButton}>
                Mark as Action
              </button>
              <button onClick={() => setShowActionModal(null)} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VersionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VersionContent />
    </Suspense>
  );
}