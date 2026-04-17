'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ActionStatus, getActionStatusLabel, getNextActionStatus, isOpenAction } from '@/lib/actionWorkflow';
import { type AwaitingResponseState, getAwaitingResponseLabel, type SongActivityItem } from '@/lib/collaborationSignals';
import { SongStatus, SONG_STATUS_VALUES, getSongStatusLabel } from '@/lib/songWorkflow';
import { createClient } from '@/lib/supabase';
import styles from './dashboard.module.css';

const supabase = createClient();

interface Song {
  id: string;
  title: string;
  image_url?: string | null;
  imageUploading?: boolean;
  created_at?: string;
  status: SongStatus;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  latestVersionLabel: string | null;
  latestVersionCreatedAt: string | null;
  latestVersionFilePath?: string | null;
  commentCount: number;
  unresolvedActionCount: number;
  assignedToMeCount: number;
  needsAttention: boolean;
  awaitingResponse: AwaitingResponseState;
  activeContextVersionId: string | null;
  assignedContextVersionId: string | null;
  awaitingThreadId: string | null;
  awaitingVersionId: string | null;
  activityFeed: SongActivityItem[];
  latestActivityAt: string | null;
  hasNewActivity: boolean;
}

interface Action {
  id: string;
  description: string;
  status: ActionStatus;
  suggested_by: string;
  timestamp_seconds?: number;
  song_id: string;
  songTitle?: string;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
}

interface BootstrapPayload {
  identity: {
    userId: string;
    email: string | null;
    profileId: string;
    displayName: string;
    authorName: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string | null;
    membershipRole: 'owner' | 'member';
  };
}

interface DashboardSongsPayload {
  songs: Array<{
    id: string;
    title: string;
    image_url?: string | null;
    created_at?: string | null;
    status: SongStatus;
    latestVersionId: string | null;
    latestVersionNumber: number | null;
    latestVersionLabel: string | null;
    latestVersionCreatedAt: string | null;
    latestVersionFilePath?: string | null;
    commentCount: number;
    unresolvedActionCount: number;
    assignedToMeCount: number;
    needsAttention: boolean;
    awaitingResponse: AwaitingResponseState;
    activeContextVersionId: string | null;
    assignedContextVersionId: string | null;
    awaitingThreadId: string | null;
    awaitingVersionId: string | null;
    activityFeed: SongActivityItem[];
    latestActivityAt: string | null;
  }>;
}

interface VersionPayload {
  version?: {
    file_path?: string | null;
  } | null;
}

function getSongSeenStorageKey(viewerKey: string) {
  return `song-review-song-seen:${viewerKey}`;
}

function getComparableTime(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function formatActivityTime(value: string | null) {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatActivityTimestamp(value: string | null) {
  if (!value) return 'No recent activity';

  const date = new Date(value);
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DashboardContent() {
  const router = useRouter();
  const [identity, setIdentity] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'songs' | 'actions'>('songs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [actionFilter, setActionFilter] = useState<'all' | 'open' | 'assigned_to_me' | Action['status']>('all');
  const [songFilter, setSongFilter] = useState<'all' | 'needs_attention' | 'assigned_to_me' | SongStatus>('all');
  const [songSort, setSongSort] = useState<'activity' | 'upload' | 'title'>('activity');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [sheetSongId, setSheetSongId] = useState<string | null>(null);
  const [openOverlayId, setOpenOverlayId] = useState<string | null>(null);

  // New song modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
  const [fadingSongIds, setFadingSongIds] = useState<string[]>([]);

  // Cover art uploads
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverUploadTargetId = useRef<string | null>(null);

  // Dashboard audio player
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<Song[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      try {
        const response = await fetch('/api/auth/bootstrap');

        if (response.ok) {
          const payload = await response.json() as BootstrapPayload;
          if (!mounted) return;

          setIdentity(payload.identity.authorName || payload.identity.displayName || 'U');
          setViewerKey(payload.identity.userId);
          setBootstrapError(null);
          await loadAll(payload.identity.userId);
          return;
        }

        router.push('/?redirectTo=%2Fdashboard');
      } catch (error) {
        console.error('Dashboard bootstrap error:', error);
        if (!mounted) return;

        setBootstrapError('Could not load your dashboard session.');
        setLoading(false);
      }
    }

    void initializeDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!viewerKey) return;

    const reload = () => {
      void loadAll(viewerKey);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reload();
      }
    };

    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewerKey]);

  async function loadAll(currentIdentity: string | null = viewerKey) {
    setLoading(true);
    await Promise.all([loadSongs(currentIdentity), loadActions()]);
    setLoading(false);
  }

  async function loadSongs(currentIdentity: string | null = viewerKey) {
    const response = await fetch('/api/dashboard', { cache: 'no-store' });
    const payload = await response.json().catch(() => null) as DashboardSongsPayload | null;

    if (!response.ok || !Array.isArray(payload?.songs)) {
      console.error('Dashboard songs load error:', payload);
      return;
    }

    const seenMap = typeof window !== 'undefined' && currentIdentity
      ? JSON.parse(window.localStorage.getItem(getSongSeenStorageKey(currentIdentity)) || '{}') as Record<string, string>
      : {};
    const nextSeenMap = { ...seenMap };
    let seededSeenMap = false;

    const assembled: Song[] = payload.songs.map(song => {
      const latestActivityAt = song.latestActivityAt ?? null;

      if (currentIdentity && latestActivityAt && !nextSeenMap[song.id]) {
        nextSeenMap[song.id] = latestActivityAt;
        seededSeenMap = true;
      }

      return {
        id: song.id,
        title: song.title,
        image_url: song.image_url ?? null,
        created_at: song.created_at,
        status: song.status,
        latestVersionId: song.latestVersionId,
        latestVersionNumber: song.latestVersionNumber,
        latestVersionLabel: song.latestVersionLabel,
        latestVersionCreatedAt: song.latestVersionCreatedAt,
        latestVersionFilePath: song.latestVersionFilePath ?? null,
        commentCount: song.commentCount,
        unresolvedActionCount: song.unresolvedActionCount,
        assignedToMeCount: song.assignedToMeCount,
        needsAttention: song.needsAttention,
        awaitingResponse: song.awaitingResponse,
        activeContextVersionId: song.activeContextVersionId,
        assignedContextVersionId: song.assignedContextVersionId,
        awaitingThreadId: song.awaitingThreadId,
        awaitingVersionId: song.awaitingVersionId,
        activityFeed: Array.isArray(song.activityFeed) ? song.activityFeed : [],
        latestActivityAt: song.latestActivityAt,
        hasNewActivity: Boolean(
          song.latestActivityAt &&
          nextSeenMap[song.id] &&
          new Date(song.latestActivityAt).getTime() > new Date(nextSeenMap[song.id]).getTime()
        ),
      };
    });

    if (currentIdentity && seededSeenMap && typeof window !== 'undefined') {
      window.localStorage.setItem(getSongSeenStorageKey(currentIdentity), JSON.stringify(nextSeenMap));
    }

    setSongs(assembled);
  }

  async function loadActions() {
    const response = await fetch('/api/actions', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(payload?.actions)) {
      console.error('Dashboard actions load error:', payload);
      return;
    }

    setActions(payload.actions);
  }

  async function toggleAction(action: Action) {
    const newStatus = getNextActionStatus(action.status);
    await fetch(`/api/actions/${action.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadActions();
  }

  async function createSong() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/songs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        const message = payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not create song. Please try again.';
        throw new Error(message);
      }

      if (!payload?.songId || typeof payload.songId !== 'string') {
        throw new Error('Song creation returned an invalid response.');
      }

      const { songId } = payload;

      setShowNewModal(false);
      setNewTitle('');
      await loadSongs();
      // Navigate to song page (no version yet)
      router.push(`/songs/${songId}`);
    } catch (error) {
      console.error('Create song error:', error);
      window.alert(error instanceof Error ? error.message : 'Could not create song. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function commitRename(id: string) {
    const trimmed = editTitle.trim();
    if (trimmed) {
      const previousTitle = songs.find(song => song.id === id)?.title ?? '';
      try {
        const res = await fetch(`/api/songs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed }),
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : 'Could not rename song.'
          );
        }

        setSongs(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s));
      } catch (error) {
        console.error('Rename song error:', error);
        setSongs(prev => prev.map(s => s.id === id ? { ...s, title: previousTitle } : s));
        window.alert(error instanceof Error ? error.message : 'Could not rename song.');
      }
    }
    setEditingId(null);
  }

  async function deleteSong(id: string) {
    if (deletingSongId) return;

    setDeletingSongId(id);

    // Give the user immediate feedback in the modal, then start fading the card out.
    window.setTimeout(() => {
      setFadingSongIds(prev => prev.includes(id) ? prev : [...prev, id]);
      setDeletingId(null);
    }, 500);

    try {
      const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Delete failed');
      }

      window.setTimeout(() => {
        setSongs(prev => prev.filter(s => s.id !== id));
        setFadingSongIds(prev => prev.filter(songId => songId !== id));
        setDeletingSongId(current => (current === id ? null : current));
      }, 950);
    } catch (error) {
      console.error('Delete song error:', error);
      setFadingSongIds(prev => prev.filter(songId => songId !== id));
      setDeletingSongId(null);
      setDeletingId(null);
      await loadSongs();
      window.alert('That song could not be deleted. Please try again.');
    }
  }

  async function uploadCoverArt(file: File, songId: string) {
    // Mark uploading state on the card
    setSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUploading: true } : s));
    try {
      const formData = new FormData();
      formData.append('songId', songId);
      formData.append('file', file);
      const res = await fetch('/api/songs/upload-image', { method: 'POST', body: formData });
      if (!res.ok) { console.error('Image upload failed', await res.text()); return; }
      const { imageUrl } = await res.json();
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, image_url: imageUrl, imageUploading: false } : s));
    } catch (e) {
      console.error('Image upload error:', e);
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUploading: false } : s));
    }
  }

  async function updateSongStatus(songId: string, status: SongStatus) {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Song status update error:', payload);
      window.alert(
        payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not update song status.'
      );
      return;
    }

    setSongs(prev => prev.map(song => (
      song.id === songId
        ? { ...song, status }
        : song
    )));
  }

  function toggleSongInfo(songId: string) {
    setExpandedCardId(prev => (prev === songId ? null : songId));
  }

  function songNeedsAttention(song: Song) {
    return song.assignedToMeCount > 0;
  }

  function getMetaPillLabel(song: Song) {
    if (song.assignedToMeCount > 0) {
      return `${song.assignedToMeCount} assigned to me`;
    }

    return `${song.unresolvedActionCount} action${song.unresolvedActionCount !== 1 ? 's' : ''}`;
  }

  function statusPillClass(status: SongStatus) {
    if (status === 'writing') return styles.cardStatusWriting;
    if (status === 'in_progress') return styles.cardStatusInProgress;
    if (status === 'mixing') return styles.cardStatusMixing;
    if (status === 'mastering') return styles.cardStatusMastering;
    return styles.cardStatusFinished;
  }

  function handleSongInfoClick(event: React.MouseEvent<HTMLButtonElement>, songId: string, isListView: boolean) {
    event.stopPropagation();

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSheetSongId(prev => (prev === songId ? null : songId));
      return;
    }

    if (isListView) {
      toggleSongInfo(songId);
      return;
    }

    setOpenOverlayId(prev => (prev === songId ? null : songId));
  }

  function markSongSeen(songId: string) {
    if (!viewerKey || typeof window === 'undefined') return;

    const storageKey = getSongSeenStorageKey(viewerKey);
    const seenMap = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as Record<string, string>;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ ...seenMap, [songId]: new Date().toISOString() })
    );
  }

  function openSongContext(
    song: Song,
    options?: {
      versionId?: string | null;
      focus?: 'actions' | 'threads';
      actionFilter?: 'open' | 'assigned_to_me';
      actionsTab?: 'this_version' | 'all_versions';
      threadId?: string | null;
    }
  ) {
    markSongSeen(song.id);

    const targetVersionId = options?.versionId ?? song.latestVersionId;
    if (!targetVersionId) {
      router.push(`/songs/${song.id}`);
      return;
    }

    const params = new URLSearchParams();
    if (options?.focus) params.set('focus', options.focus);
    if (options?.actionFilter) params.set('actionFilter', options.actionFilter);
    if (options?.actionsTab) params.set('actionsTab', options.actionsTab);
    if (options?.threadId) params.set('thread', options.threadId);

    const href = params.size > 0
      ? `/songs/${song.id}/versions/${targetVersionId}?${params.toString()}`
      : `/songs/${song.id}/versions/${targetVersionId}`;

    router.push(href);
  }

  function getAudioUrl(filePath: string) {
    const { data } = supabase.storage.from('song-files').getPublicUrl(filePath);
    return data.publicUrl;
  }

  function setMediaSession(song: Song) {
    if (!('mediaSession' in navigator)) return;

    const artwork: MediaImage[] = song.image_url
      ? [{ src: song.image_url, sizes: '512x512', type: 'image/jpeg' }]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: 'Polite Rebels',
      album: 'Song Review',
      artwork,
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      void skipTrack('prev');
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      void skipTrack('next');
    });
    navigator.mediaSession.playbackState = 'playing';
  }

  async function resolveLatestVersionFilePath(song: Song) {
    if (song.latestVersionFilePath) return song.latestVersionFilePath;
    if (!song.latestVersionId) return null;

    try {
      const response = await fetch(`/api/versions/${song.latestVersionId}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null) as VersionPayload | null;

      if (!response.ok) {
        console.error('Dashboard version load error:', payload);
        return null;
      }

      const filePath = payload?.version?.file_path ?? null;
      if (!filePath) return null;

      setSongs(prev => prev.map(existing => (
        existing.id === song.id
          ? { ...existing, latestVersionFilePath: filePath }
          : existing
      )));
      queueRef.current = queueRef.current.map(existing => (
        existing.id === song.id
          ? { ...existing, latestVersionFilePath: filePath }
          : existing
      ));

      return filePath;
    } catch (error) {
      console.error('Resolve latest version file path error:', error);
      return null;
    }
  }

  async function playSong(song: Song, queue: Song[]) {
    if (!song.latestVersionId || !audioRef.current) return;

    const filePath = await resolveLatestVersionFilePath(song);
    if (!filePath || !audioRef.current) return;

    const hydratedQueue = await Promise.all(queue.map(async item => {
      if (item.id !== song.id || item.latestVersionFilePath) return item;

      const latestVersionFilePath = await resolveLatestVersionFilePath(item);
      return latestVersionFilePath ? { ...item, latestVersionFilePath } : item;
    }));

    queueRef.current = hydratedQueue;
    const hydratedSong = hydratedQueue.find(item => item.id === song.id) ?? { ...song, latestVersionFilePath: filePath };
    const idx = hydratedQueue.findIndex(item => item.id === song.id);

    setQueueIndex(idx >= 0 ? idx : 0);
    setPlayingId(song.id);
    setIsPlaying(true);
    setPlayerCurrentTime(0);
    audioRef.current.src = getAudioUrl(filePath);
    audioRef.current.play().catch(() => {});
    setMediaSession(hydratedSong);
  }

  async function handlePlayerEnded() {
    const queue = queueRef.current;
    const nextIdx = queueIndex + 1;

    if (nextIdx < queue.length) {
      const next = queue[nextIdx];
      const filePath = await resolveLatestVersionFilePath(next);

      if (filePath && audioRef.current) {
        const hydratedNext = { ...next, latestVersionFilePath: filePath };
        queueRef.current = queue.map((item, index) => index === nextIdx ? hydratedNext : item);
        setQueueIndex(nextIdx);
        setPlayingId(next.id);
        audioRef.current.src = getAudioUrl(filePath);
        audioRef.current.play().catch(() => {});
        setMediaSession(hydratedNext);
        return;
      }
    }

    setIsPlaying(false);
    setPlayingId(null);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  async function skipTrack(direction: 'prev' | 'next') {
    const queue = queueRef.current;
    const targetIdx = direction === 'next' ? queueIndex + 1 : queueIndex - 1;
    if (targetIdx < 0 || targetIdx >= queue.length) return;

    const target = queue[targetIdx];
    const filePath = await resolveLatestVersionFilePath(target);

    if (filePath && audioRef.current) {
      const hydratedTarget = { ...target, latestVersionFilePath: filePath };
      queueRef.current = queue.map((item, index) => index === targetIdx ? hydratedTarget : item);
      setQueueIndex(targetIdx);
      setPlayingId(target.id);
      audioRef.current.src = getAudioUrl(filePath);
      audioRef.current.play().catch(() => {});
      setMediaSession(hydratedTarget);
    }
  }

  function togglePlayPause() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
  }

  function handleCardClick(e: React.MouseEvent, song: Song) {
    // Don't navigate if clicking an action button or if renaming
    if ((e.target as HTMLElement).closest('button, select, option, input, label') || editingId === song.id) return;
    openSongContext(song);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const filteredActions = actions.filter(a => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'open') return isOpenAction(a.status);
    if (actionFilter === 'assigned_to_me') {
      return a.assigned_to_user_id === viewerKey && isOpenAction(a.status);
    }
    return a.status === actionFilter;
  });

  const actionCounts = actions.reduce<Record<ActionStatus, number>>((acc, action) => {
    acc[action.status] += 1;
    return acc;
  }, { open: 0, in_progress: 0, done: 0 });

  const activeActionCount = actions.filter(a => isOpenAction(a.status)).length;
  const emptyActionMessage = actionFilter === 'all'
    ? 'No actions yet. Mark a comment as an action when something needs following up.'
    : actionFilter === 'assigned_to_me'
      ? 'Nothing is assigned to you right now.'
      : `No ${actionFilter.replace('_', ' ')} actions right now`;

  const sortedActionGroups = Object.entries(filteredActions.reduce<Record<string, Action[]>>((acc, action) => {
    const key = action.songTitle ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(action);
    return acc;
  }, {})).sort(([left], [right]) => left.localeCompare(right));

  const myAssignedActionCount = actions.filter(action => (
    action.assigned_to_user_id === viewerKey &&
    isOpenAction(action.status)
  )).length;

  const actionFilterOptions: Array<{ value: 'all' | 'open' | 'assigned_to_me' | Action['status']; label: string; count: number }> = [
    { value: 'all', label: 'All', count: actions.length },
    { value: 'open', label: 'Open', count: activeActionCount },
    { value: 'assigned_to_me', label: 'Assigned to me', count: myAssignedActionCount },
    { value: 'in_progress', label: 'In progress', count: actionCounts.in_progress },
    { value: 'done', label: 'Done', count: actionCounts.done },
  ];

  const getActionToggleClass = (status: Action['status']) => {
    if (status === 'in_progress') return styles.actionToggleApproved;
    if (status === 'done') return styles.actionToggleDone;
    return '';
  };

  const getActionStatusClass = (status: Action['status']) => {
    if (status === 'in_progress') return styles.actionStatusApproved;
    if (status === 'done') return styles.actionStatusDone;
    return styles.actionStatusPending;
  };

  const getActionToggleTitle = (status: Action['status']) => {
    if (status === 'open') return 'Move to in progress';
    if (status === 'in_progress') return 'Mark done';
    return 'Reopen action';
  };

  const renderActionGlyph = (status: Action['status']) => {
    if (status === 'done') {
      return (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      );
    }

    if (status === 'in_progress') {
      return <span className={styles.actionApprovedDot} />;
    }

    return null;
  };

  const hasSongs = songs.length > 0;
  const songEmptyMessage = 'Start with one upload and the review flow will build from there.';
  const filteredSongs = songs.filter(song => {
    if (songFilter === 'all') return true;
    if (songFilter === 'needs_attention') return song.needsAttention;
    if (songFilter === 'assigned_to_me') return song.assignedToMeCount > 0;
    return song.status === songFilter;
  });

  const sortedSongs = [...filteredSongs].sort((left, right) => {
    if (songSort === 'title') {
      return left.title.localeCompare(right.title);
    }

    if (songSort === 'upload') {
      const uploadDiff = getComparableTime(right.latestVersionCreatedAt) - getComparableTime(left.latestVersionCreatedAt);
      if (uploadDiff !== 0) return uploadDiff;
      return left.title.localeCompare(right.title);
    }

    if (left.hasNewActivity !== right.hasNewActivity) {
      return left.hasNewActivity ? -1 : 1;
    }

    const activityDiff = getComparableTime(right.latestActivityAt) - getComparableTime(left.latestActivityAt);
    if (activityDiff !== 0) return activityDiff;
    return left.title.localeCompare(right.title);
  });
  const hasFilteredSongs = sortedSongs.length > 0;

  const songStatusCounts = songs.reduce<Record<SongStatus, number>>((acc, song) => {
    acc[song.status] += 1;
    return acc;
  }, {
    writing: 0,
    in_progress: 0,
    mixing: 0,
    mastering: 0,
    finished: 0,
  });

  const songFilterOptions: Array<{ value: 'all' | 'needs_attention' | 'assigned_to_me' | SongStatus; label: string; count: number }> = [
    { value: 'all', label: 'All songs', count: songs.length },
    { value: 'needs_attention', label: 'Needs attention', count: songs.filter(song => song.needsAttention).length },
    { value: 'assigned_to_me', label: 'Assigned to me', count: songs.filter(song => song.assignedToMeCount > 0).length },
    ...SONG_STATUS_VALUES.map(status => ({
      value: status,
      label: getSongStatusLabel(status),
      count: songStatusCounts[status],
    })),
  ];

  const getSongStatusClass = (status: SongStatus) => {
    if (status === 'finished') return styles.songStatusFinished;
    if (status === 'mastering') return styles.songStatusMastering;
    if (status === 'mixing') return styles.songStatusMixing;
    if (status === 'writing') return styles.songStatusWriting;
    return styles.songStatusInProgress;
  };

  const renderInteractivePill = (
    key: string,
    label: string,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  ) => (
    <button
      key={key}
      type="button"
      className={styles.interactivePill}
      onClick={onClick}
    >
      <span className={styles.interactivePillLabel}>{label}</span>
      <svg
        className={styles.interactivePillIcon}
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 2.25 6.25 5 3 7.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const sheetSong = sheetSongId ? songs.find(song => song.id === sheetSongId) ?? null : null;
  const sheetActivitySummary = sheetSong?.activityFeed[0] ?? null;
  const sheetActivitySnippet = sheetActivitySummary?.detail ?? sheetActivitySummary?.summary ?? null;
  const sheetVersionText = sheetSong
    ? (
      sheetSong.latestVersionLabel
        ? sheetSong.latestVersionLabel
        : sheetSong.latestVersionNumber
          ? `v${sheetSong.latestVersionNumber}`
          : 'No audio yet'
    )
    : 'No audio yet';

  return (
    <div className={`${styles.page} ${playingId ? styles.pageWithPlayer : ''}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            Polite Rebels
          </div>
        </div>
        <div className={styles.headerRight}>
          <div
            className={styles.avatar}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            {identity?.[0] ?? ''}
          </div>
        </div>
      </header>

      {bootstrapError && (
        <div style={{ margin: '0 24px 12px', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(229, 62, 62, 0.14)', color: '#fecaca', fontSize: 13 }}>
          {bootstrapError}
        </div>
      )}

      {/* Mobile tabs */}
      <div className={styles.mobileTabs}>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'songs' ? styles.mobileTabActive : ''}`}
          onClick={() => setMobileTab('songs')}
        >
          Songs
        </button>
        <button
          className={`${styles.mobileTab} ${mobileTab === 'actions' ? styles.mobileTabActive : ''}`}
          onClick={() => setMobileTab('actions')}
        >
          Actions
          {activeActionCount > 0 && <span className={styles.tabBadge}>{activeActionCount}</span>}
        </button>
      </div>

      <div className={styles.body}>
        {/* Songs panel */}
        <div className={`${styles.songsPanel} ${mobileTab === 'actions' ? styles.hideMobile : ''}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Songs</span>
            <div className={styles.headerRight}>
              <div className={styles.sortControl}>
                <label className={styles.sortLabel} htmlFor="song-sort">
                  Sort
                </label>
                <select
                  id="song-sort"
                  className={styles.sortSelect}
                  value={songSort}
                  onChange={e => setSongSort(e.target.value as 'activity' | 'upload' | 'title')}
                >
                  <option value="activity">Recent activity</option>
                  <option value="upload">Latest upload</option>
                  <option value="title">Title</option>
                </select>
              </div>
              {/* View toggle — desktop only */}
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </button>
                <button
                  className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="6" y="2" width="7" height="1.5" rx="0.75" fill="currentColor"/>
                    <rect x="1" y="5.75" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="6" y="6.75" width="7" height="1.5" rx="0.75" fill="currentColor"/>
                    <rect x="1" y="10.5" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="6" y="11.5" width="7" height="1.5" rx="0.75" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              <button className={styles.newBtn} onClick={() => setShowNewModal(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                New song
              </button>
            </div>
          </div>

          <div className={styles.filterRow}>
            {songFilterOptions.map(option => (
              <button
                key={option.value}
                className={`${styles.filterPill} ${songFilter === option.value ? styles.filterPillActive : ''}`}
                onClick={() => setSongFilter(option.value)}
              >
                {option.label}
                <span className={styles.filterCount}>{option.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.emptyState}>Loading your songs and actions…</p>
          ) : hasSongs ? (
            hasFilteredSongs ? (
            <div className={`${styles.songsGrid} ${viewMode === 'list' ? styles.songsGridList : ''}`}>
              {sortedSongs.map(song => {
                const isInfoOpen = expandedCardId === song.id;
                const isOverlayOpen = openOverlayId === song.id;
                const latestVersionText = song.latestVersionLabel
                  ? song.latestVersionLabel
                  : song.latestVersionNumber
                    ? `v${song.latestVersionNumber}`
                    : 'No audio yet';
                const latestVersionTag = song.latestVersionNumber ? `v${song.latestVersionNumber}` : 'No audio yet';
                const activitySummary = song.activityFeed[0] ?? null;
                const activitySnippet = activitySummary?.detail ?? activitySummary?.summary ?? null;
                const showMetaPill = song.unresolvedActionCount > 0;
                const attentionClass = songNeedsAttention(song) ? styles.cardAttention : '';
                const isListView = viewMode === 'list';

                return (
                <div
                  key={song.id}
                  className={`${styles.card} ${isListView ? styles.desktopListCard : styles.desktopGridCard} ${attentionClass} ${fadingSongIds.includes(song.id) ? styles.cardDeleting : ''} ${isInfoOpen ? styles.cardInfoExpanded : ''}`}
                  onClick={e => {
                    if (!isListView && isOverlayOpen) {
                      setOpenOverlayId(null);
                      return;
                    }
                    handleCardClick(e, song);
                  }}
                >
                  {isListView ? (
                    <>
                      <div className={styles.desktopListCardRow}>
                        <div className={styles.cardThumb}>
                          {song.imageUploading ? (
                            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(13,9,20,0.7)',borderRadius:8}}>
                              <div style={{width:18,height:18,border:'2px solid #ff1493',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
                            </div>
                          ) : song.image_url ? (
                            <img
                              src={song.image_url}
                              alt={song.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div className={styles.thumbPlaceholder}>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="5" stroke="rgba(255,20,147,0.4)" strokeWidth="1.4"/>
                                <circle cx="9" cy="9" r="2" fill="rgba(255,20,147,0.4)"/>
                              </svg>
                            </div>
                          )}
                          {song.latestVersionId && (
                            <button
                              type="button"
                              className={`${styles.thumbPlayBtn} ${playingId === song.id ? styles.thumbPlayBtnActive : ''}`}
                              onClick={event => {
                                event.stopPropagation();
                                if (playingId === song.id) {
                                  togglePlayPause();
                                } else {
                                  void playSong(song, sortedSongs);
                                }
                              }}
                              title={playingId === song.id && isPlaying ? 'Pause' : 'Play'}
                            >
                              {playingId === song.id && isPlaying ? (
                                <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                                  <rect x="0" y="0" width="3.5" height="12" rx="1" />
                                  <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
                                </svg>
                              ) : (
                                <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                                  <path d="M0 0l10 6-10 6z" />
                                </svg>
                              )}
                            </button>
                          )}
                          {playingId === song.id && isPlaying && (
                            <div className={styles.eqBars}>
                              <span className={styles.eqBar} style={{ animationDelay: '0s' }} />
                              <span className={styles.eqBar} style={{ animationDelay: '0.15s' }} />
                              <span className={styles.eqBar} style={{ animationDelay: '0.3s' }} />
                              <span className={styles.eqBar} style={{ animationDelay: '0.1s' }} />
                            </div>
                          )}
                        </div>

                        <div className={styles.cardBody}>
                          {editingId === song.id ? (
                            <input
                              className={styles.editInput}
                              value={editTitle}
                              autoFocus
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitRename(song.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onBlur={() => commitRename(song.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <div className={styles.cardTitle}>{song.title}</div>
                          )}
                          <div className={styles.cardMetaPrimary}>
                            <span>{getSongStatusLabel(song.status)}</span>
                            <span className={styles.cardMetaSeparator}>·</span>
                            <span>{latestVersionTag}</span>
                            {song.latestVersionLabel && (
                              <>
                                <span className={styles.cardMetaSeparator}>·</span>
                                <span>{song.latestVersionLabel}</span>
                              </>
                            )}
                            {showMetaPill && (
                              <>
                                <span className={styles.cardMetaSeparator}>·</span>
                                <span className={styles.metaPill}>
                                  <span className={styles.metaPillDot} />
                                  {getMetaPillLabel(song)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className={styles.cardActions}>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnInfo} ${isInfoOpen ? styles.iconBtnActive : ''}`}
                            title={isInfoOpen ? 'Hide info' : 'Show info'}
                            aria-label={isInfoOpen ? `Hide info for ${song.title}` : `Show info for ${song.title}`}
                            aria-expanded={isInfoOpen}
                            aria-controls={`song-info-${song.id}`}
                            onClick={e => handleSongInfoClick(e, song.id, true)}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M5.5 5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                              <circle cx="5.5" cy="3.2" r="0.6" fill="currentColor" />
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Rename"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingId(song.id);
                              setEditTitle(song.title);
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Upload cover art"
                            onClick={e => {
                              e.stopPropagation();
                              coverUploadTargetId.current = song.id;
                              coverInputRef.current?.click();
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <rect x="1" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1"/>
                              <circle cx="3.5" cy="4.5" r="1" fill="currentColor"/>
                              <path d="M1 8l3-3 2 2 2-2 2 3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Delete"
                            onClick={e => {
                              e.stopPropagation();
                              setDeletingId(song.id);
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M2 3h7M4 3V2h3v1M4.5 5v3M6.5 5v3M3 3l.5 6h4l.5-6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div
                        id={`song-info-${song.id}`}
                        className={`${styles.cardExpandPanel} ${isInfoOpen ? styles.cardExpandVisible : ''}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className={styles.expandGrid}>
                          <div className={styles.expandItem}>
                            <span className={styles.expandLabel}>Latest version</span>
                            <span className={styles.expandValue}>{latestVersionText}</span>
                          </div>
                          <div className={styles.expandItem}>
                            <span className={styles.expandLabel}>Last activity</span>
                            <span className={styles.expandValue}>{formatActivityTimestamp(song.latestActivityAt)}</span>
                          </div>
                          <div className={styles.expandItem}>
                            <span className={styles.expandLabel}>Comments</span>
                            <span className={styles.expandValue}>{song.commentCount}</span>
                          </div>
                          <div className={styles.expandItem}>
                            <span className={styles.expandLabel}>Open work</span>
                            <span className={styles.expandValue}>
                              {song.unresolvedActionCount > 0 ? `${song.unresolvedActionCount} actions` : 'None'}
                            </span>
                          </div>
                        </div>
                        <div className={styles.expandAssignRow}>
                          {song.assignedToMeCount > 0 && (
                            <button
                              type="button"
                              className={`${styles.expandAssignPill} ${styles.expandAssignPillMe}`}
                              onClick={event => {
                                event.stopPropagation();
                                openSongContext(song, {
                                  versionId: song.assignedContextVersionId,
                                  focus: 'actions',
                                  actionsTab: 'all_versions',
                                  actionFilter: 'assigned_to_me',
                                });
                              }}
                            >
                              {song.assignedToMeCount} assigned to me
                            </button>
                          )}
                          {song.awaitingResponse && (
                            <button
                              type="button"
                              className={styles.expandAssignPill}
                              onClick={event => {
                                event.stopPropagation();
                                openSongContext(song, {
                                  versionId: song.awaitingVersionId,
                                  focus: 'threads',
                                  threadId: song.awaitingThreadId,
                                });
                              }}
                            >
                              {getAwaitingResponseLabel(song.awaitingResponse) ?? 'Awaiting response'}
                            </button>
                          )}
                          <div className={styles.cardStatusControl}>
                            <label className={styles.cardStatusLabel} htmlFor={`song-status-${song.id}`}>
                              Stage
                            </label>
                            <select
                              id={`song-status-${song.id}`}
                              className={styles.cardStatusSelect}
                              value={song.status}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                e.stopPropagation();
                                void updateSongStatus(song.id, e.target.value as SongStatus);
                              }}
                            >
                              {SONG_STATUS_VALUES.map(status => (
                                <option key={status} value={status}>
                                  {getSongStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {activitySnippet && (
                          <div className={styles.expandActivity}>{activitySnippet}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.cardThumb}>
                        {song.imageUploading ? (
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(13,9,20,0.7)',borderRadius:8}}>
                            <div style={{width:18,height:18,border:'2px solid #ff1493',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
                          </div>
                        ) : song.image_url ? (
                          <img
                            src={song.image_url}
                            alt={song.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div className={styles.thumbPlaceholder}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <circle cx="9" cy="9" r="5" stroke="rgba(255,20,147,0.4)" strokeWidth="1.4"/>
                              <circle cx="9" cy="9" r="2" fill="rgba(255,20,147,0.4)"/>
                            </svg>
                          </div>
                        )}
                        {song.latestVersionId && (
                          <button
                            type="button"
                            className={`${styles.thumbPlayBtn} ${playingId === song.id ? styles.thumbPlayBtnActive : ''}`}
                            onClick={event => {
                              event.stopPropagation();
                              if (playingId === song.id) {
                                togglePlayPause();
                              } else {
                                void playSong(song, sortedSongs);
                              }
                            }}
                            title={playingId === song.id && isPlaying ? 'Pause' : 'Play'}
                          >
                            {playingId === song.id && isPlaying ? (
                              <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                                <rect x="0" y="0" width="3.5" height="12" rx="1" />
                                <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
                              </svg>
                            ) : (
                              <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                                <path d="M0 0l10 6-10 6z" />
                              </svg>
                            )}
                          </button>
                        )}
                        {playingId === song.id && isPlaying && (
                          <div className={styles.eqBars}>
                            <span className={styles.eqBar} style={{ animationDelay: '0s' }} />
                            <span className={styles.eqBar} style={{ animationDelay: '0.15s' }} />
                            <span className={styles.eqBar} style={{ animationDelay: '0.3s' }} />
                            <span className={styles.eqBar} style={{ animationDelay: '0.1s' }} />
                          </div>
                        )}
                        {song.hasNewActivity && (
                          <span className={styles.activityBadge}>New</span>
                        )}
                        <div
                          id={`song-overlay-${song.id}`}
                          className={`${styles.cardInfoOverlay} ${isOverlayOpen ? styles.cardInfoOverlayVisible : ''}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className={styles.overlayGrid}>
                            <div className={styles.overlayItem}>
                              <span className={styles.overlayLabel}>Latest version</span>
                              <span className={styles.overlayValue}>{latestVersionText}</span>
                            </div>
                            <div className={styles.overlayItem}>
                              <span className={styles.overlayLabel}>Last activity</span>
                              <span className={styles.overlayValue}>{formatActivityTimestamp(song.latestActivityAt)}</span>
                            </div>
                            <div className={styles.overlayItem}>
                              <span className={styles.overlayLabel}>Comments</span>
                              <span className={styles.overlayValue}>{song.commentCount}</span>
                            </div>
                            <div className={styles.overlayItem}>
                              <span className={styles.overlayLabel}>Open work</span>
                              <span className={styles.overlayValue}>
                                {song.unresolvedActionCount > 0 ? `${song.unresolvedActionCount} actions` : 'None'}
                              </span>
                            </div>
                          </div>
                          {(song.assignedToMeCount > 0 || song.awaitingResponse) && (
                            <div className={styles.overlayAssignRow}>
                              {song.assignedToMeCount > 0 && (
                                <span className={`${styles.overlayPill} ${styles.overlayPillMe}`}>
                                  {song.assignedToMeCount} assigned to me
                                </span>
                              )}
                              {song.awaitingResponse && (
                                <span className={styles.overlayPill}>
                                  {getAwaitingResponseLabel(song.awaitingResponse) ?? 'Awaiting response'}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={styles.overlayStageRow}>
                            <span className={styles.overlayStageLabel}>Stage</span>
                            <span className={styles.overlayStageVal}>{getSongStatusLabel(song.status)}</span>
                          </div>
                          {activitySnippet && (
                            <div className={styles.overlayActivity}>{activitySnippet}</div>
                          )}
                        </div>
                      </div>

                      <div className={styles.cardBody}>
                        {editingId === song.id ? (
                          <input
                            className={styles.editInput}
                            value={editTitle}
                            autoFocus
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename(song.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onBlur={() => commitRename(song.id)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div className={styles.cardTitle}>{song.title}</div>
                        )}
                        <div className={styles.cardStatusRow}>
                          <span className={`${styles.cardStatusPill} ${statusPillClass(song.status)}`}>
                            {getSongStatusLabel(song.status)}
                          </span>
                          {showMetaPill && (
                            <span className={styles.cardActionPill}>
                              <span className={styles.cardActionPillDot} />
                              {getMetaPillLabel(song)}
                            </span>
                          )}
                        </div>
                        <div className={styles.cardBodyDivider} />
                        <div className={styles.cardMetaRow}>
                          <span className={styles.cardMetaPrimary}>{song.latestVersionLabel || latestVersionTag}</span>
                          <span className={styles.cardMetaComments}>
                            {song.commentCount}
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                              <path d="M3 3.5h8a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6l-2.5 2V9.5H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        </div>
                        <div className={styles.cardActions}>
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnInfo} ${isOverlayOpen ? styles.iconBtnActive : ''}`}
                            title={isOverlayOpen ? 'Hide info' : 'Show info'}
                            aria-label={isOverlayOpen ? `Hide info for ${song.title}` : `Show info for ${song.title}`}
                            aria-expanded={isOverlayOpen}
                            aria-controls={`song-overlay-${song.id}`}
                            onClick={e => handleSongInfoClick(e, song.id, false)}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M5.5 5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                              <circle cx="5.5" cy="3.2" r="0.6" fill="currentColor" />
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Rename"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingId(song.id);
                              setEditTitle(song.title);
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Upload cover art"
                            onClick={e => {
                              e.stopPropagation();
                              coverUploadTargetId.current = song.id;
                              coverInputRef.current?.click();
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <rect x="1" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1"/>
                              <circle cx="3.5" cy="4.5" r="1" fill="currentColor"/>
                              <path d="M1 8l3-3 2 2 2-2 2 3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            className={styles.iconBtn}
                            title="Delete"
                            onClick={e => {
                              e.stopPropagation();
                              setDeletingId(song.id);
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M2 3h7M4 3V2h3v1M4.5 5v3M6.5 5v3M3 3l.5 6h4l.5-6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                );
              })}

              {/* Ghost add card */}
              <div className={styles.cardGhost} onClick={() => setShowNewModal(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Add song
              </div>
            </div>
            ) : (
              <div className={styles.emptyStateCard}>
                <div className={styles.emptyStateTitle}>No songs match this filter</div>
                <p className={styles.emptyStateText}>Try another status or switch back to all songs.</p>
              </div>
            )
          ) : (
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyStateTitle}>No songs yet</div>
              <p className={styles.emptyStateText}>{songEmptyMessage}</p>
              <button className={styles.emptyStateAction} onClick={() => setShowNewModal(true)}>
                Create your first song
              </button>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className={`${styles.actionsPanel} ${mobileTab === 'songs' ? styles.hideMobile : ''}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Actions</span>
          </div>

          <div className={styles.filterRow}>
            {actionFilterOptions.map(option => (
              <button
                key={option.value}
                className={`${styles.filterPill} ${actionFilter === option.value ? styles.filterPillActive : ''}`}
                onClick={() => setActionFilter(option.value)}
              >
                {option.label}
                <span className={styles.filterCount}>{option.count}</span>
              </button>
            ))}
          </div>

          {filteredActions.length === 0 ? (
            <p className={styles.emptyState}>{emptyActionMessage}</p>
          ) : (
            sortedActionGroups.map(([songTitle, songActions]) => (
              <div key={songTitle} className={styles.actionGroup}>
                <div className={styles.groupLabel}>{songTitle}</div>
                {songActions.map(action => (
                  <div key={action.id} className={styles.actionRow}>
                    <button
                      className={`${styles.actionToggle} ${getActionToggleClass(action.status)}`}
                      onClick={() => toggleAction(action)}
                      title={getActionToggleTitle(action.status)}
                    >
                      {renderActionGlyph(action.status)}
                    </button>
                    <div className={styles.actionContent}>
                      <div className={`${styles.actionText} ${action.status === 'done' ? styles.actionTextDone : ''}`}>
                        {action.description}
                      </div>
                      <div className={styles.actionMeta}>
                        <span className={`${styles.actionStatus} ${getActionStatusClass(action.status)}`}>
                          {getActionStatusLabel(action.status)}
                        </span>
                        {action.assigned_to_name && (
                          <span className={styles.actionAssignee}>Assigned to {action.assigned_to_name}</span>
                        )}
                        {action.timestamp_seconds != null && (
                          <div className={styles.actionTimestamp}>@ {formatTime(action.timestamp_seconds)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New song modal */}
      {showNewModal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>New song</div>
            <input
              className={styles.modalInput}
              placeholder="Song title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createSong(); if (e.key === 'Escape') setShowNewModal(false); }}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => { setShowNewModal(false); setNewTitle(''); }}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={createSong} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deletingId && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget && deletingSongId !== deletingId) setDeletingId(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Delete song?</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
              This will permanently delete the song, all versions, comments, and actions. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeletingId(null)} disabled={deletingSongId === deletingId}>
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                style={{ background: '#e53e3e' }}
                onClick={() => deleteSong(deletingId)}
                disabled={deletingSongId === deletingId}
              >
                {deletingSongId === deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden cover art file input */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          const id = coverUploadTargetId.current;
          if (file && id) uploadCoverArt(file, id);
          e.target.value = '';
        }}
      />

      <div
        className={`${styles.bsOverlay} ${sheetSongId ? styles.bsOverlayVisible : ''}`}
        onClick={event => {
          if (event.target === event.currentTarget) {
            setSheetSongId(null);
          }
        }}
      >
        <div className={styles.bottomSheet}>
          <div className={styles.bsHandle} onClick={() => setSheetSongId(null)}>
            <div className={styles.bsHandleBar} />
          </div>
          {sheetSong && (
            <>
              <div className={styles.bsHeader}>
                <div
                  className={styles.bsArt}
                  style={sheetSong.image_url ? undefined : { background: 'rgba(255,20,147,0.12)' }}
                >
                  {sheetSong.image_url ? (
                    <img
                      src={sheetSong.image_url}
                      alt={sheetSong.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className={styles.bsArtPlaceholder} />
                  )}
                </div>
                <div>
                  <p className={styles.bsSongTitle}>{sheetSong.title}</p>
                  <p className={styles.bsSub}>
                    {getSongStatusLabel(sheetSong.status)}
                    {sheetSong.latestVersionNumber ? ` · v${sheetSong.latestVersionNumber}` : ''}
                    {sheetSong.latestVersionLabel ? ` · ${sheetSong.latestVersionLabel}` : ''}
                  </p>
                </div>
              </div>
              <div className={styles.bsBody}>
                <div className={styles.bsGrid}>
                  <div className={styles.bsItem}>
                    <span className={styles.bsItemLabel}>Last activity</span>
                    <span className={styles.bsItemValue}>{formatActivityTimestamp(sheetSong.latestActivityAt)}</span>
                  </div>
                  <div className={styles.bsItem}>
                    <span className={styles.bsItemLabel}>Comments</span>
                    <span className={styles.bsItemValue}>{sheetSong.commentCount}</span>
                  </div>
                  <div className={styles.bsItem}>
                    <span className={styles.bsItemLabel}>Open work</span>
                    <span className={styles.bsItemValue}>
                      {sheetSong.unresolvedActionCount > 0 ? `${sheetSong.unresolvedActionCount} actions` : 'None'}
                    </span>
                  </div>
                  <div className={styles.bsItem}>
                    <span className={styles.bsItemLabel}>Latest version</span>
                    <span className={styles.bsItemValue}>{sheetVersionText}</span>
                  </div>
                </div>
                <div className={styles.bsAssignRow}>
                  {sheetSong.assignedToMeCount > 0 && (
                    <span className={`${styles.bsPill} ${styles.bsPillMe}`}>
                      {sheetSong.assignedToMeCount} assigned to me
                    </span>
                  )}
                  {sheetSong.awaitingResponse && (
                    <span className={styles.bsPill}>
                      {getAwaitingResponseLabel(sheetSong.awaitingResponse) ?? 'Awaiting response'}
                    </span>
                  )}
                </div>
                <div className={styles.cardStatusControl}>
                  <label className={styles.cardStatusLabel} htmlFor="sheet-song-status">
                    Stage
                  </label>
                  <select
                    id="sheet-song-status"
                    className={styles.cardStatusSelect}
                    value={sheetSong.status}
                    onClick={event => event.stopPropagation()}
                    onChange={event => {
                      event.stopPropagation();
                      void updateSongStatus(sheetSong.id, event.target.value as SongStatus);
                    }}
                  >
                    {SONG_STATUS_VALUES.map(status => (
                      <option key={status} value={status}>
                        {getSongStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
                {sheetActivitySnippet && (
                  <div className={styles.bsActivitySnippet}>{sheetActivitySnippet}</div>
                )}
              </div>
              <button
                className={styles.bsCta}
                onClick={() => {
                  setSheetSongId(null);
                  openSongContext(sheetSong);
                }}
              >
                Open song →
              </button>
            </>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          void handlePlayerEnded();
        }}
        onTimeUpdate={() => setPlayerCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setPlayerDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {playingId && (() => {
        const playingSong = queueRef.current.find(song => song.id === playingId);
        if (!playingSong) return null;

        const progressPercent = playerDuration > 0 ? (playerCurrentTime / playerDuration) * 100 : 0;

        return (
          <div className={styles.miniPlayer}>
            <div className={styles.miniPlayerProgress}>
              <div className={styles.miniPlayerFill} style={{ width: `${progressPercent}%` }} />
              <input
                type="range"
                min={0}
                max={playerDuration || 100}
                step={0.1}
                value={playerCurrentTime}
                className={styles.miniPlayerScrubber}
                onChange={event => {
                  const nextTime = parseFloat(event.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = nextTime;
                  }
                  setPlayerCurrentTime(nextTime);
                }}
              />
            </div>
            <div className={styles.miniPlayerRow}>
              <div
                className={styles.miniPlayerLeft}
                onClick={() => openSongContext(playingSong)}
              >
                {playingSong.image_url ? (
                  <img src={playingSong.image_url} alt={playingSong.title} className={styles.miniPlayerArt} />
                ) : (
                  <div className={styles.miniPlayerArtPlaceholder} />
                )}
                <div className={styles.miniPlayerInfo}>
                  <div className={styles.miniPlayerTitle}>{playingSong.title}</div>
                  <div className={styles.miniPlayerMeta}>
                    {formatTime(playerCurrentTime)} / {formatTime(playerDuration)} · {queueIndex + 1} of {queueRef.current.length}
                  </div>
                </div>
              </div>
              <div className={styles.miniPlayerControls}>
                <button
                  type="button"
                  className={styles.miniPlayerBtn}
                  onClick={() => {
                    void skipTrack('prev');
                  }}
                  disabled={queueIndex === 0}
                  title="Previous"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 2L5 8l7 6V2z" fill="currentColor" />
                    <rect x="2" y="2" width="2" height="12" rx="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.miniPlayerPlayBtn}
                  onClick={togglePlayPause}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                      <rect x="1" y="1" width="4.5" height="12" rx="1.5" />
                      <rect x="8.5" y="1" width="4.5" height="12" rx="1.5" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                      <path d="M2 1l11 6-11 6z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.miniPlayerBtn}
                  onClick={() => {
                    void skipTrack('next');
                  }}
                  disabled={queueIndex >= queueRef.current.length - 1}
                  title="Next"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2l7 6-7 6V2z" fill="currentColor" />
                    <rect x="12" y="2" width="2" height="12" rx="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.miniPlayerBtn}
                  onClick={() => {
                    setPlayingId(null);
                    setIsPlaying(false);
                    setPlayerCurrentTime(0);
                    setPlayerDuration(0);
                    audioRef.current?.pause();
                    if (audioRef.current) {
                      audioRef.current.src = '';
                    }
                    if ('mediaSession' in navigator) {
                      navigator.mediaSession.playbackState = 'none';
                    }
                  }}
                  title="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className={styles.loadingView}>Loading your dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
