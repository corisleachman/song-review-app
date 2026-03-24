'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getIdentity, getAuth, formatTimestamp } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import WaveSurfer from 'wavesurfer.js';
import Link from 'next/link';
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

export default function VersionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;
  const focusThreadId = searchParams.get('thread');

  const identity = getIdentity();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    focusThreadId
  );
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [creatingThread, setCreatingThread] = useState(false);
  const [threadTimestamp, setThreadTimestamp] = useState<number | null>(null);
  const [threadCommentText, setThreadCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/');
      return;
    }
    loadData();
  }, [router, identity, songId, versionId]);

  const loadData = async () => {
    try {
      const supabase = createClient();

      // Load song
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('id, title')
        .eq('id', songId)
        .single();

      if (songError) throw songError;
      setSong(songData);

      // Load version
      const { data: versionData, error: versionError } = await supabase
        .from('song_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;
      setVersion(versionData);

      // Get audio download URL
      const { data: urlData } = supabase.storage
        .from('song-files')
        .getPublicUrl(versionData.file_path);

      setAudioUrl(urlData.publicUrl);

      // Load threads with comments
      const { data: threadsData, error: threadsError } = await supabase
        .from('comment_threads')
        .select(
          `
          id,
          timestamp_seconds,
          created_by,
          created_at,
          comments(id, author, body, created_at)
        `
        )
        .eq('song_version_id', versionId)
        .order('timestamp_seconds', { ascending: true });

      if (threadsError) throw threadsError;
      setThreads(threadsData || []);

      // If there's a focused thread ID, set it after loading
      if (focusThreadId && threadsData) {
        setSelectedThreadId(focusThreadId);
        const thread = threadsData.find((t) => t.id === focusThreadId);
        if (thread) {
          // Jump to that timestamp
          setTimeout(() => {
            if (wavesurferRef.current) {
              wavesurferRef.current.seekTo(thread.timestamp_seconds / wavesurferRef.current.getDuration());
            }
          }, 100);
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
      waveColor: '#cccccc',
      progressColor: '#000000',
      url: audioUrl,
      height: 100,
    });

    ws.on('ready', () => {
      console.log('WaveSurfer ready');
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    ws.on('click', (relativeX) => {
      const duration = ws.getDuration();
      const clickedTime = relativeX * duration;
      const roundedSeconds = Math.round(clickedTime);

      // Check if clicking on existing thread
      const existingThread = threads.find(
        (t) => Math.abs(t.timestamp_seconds - roundedSeconds) < 2
      );

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

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!song || !version) return <div className={styles.error}>Not found</div>;

  const selectedThread = selectedThreadId
    ? threads.find((t) => t.id === selectedThreadId)
    : null;

  return (
    <div className={styles.container}>
      <Link href={`/songs/${songId}`} className={styles.backLink}>
        ← Back to Song
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.songTitle}>{song.title}</h1>
          <p className={styles.versionLabel}>
            Version {version.version_number}
            {version.label && ` - ${version.label}`}
          </p>
        </div>
        <p className={styles.user}>Logged in as: {identity}</p>
      </div>

      <div className={styles.playerSection}>
        <div className={styles.controls}>
          <button
            onClick={() => {
              if (wavesurferRef.current) {
                wavesurferRef.current.playPause();
              }
            }}
            className={styles.playButton}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <p className={styles.instruction}>
            Click on the waveform to create a comment
          </p>
        </div>
        <div ref={waveformRef} className={styles.waveform} />
        <div className={styles.threadMarkers}>
          {threads.map((thread) => {
            const duration = wavesurferRef.current?.getDuration() || 1;
            const position = (thread.timestamp_seconds / duration) * 100;
            return (
              <button
                key={thread.id}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  setCreatingThread(false);
                  if (wavesurferRef.current) {
                    wavesurferRef.current.seekTo(
                      thread.timestamp_seconds / wavesurferRef.current.getDuration()
                    );
                  }
                }}
                className={`${styles.marker} ${
                  selectedThreadId === thread.id ? styles.activeMarker : ''
                }`}
                style={{ left: `${position}%` }}
                title={formatTimestamp(thread.timestamp_seconds)}
              >
                •
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.threadsSection}>
        {creatingThread && threadTimestamp !== null ? (
          <div className={styles.threadPanel}>
            <h3>New Comment at {formatTimestamp(threadTimestamp)}</h3>
            <textarea
              value={threadCommentText}
              onChange={(e) => setThreadCommentText(e.target.value)}
              placeholder="Write your comment..."
              autoFocus
              className={styles.textarea}
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button
                onClick={handleCreateThread}
                disabled={!threadCommentText.trim()}
                className={styles.submitButton}
              >
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
          <div className={styles.threadPanel}>
            <h3>Thread at {formatTimestamp(selectedThread.timestamp_seconds)}</h3>
            <div className={styles.threadMessages}>
              {selectedThread.comments && selectedThread.comments.length > 0 ? (
                selectedThread.comments.map((comment) => (
                  <div key={comment.id} className={styles.message}>
                    <div className={styles.messageHeader}>
                      <strong>{comment.author}</strong>
                      <span className={styles.timestamp}>
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={styles.messageBody}>{comment.body}</p>
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
                placeholder="Write a reply..."
                className={styles.textarea}
              />
              <div className={styles.actions}>
                <button
                  onClick={() => handleReply(selectedThread.id)}
                  disabled={!replyText.trim()}
                  className={styles.submitButton}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        ) : threads.length > 0 ? (
          <div className={styles.threadPanel}>
            <h3>Comments ({threads.length})</h3>
            <div className={styles.threadsList}>
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    if (wavesurferRef.current) {
                      wavesurferRef.current.seekTo(
                        thread.timestamp_seconds / wavesurferRef.current.getDuration()
                      );
                    }
                  }}
                  className={styles.threadLink}
                >
                  <span className={styles.threadTime}>
                    {formatTimestamp(thread.timestamp_seconds)}
                  </span>
                  <span className={styles.threadPreview}>
                    {thread.comments && thread.comments.length > 0
                      ? thread.comments[0].body.substring(0, 50) + '...'
                      : 'No comments'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.threadPanel}>
            <p className={styles.empty}>No comments yet. Click the waveform to add one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
