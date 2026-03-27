'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity, formatTimestamp } from '@/lib/auth';
import styles from './version.module.css';

const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

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

interface Task {
  id: string;
  song_id: string;
  description: string;
  status: 'pending' | 'completed';
  sort_order: number;
  created_at: string;
}

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  notes?: string | null;
  file_path: string;
  file_name: string;
  created_by: string;
  created_at?: string;
}

interface Song {
  id: string;
  title: string;
  image_url: string | null;
}

const MARKER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce'];

function formatVersionDate(value?: string) {
  if (!value) return null;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatThreadPreview(text?: string) {
  if (!text) return 'No text yet';
  return text.length > 68 ? `${text.slice(0, 68)}…` : text;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateAudioFile(file: File) {
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name);

  if (!isAudio) {
    return 'Choose an audio file such as MP3, WAV, M4A, FLAC, or OGG.';
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return 'That file is too large for the current upload flow. Try a file under 200 MB.';
  }

  return null;
}

function getNextActionStatus(status: Action['status']) {
  if (status === 'pending') return 'approved';
  if (status === 'approved') return 'completed';
  return 'pending';
}

export default function VersionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const versionId = params.versionId as string;

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveLoadIdRef = useRef(0);
  const waveRetryTimerRef = useRef<number | null>(null);
  const waveLoadTimeoutRef = useRef<number | null>(null);
  const waveAutoRetryUsedRef = useRef(false);
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);
  const hoverXRef = useRef<number>(-1);
  const pendingTimestampRef = useRef<number | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

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
  const [isRetryingWave, setIsRetryingWave] = useState(false);
  const [waveReloadNonce, setWaveReloadNonce] = useState(0);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [clickXPercent, setClickXPercent] = useState<number>(0);
  const [editingLabel, setEditingLabel] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [actionModalCommentId, setActionModalCommentId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [actionStatus, setActionStatus] = useState<'pending' | 'approved' | 'completed'>('pending');
  // markedCommentIds derived from loaded actions — no separate state needed
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [threadLinkCopied, setThreadLinkCopied] = useState(false);
  const [timestampCopied, setTimestampCopied] = useState(false);
  const [showUploadVersionModal, setShowUploadVersionModal] = useState(false);
  const [pendingVersionFile, setPendingVersionFile] = useState<File | null>(null);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [versionUploadProgress, setVersionUploadProgress] = useState(0);
  const [versionUploadError, setVersionUploadError] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const statusToastTimerRef = useRef<number | null>(null);
  const dragTaskId = useRef<string | null>(null);

  const supabase = createClient();

  const clearWaveTimers = useCallback(() => {
    if (waveRetryTimerRef.current) {
      window.clearTimeout(waveRetryTimerRef.current);
      waveRetryTimerRef.current = null;
    }
    if (waveLoadTimeoutRef.current) {
      window.clearTimeout(waveLoadTimeoutRef.current);
      waveLoadTimeoutRef.current = null;
    }
  }, []);

  const retryWaveform = useCallback((mode: 'auto' | 'manual' = 'manual') => {
    clearWaveTimers();
    if (mode === 'manual') {
      waveAutoRetryUsedRef.current = false;
    }
    setWaveErr(null);
    setIsReady(false);
    setIsRetryingWave(mode === 'auto');
    setCurrentTime(0);
    setDuration(0);
    setWaveReloadNonce(count => count + 1);
  }, [clearWaveTimers]);

  const showStatusToast = useCallback((message: string) => {
    if (statusToastTimerRef.current) {
      window.clearTimeout(statusToastTimerRef.current);
    }
    setStatusToast(message);
    statusToastTimerRef.current = window.setTimeout(() => {
      setStatusToast(null);
      statusToastTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    const id = getIdentity();
    if (!id) { router.push('/identify'); return; }
    setIdentity(id);
    load();
  }, [songId, versionId]);

  useEffect(() => {
    return () => {
      if (statusToastTimerRef.current) {
        window.clearTimeout(statusToastTimerRef.current);
      }
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [songRes, versionRes, versionsRes] = await Promise.all([
        supabase.from('songs').select('id, title, image_url').eq('id', songId).single(),
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
      await Promise.all([loadThreads(), loadActions(), loadTasks()]);
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
    // Fetch via API route which does a proper server-side join by version
    const res = await fetch(`/api/actions/by-song/${songId}?versionId=${versionId}`);
    if (res.ok) {
      const { actions: data } = await res.json();
      setActions(data || []);
    }
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
    const loadId = ++waveLoadIdRef.current;
    clearWaveTimers();

    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch {}
      wavesurferRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {}
      audioRef.current = null;
    }

    const WaveSurfer = (await import('wavesurfer.js')).default;
    if (!container.isConnected || loadId !== waveLoadIdRef.current) return;

    // Create a native <audio> element and pass it to WaveSurfer.
    // This bypasses WaveSurfer's internal fetch entirely — which fixes mobile
    // where signed URLs or CORS can silently block the internal fetch.
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.src = url;
    audioRef.current = audio;

    const handleWaveFailure = (message: string) => {
      if (loadId !== waveLoadIdRef.current) return;
      clearWaveTimers();

      if (!waveAutoRetryUsedRef.current) {
        waveAutoRetryUsedRef.current = true;
        setWaveErr('Waveform load interrupted. Retrying…');
        setIsRetryingWave(true);
        waveRetryTimerRef.current = window.setTimeout(() => {
          if (loadId !== waveLoadIdRef.current) return;
          retryWaveform('auto');
        }, 350);
        return;
      }

      setIsRetryingWave(false);
      setWaveErr(message);
    };

    audio.addEventListener('error', () => {
      handleWaveFailure('Could not load this audio file. Try again.');
    });

    waveLoadTimeoutRef.current = window.setTimeout(() => {
      handleWaveFailure('Waveform took too long to load. Try again.');
    }, 12000);

    const ws = WaveSurfer.create({
      container,
      waveColor: 'rgba(255,255,255,0.2)',
      progressColor: '#ff1493',
      cursorColor: 'rgba(255,255,255,0.5)',
      cursorWidth: 1,
      height: 96,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      normalize: true,
      media: audio,
    });

    ws.on('ready', (dur: number) => {
      if (loadId !== waveLoadIdRef.current) return;
      clearWaveTimers();
      setWaveErr(null);
      setDuration(dur);
      setIsReady(true);
      setIsRetryingWave(false);
    });
    ws.on('timeupdate', (t: number) => setCurrentTime(t));
    ws.on('seeking', (t: number) => setCurrentTime(t));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', (e: Error) => {
      const message = e?.message || String(e);
      if (loadId !== waveLoadIdRef.current || message.toLowerCase().includes('aborted')) return;
      console.error('WaveSurfer error:', e);
      handleWaveFailure(message);
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
          setClickXPercent(relX * 100);
          setNewComment('');
          setSelectedThreadId(null);
        }
        return prev;
      });
    });

    // Catch aborted/stale loads so teardown races do not surface as runtime errors.
    void ws.load(audio.src).catch((error: Error) => {
      const message = error?.message || String(error);
      if (loadId !== waveLoadIdRef.current || message.toLowerCase().includes('aborted')) return;
      console.error('WaveSurfer load error:', error);
      handleWaveFailure(message);
    });
    wavesurferRef.current = ws;
  }, [clearWaveTimers, retryWaveform]);

  const stopPlayback = useCallback(() => {
    if (wavesurferRef.current) {
      try { wavesurferRef.current.pause(); } catch {}
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
    setIsPlaying(false);
  }, []);

  // Draw hover overlay on canvas: dimmed pink between playhead and mouse
  const drawHoverOverlay = () => {
    const canvas = hoverCanvasRef.current;
    const ws = wavesurferRef.current;
    if (!canvas || !ws) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const hx = hoverXRef.current;
    if (hx < 0) return;
    const dur = ws.getDuration();
    if (!dur) return;
    const playedX = (ws.getCurrentTime() / dur) * w;
    const mouseX = hx * w;
    if (mouseX > playedX) {
      ctx.fillStyle = 'rgba(255,20,147,0.3)';
      ctx.fillRect(playedX, 0, mouseX - playedX, h);
    }
  };

  useEffect(() => {
    if (!audioUrl) return;
    waveAutoRetryUsedRef.current = false;
    setIsReady(false);
    setWaveErr(null);
    setIsRetryingWave(false);
    setDuration(0);
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
      clearWaveTimers();
      waveLoadIdRef.current += 1;
      stopPlayback();
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch {}
        wavesurferRef.current = null;
      }
      if (audioRef.current) {
        try {
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        } catch {}
        audioRef.current = null;
      }
    };
  }, [audioUrl, waveReloadNonce, clearWaveTimers, initWaveSurfer, stopPlayback]);

  async function loadTasks() {
    const { data } = await supabase
      .from('song_tasks')
      .select('*')
      .eq('song_id', songId)
      .order('sort_order', { ascending: true });
    setTasks(data || []);
  }

  async function addTask() {
    if (!newTaskText.trim()) return;
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, description: newTaskText.trim() }),
    });
    if (res.ok) {
      setNewTaskText('');
      await loadTasks();
      showStatusToast('Task added');
    }
  }

  async function toggleTask(task: Task) {
    const next = task.status === 'pending' ? 'completed' : 'pending';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    await loadTasks();
    showStatusToast(next === 'completed' ? 'Task completed' : 'Task moved back to pending');
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
    showStatusToast('Task removed');
  }

  async function saveTaskEdit(taskId: string) {
    if (!editingTaskText.trim()) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editingTaskText.trim() }),
    });
    setEditingTaskId(null);
    await loadTasks();
    showStatusToast('Task updated');
  }

  function handleTaskDragStart(taskId: string) {
    dragTaskId.current = taskId;
  }

  function handleTaskDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    setDragOverTaskId(overId);
  }

  async function handleTaskDrop(droppedOnId: string) {
    const fromId = dragTaskId.current;
    if (!fromId || fromId === droppedOnId) { setDragOverTaskId(null); return; }
    const pending = tasks.filter(t => t.status === 'pending');
    const fromIdx = pending.findIndex(t => t.id === fromId);
    const toIdx = pending.findIndex(t => t.id === droppedOnId);
    if (fromIdx === -1 || toIdx === -1) { setDragOverTaskId(null); return; }
    const reordered = [...pending];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setTasks([...reordered, ...tasks.filter(t => t.status === 'completed')]);
    setDragOverTaskId(null);
    dragTaskId.current = null;
    await fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(t => t.id) }),
    });
  }

  const toggleAction = async (action: Action) => {
    const newStatus = getNextActionStatus(action.status);
    await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadActions();
    showStatusToast(newStatus === 'completed' ? 'Action completed' : newStatus === 'approved' ? 'Action approved' : 'Action moved back to pending');
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
    if (!actionText.trim()) return;

    if (editingActionId) {
      await fetch(`/api/actions/${editingActionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: actionText.trim(), status: actionStatus }),
      });
    } else if (actionModalCommentId) {
      await fetch('/api/actions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: actionModalCommentId,
          songId,
          description: actionText.trim(),
          suggestedBy: identity,
          status: actionStatus,
        }),
      });
    }

    setActionModalCommentId(null);
    setEditingActionId(null);
    setActionText('');
    setActionStatus('pending');
    await loadActions();
    showStatusToast(editingActionId ? 'Action updated' : 'Action saved');
  };

  const saveLabelEdit = async () => {
    if (!version) return;
    setEditingLabel(false);
    const trimmed = labelDraft.trim();
    if (trimmed === (version.label ?? '')) return; // no change
    await fetch(`/api/versions/${version.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: trimmed || null }),
    });
    setVersion(prev => prev ? { ...prev, label: trimmed || null } : prev);
    // Refresh versions list for dropdown
    const { data } = await supabase.from('song_versions').select('*').eq('song_id', songId).order('version_number', { ascending: true });
    setVersions(data || []);
  };

  const seekToThread = (thread: Thread) => {
    setSelectedThreadId(thread.id);
    setPendingTimestamp(null);
    pendingTimestampRef.current = null;
    if (wavesurferRef.current && isReady && duration > 0) {
      wavesurferRef.current.seekTo(thread.timestamp_seconds / duration);
    }
  };

  async function copyThreadLink(threadId: string) {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('threadId', threadId);

    try {
      await navigator.clipboard.writeText(url.toString());
      setThreadLinkCopied(true);
      window.setTimeout(() => setThreadLinkCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy thread link:', error);
    }
  }

  async function copyThreadTimestamp(timestampSeconds: number) {
    try {
      await navigator.clipboard.writeText(formatTimestamp(Math.floor(timestampSeconds)));
      setTimestampCopied(true);
      window.setTimeout(() => setTimestampCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy timestamp:', error);
    }
  }

  function handleVersionFilePicked(file?: File) {
    if (!file) return;

    const validationError = validateAudioFile(file);
    if (validationError) {
      setVersionUploadError(validationError);
      setPendingVersionFile(null);
      setShowUploadVersionModal(true);
      return;
    }

    setPendingVersionFile(file);
    setVersionUploadError('');
    setVersionUploadProgress(0);
    setNewVersionLabel('');
    setNewVersionNotes('');
    setShowUploadVersionModal(true);
  }

  async function uploadNewVersion() {
    if (!pendingVersionFile || !identity) return;

    setUploadingVersion(true);
    setVersionUploadError('');
    setVersionUploadProgress(0);

    try {
      const res = await fetch('/api/versions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          fileName: pendingVersionFile.name,
          fileSize: pendingVersionFile.size,
          createdBy: identity,
          label: newVersionLabel.trim() || null,
          notes: newVersionNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.uploadUrl || !data.versionId) {
        throw new Error(data.error || 'Could not start the upload.');
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', event => {
          if (event.lengthComputable) {
            setVersionUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', pendingVersionFile.type || 'audio/mpeg');
        xhr.send(pendingVersionFile);
      });

      setShowUploadVersionModal(false);
      setPendingVersionFile(null);
      setNewVersionLabel('');
      setNewVersionNotes('');
      showStatusToast('Version uploaded');
      router.push(`/songs/${songId}/versions/${data.versionId}`);
    } catch (error) {
      setVersionUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploadingVersion(false);
    }
  }

  function openEditAction(action: Action) {
    setEditingActionId(action.id);
    setActionModalCommentId(action.comment_id);
    setActionText(action.description);
    setActionStatus(action.status as 'pending' | 'approved' | 'completed');
  }

  if (loading) return <div className={styles.loading}>Loading this version…</div>;

  const selectedThread = threads.find(t => t.id === selectedThreadId) ?? null;
  const pendingActions = actions.filter(a => a.status !== 'completed');
  const completedActions = actions.filter(a => a.status === 'completed');
  const versionMeta = [
    version?.created_by ? `Uploaded by ${version.created_by}` : null,
    version?.created_at ? formatVersionDate(version.created_at) : null,
    duration > 0 ? formatTimestamp(Math.floor(duration)) : null,
  ].filter(Boolean);
  const versionNotes = version?.notes?.trim() || '';

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div
        className={styles.hero}
        style={song?.image_url ? {
          backgroundImage: `url(${song.image_url})`,
        } : undefined}
      >
        {/* Gradient overlay so text is always readable */}
        <div className={styles.heroOverlay}>

          {/* Nav row */}
          <div className={styles.heroNav}>
            <button className={styles.songsBtn} onClick={() => { stopPlayback(); router.push('/dashboard'); }}>← Songs</button>
            <div className={styles.heroNavRight}>
              <div className={styles.avatar}>{identity?.[0]?.toUpperCase()}</div>
            </div>
          </div>

          <div className={styles.heroActionRow}>
            {versions.length > 0 && (
              <button className={styles.changeVersionBtn} onClick={() => setShowVersionModal(true)}>
                Change Version
              </button>
            )}
            <button className={styles.uploadBtn} onClick={() => versionFileInputRef.current?.click()}>
              ↑ Upload new version
            </button>
          </div>

          {/* Main hero content */}
          <div className={styles.heroContent}>

            {/* Left: title, controls, waveform */}
            <div className={styles.heroLeft}>
              <div className={styles.heroMeta}>
                {version && (
                  editingLabel ? (
                    <input
                      className={styles.heroBadgeInput}
                      value={labelDraft}
                      autoFocus
                      placeholder={`v${version.version_number}`}
                      onChange={e => setLabelDraft(e.target.value)}
                      onBlur={saveLabelEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLabelEdit();
                        if (e.key === 'Escape') setEditingLabel(false);
                      }}
                    />
                  ) : (
                    <span
                      className={styles.heroBadge}
                      title="Double-click to rename"
                      onDoubleClick={() => { setLabelDraft(version.label ?? ''); setEditingLabel(true); }}
                    >
                      {version.label || `v${version.version_number}`}
                      <span className={styles.heroBadgeEdit}>✎</span>
                    </span>
                  )
                )}
              </div>
              <h1 className={styles.heroTitle}>{song?.title}</h1>
              <p className={styles.heroArtist}>Polite Rebels</p>
              {versionMeta.length > 0 && (
                <div className={styles.heroVersionMeta}>
                  {versionMeta.map((item, index) => (
                    <span key={`${item}-${index}`}>{item}</span>
                  ))}
                </div>
              )}
              {versionNotes && (
                <div className={styles.heroVersionNotes}>
                  <span className={styles.heroVersionNotesLabel}>Version note</span>
                  <p className={styles.heroVersionNotesText}>{versionNotes}</p>
                </div>
              )}
              <div className={styles.heroControls}>
                <button
                  className={styles.heroPlayBtn}
                  onClick={() => wavesurferRef.current?.playPause()}
                  disabled={!isReady}
                >
                  {isPlaying
                    ? <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><rect x="3" y="2" width="5" height="16" rx="1.5"/><rect x="12" y="2" width="5" height="16" rx="1.5"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M4 2l14 8-14 8z"/></svg>
                  }
                </button>
                <span className={styles.heroTime}>
                  {formatTimestamp(Math.floor(currentTime))}
                  <span className={styles.heroTimeSep}> / </span>
                  {formatTimestamp(Math.floor(duration))}
                </span>
                {!isReady && audioUrl && !waveErr && (
                  <span className={styles.loadingWave}>
                    {isRetryingWave ? 'Retrying…' : 'Loading…'}
                  </span>
                )}
                {waveErr && (
                  <span className={styles.waveStatus}>
                    <span className={styles.waveErrMsg}>⚠ {waveErr}</span>
                    {!isRetryingWave && (
                      <button
                        type="button"
                        className={styles.waveRetryBtn}
                        onClick={() => retryWaveform('manual')}
                      >
                        Retry
                      </button>
                    )}
                  </span>
                )}
              </div>

            </div>{/* /heroLeft */}

            {/* Right: artwork */}
            <div className={styles.heroArtwork}>
              {song?.image_url ? (
                <img src={song.image_url} alt={song.title} className={styles.heroArtworkImg} />
              ) : (
                <div className={styles.heroArtworkPlaceholder}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                    <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.2)"/>
                  </svg>
                </div>
              )}
              <label className={styles.heroArtworkUpload} title="Upload cover art">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('songId', songId);
                    fd.append('file', file);
                    const res = await fetch('/api/songs/upload-image', { method: 'POST', body: fd });
                    if (res.ok) {
                      const { imageUrl } = await res.json();
                      setSong(prev => prev ? { ...prev, image_url: imageUrl } : prev);
                    }
                  }}
                />
                <span>Replace image</span>
              </label>
            </div>



            {/* Waveform — direct child of heroContent, full width below on mobile */}
            <div className={styles.heroWaveform}>
                <div
                  className={styles.waveformWrap}
                  onMouseMove={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    hoverXRef.current = (e.clientX - rect.left) / rect.width;
                    drawHoverOverlay();
                  }}
                  onMouseLeave={() => {
                    hoverXRef.current = -1;
                    const canvas = hoverCanvasRef.current;
                    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                  }}
                >
                  <div ref={waveformRef} className={styles.waveform} style={{ height: 80, minHeight: 80 }} />
                  <canvas
                    ref={hoverCanvasRef}
                    className={styles.hoverCanvas}
                    width={1200}
                    height={80}
                    style={{ pointerEvents: 'none' }}
                  />
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
                  {pendingTimestamp !== null && (
                    <div
                      className={styles.floatingCommentBox}
                      style={{ left: `clamp(0px, calc(${clickXPercent}% - 200px), calc(100% - 400px))` }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span className={styles.inlineFormTime}>@ {formatTimestamp(Math.floor(pendingTimestamp))}</span>
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
                        <button className={styles.cancelBtn} onClick={() => { setPendingTimestamp(null); pendingTimestampRef.current = null; setClickXPercent(0); }}>Cancel</button>
                        <button className={styles.postBtn} onClick={submitThread} disabled={!newComment.trim() || posting}>
                          {posting ? 'Posting…' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!pendingTimestamp && <p className={styles.waveHint}>click anywhere on the waveform to leave a comment</p>}
            </div>

          </div>{/* /heroContent */}

        </div>{/* /heroOverlay */}
      </div>{/* /hero */}

      {/* Three-column body */}
      <div className={styles.body}>

        {/* Left: Actions */}
        <div className={styles.actionsPanel}>
          <div className={styles.actionsPanelHeader}>
            <span className={styles.actionsPanelTitle}>ACTIONS</span>
            <span className={styles.pendingBadge}>{pendingActions.length} pending</span>
          </div>
          {actions.length === 0 && <p className={styles.empty}>No actions yet. Turn a comment into an action when something needs following up.</p>}
          {[...pendingActions, ...completedActions].map(action => (
            <div key={action.id} className={`${styles.actionItem} ${action.status === 'completed' ? styles.actionDone : ''}`}>
              <button
                className={`${styles.actionToggle} ${action.status === 'completed' ? styles.actionToggleDone : action.status === 'approved' ? styles.actionToggleApproved : ''}`}
                onClick={() => toggleAction(action)}
                title={`Cycle status (${action.status})`}
              >
                {action.status === 'completed' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {action.status === 'approved' && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
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
                <div className={styles.actionControls}>
                  <span className={`${styles.actionStatusPill} ${action.status === 'approved' ? styles.actionStatusApproved : action.status === 'completed' ? styles.actionStatusCompleted : ''}`}>
                    {action.status}
                  </span>
                  <button className={styles.actionEditBtn} onClick={() => openEditAction(action)}>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Threads */}
        <div className={styles.threadsPanel}>
          {selectedThread ? (
            <>
              <div className={styles.threadsPanelHeader}>
                <div className={styles.threadHeaderInfo}>
                  <div className={styles.threadMarkerDot} style={{ background: MARKER_COLORS[threads.findIndex(t => t.id === selectedThread.id) % MARKER_COLORS.length] }} />
                  <div className={styles.threadHeaderMeta}>
                    <span className={styles.threadTimestamp}>@ {formatTimestamp(selectedThread.timestamp_seconds)}</span>
                    <span className={styles.threadHeaderCount}>
                      {selectedThread.comments.length} message{selectedThread.comments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className={styles.threadHeaderActions}>
                  <button className={styles.threadActionBtn} onClick={() => seekToThread(selectedThread)}>
                    Jump to time
                  </button>
                  <button className={styles.threadActionBtn} onClick={() => copyThreadTimestamp(selectedThread.timestamp_seconds)}>
                    {timestampCopied ? 'Copied time' : 'Copy timestamp'}
                  </button>
                  <button className={styles.threadActionBtn} onClick={() => copyThreadLink(selectedThread.id)}>
                    {threadLinkCopied ? 'Copied link' : 'Copy link'}
                  </button>
                </div>
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
                    {!actions.some(a => a.comment_id === c.id) && (
                      <button className={styles.markActionBtn} onClick={() => {
                        setActionModalCommentId(c.id);
                        setEditingActionId(null);
                        setActionText(c.body);
                        setActionStatus('pending');
                      }}>
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
                ? <p className={styles.empty}>No comments yet. Click the waveform to start the conversation.</p>
                : (
                  <div className={styles.threadIndexList}>
                    {threads.map((t, i) => (
                      <button key={t.id} className={styles.threadIndexItem} onClick={() => seekToThread(t)}>
                        <div className={styles.threadIndexDot} style={{ background: MARKER_COLORS[i % MARKER_COLORS.length] }} />
                        <div className={styles.threadIndexBody}>
                          <div className={styles.threadIndexTop}>
                            <span className={styles.threadIndexTime}>@ {formatTimestamp(t.timestamp_seconds)}</span>
                            <span className={styles.threadIndexCount}>
                              {t.comments?.length || 0} message{(t.comments?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className={styles.threadIndexPreview}>
                            {formatThreadPreview(t.comments?.[0]?.body)}
                          </span>
                          <span className={styles.threadIndexMeta}>
                            Last reply by {t.comments?.[t.comments.length - 1]?.author || t.created_by}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              }
            </>
          )}
        </div>
        {/* Right: Song Admin */}
        <div className={styles.adminPanel}>
          <div className={styles.adminPanelHeader}>
            <span className={styles.adminPanelTitle}>SONG ADMIN</span>
            {tasks.filter(t => t.status === 'pending').length > 0 && (
              <span className={styles.adminCount}>{tasks.filter(t => t.status === 'pending').length}</span>
            )}
          </div>

          {/* Add task input */}
          <div className={styles.addTaskRow}>
            <input
              className={styles.addTaskInput}
              placeholder="Add a task…"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
            />
            <button className={styles.addTaskBtn} onClick={addTask} disabled={!newTaskText.trim()}>
              +
            </button>
          </div>

          {/* Pending tasks */}
          <div className={styles.taskList}>
            {tasks.filter(t => t.status === 'pending').length === 0 && (
              <p className={styles.taskEmpty}>No song admin tasks yet. Add one when there is something to chase.</p>
            )}
            {tasks.filter(t => t.status === 'pending').map(task => (
              <div
                key={task.id}
                className={`${styles.taskRow} ${dragOverTaskId === task.id ? styles.taskRowDragOver : ''}`}
                draggable
                onDragStart={() => handleTaskDragStart(task.id)}
                onDragOver={e => handleTaskDragOver(e, task.id)}
                onDrop={() => handleTaskDrop(task.id)}
                onDragLeave={() => setDragOverTaskId(null)}
              >
                <span className={styles.taskDragHandle}>⠿</span>
                <button className={styles.taskCircle} onClick={() => toggleTask(task)} title="Mark complete" />
                {editingTaskId === task.id ? (
                  <input
                    className={styles.taskEditInput}
                    value={editingTaskText}
                    autoFocus
                    onChange={e => setEditingTaskText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTaskEdit(task.id);
                      if (e.key === 'Escape') setEditingTaskId(null);
                    }}
                    onBlur={() => saveTaskEdit(task.id)}
                  />
                ) : (
                  <span
                    className={styles.taskDesc}
                    onDoubleClick={() => { setEditingTaskId(task.id); setEditingTaskText(task.description); }}
                    title="Double-click to edit"
                  >
                    {task.description}
                  </span>
                )}
                <button className={styles.taskDeleteBtn} onClick={() => deleteTask(task.id)} title="Delete">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Completed tasks */}
          {tasks.filter(t => t.status === 'completed').length > 0 && (
            <div className={styles.completedSection}>
              <p className={styles.completedHeading}>
                COMPLETED <span className={styles.completedCount}>{tasks.filter(t => t.status === 'completed').length}</span>
              </p>
              {tasks.filter(t => t.status === 'completed').map(task => (
                <div key={task.id} className={`${styles.taskRow} ${styles.taskRowDone}`}>
                  <span className={styles.taskDragHandle} style={{ opacity: 0 }}>⠿</span>
                  <button className={`${styles.taskCircle} ${styles.taskCircleDone}`} onClick={() => toggleTask(task)} title="Mark pending">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2.5 2.5L7 1.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className={`${styles.taskDesc} ${styles.taskDescDone}`}>{task.description}</span>
                  <button className={styles.taskDeleteBtn} onClick={() => deleteTask(task.id)} title="Delete">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Action modal */}
      {(actionModalCommentId || editingActionId) && (
        <div className={styles.modalOverlay} onClick={() => { setActionModalCommentId(null); setEditingActionId(null); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editingActionId ? 'Edit Action' : 'Mark as Action'}</h3>
            <textarea className={styles.modalTextarea} value={actionText} onChange={e => setActionText(e.target.value)} rows={3} />
            <div className={styles.actionStateRow}>
              {(['pending', 'approved', 'completed'] as const).map(status => (
                <button
                  key={status}
                  className={`${styles.actionStateBtn} ${actionStatus === status ? styles.actionStateBtnActive : ''}`}
                  onClick={() => setActionStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => { setActionModalCommentId(null); setEditingActionId(null); }}>Cancel</button>
              <button className={styles.postBtn} onClick={submitAction} disabled={!actionText.trim()}>
                {editingActionId ? 'Save changes' : 'Save Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusToast && <div className={styles.statusToast}>{statusToast}</div>}

      {showUploadVersionModal && (
        <div className={styles.modalOverlay} onClick={() => { if (!uploadingVersion) setShowUploadVersionModal(false); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Upload New Version</h3>
            {pendingVersionFile ? (
              <div className={styles.uploadMetaCard}>
                <strong>{pendingVersionFile.name}</strong>
                <span>{formatFileSize(pendingVersionFile.size)}</span>
              </div>
            ) : (
              <div className={styles.uploadMetaCard}>
                <strong>No file selected</strong>
                <span>Choose an MP3, WAV, M4A, FLAC, or OGG file.</span>
              </div>
            )}
            <input
              className={styles.modalInput}
              placeholder='Version label (optional, e.g. "Mix notes applied")'
              value={newVersionLabel}
              onChange={e => setNewVersionLabel(e.target.value)}
              disabled={uploadingVersion}
            />
            <textarea
              className={styles.modalTextarea}
              placeholder='Version notes (optional, e.g. "New vocal comp and tighter bridge")'
              value={newVersionNotes}
              onChange={e => setNewVersionNotes(e.target.value)}
              rows={3}
              disabled={uploadingVersion}
            />
            <p className={styles.uploadHelp}>Uploads under 200 MB work best in the current flow.</p>
            {uploadingVersion && (
              <div>
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar} style={{ width: `${versionUploadProgress}%` }} />
                </div>
                <span className={styles.progressLabel}>{versionUploadProgress}% uploaded to song-files...</span>
              </div>
            )}
            {versionUploadError && <div className={styles.errorMsg}>{versionUploadError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowUploadVersionModal(false)} disabled={uploadingVersion}>
                Cancel
              </button>
              <button className={styles.postBtn} onClick={uploadNewVersion} disabled={!pendingVersionFile || uploadingVersion}>
                {uploadingVersion ? 'Uploading…' : 'Upload version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version picker modal */}
      {showVersionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowVersionModal(false)}>
          <div className={styles.versionModal} onClick={e => e.stopPropagation()}>
            <div className={styles.versionModalHeader}>
              <h3 className={styles.versionModalTitle}>Choose version</h3>
              <button className={styles.versionModalClose} onClick={() => setShowVersionModal(false)}>✕</button>
            </div>
            <div className={styles.versionModalList}>
              {versions.map(v => (
                <button
                  key={v.id}
                  className={`${styles.versionModalItem} ${v.id === versionId ? styles.versionModalItemActive : ''}`}
                  onClick={() => { setShowVersionModal(false); router.push(`/songs/${songId}/versions/${v.id}`); }}
                >
                  <span className={styles.versionModalLabel}>{v.label || `v${v.version_number}`}</span>
                  <span className={styles.versionModalMeta}>
                    {v.created_by} · v{v.version_number}
                  </span>
                  {v.id === versionId && (
                    <span className={styles.versionModalTick}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <input
        ref={versionFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
        style={{ display: 'none' }}
        onChange={e => {
          handleVersionFilePicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
