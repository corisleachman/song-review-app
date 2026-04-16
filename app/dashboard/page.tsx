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
  const [expandedSongIds, setExpandedSongIds] = useState<string[]>([]);

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
    setExpandedSongIds(prev => (
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    ));
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

  return (
    <div className={styles.page}>
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
                const isInfoOpen = expandedSongIds.includes(song.id);
                const latestVersionText = song.latestVersionLabel
                  ? song.latestVersionLabel
                  : song.latestVersionNumber
                    ? `Version ${song.latestVersionNumber}`
                    : 'No audio yet';
                const activitySummary = song.activityFeed[0] ?? null;

                return (
                <div
                  key={song.id}
                  className={`${styles.card} ${viewMode === 'list' ? styles.desktopListCard : styles.desktopGridCard} ${fadingSongIds.includes(song.id) ? styles.cardDeleting : ''} ${isInfoOpen ? styles.cardInfoExpanded : ''}`}
                  onClick={e => handleCardClick(e, song)}
                >
                  {/* Thumbnail */}
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
                    {song.hasNewActivity && (
                      <span className={styles.activityBadge}>New</span>
                    )}

                  </div>

                  {/* Card body */}
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
                      <span className={`${styles.songStatusBadge} ${getSongStatusClass(song.status)}`}>
                        {getSongStatusLabel(song.status)}
                      </span>
                      {song.needsAttention && (
                        renderInteractivePill(
                          `active-actions-${song.id}`,
                          `${song.unresolvedActionCount} active action${song.unresolvedActionCount !== 1 ? 's' : ''}`,
                          event => {
                            event.stopPropagation();
                            openSongContext(song, {
                              versionId: song.activeContextVersionId,
                              focus: 'actions',
                              actionsTab: 'all_versions',
                              actionFilter: 'open',
                            });
                          }
                        )
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.iconBtn} ${isInfoOpen ? styles.iconBtnActive : ''}`}
                        title={isInfoOpen ? 'Hide info' : 'Show info'}
                        aria-label={isInfoOpen ? `Hide info for ${song.title}` : `Show info for ${song.title}`}
                        aria-expanded={isInfoOpen}
                        aria-controls={`song-info-${song.id}`}
                        onClick={e => {
                          e.stopPropagation();
                          toggleSongInfo(song.id);
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                          <circle cx="5.5" cy="5.5" r="4.25" stroke="currentColor" strokeWidth="1" />
                          <path d="M5.5 4.8v2.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                          <circle cx="5.5" cy="3.2" r="0.55" fill="currentColor" />
                        </svg>
                      </button>
                      {/* Pencil — rename */}
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
                      {/* Image — cover art */}
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
                      {/* Trash — delete */}
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
                    {isInfoOpen && (
                      <div
                        id={`song-info-${song.id}`}
                        className={styles.infoPanel}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Latest version</span>
                            <span className={styles.infoValue}>{latestVersionText}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Last activity</span>
                            <span className={styles.infoValue}>{formatActivityTimestamp(song.latestActivityAt)}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Comments</span>
                            <span className={styles.infoValue}>{song.commentCount}</span>
                          </div>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Open work</span>
                            <span className={styles.infoValue}>
                              {song.unresolvedActionCount} active action{song.unresolvedActionCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className={styles.infoMetaRow}>
                          {song.assignedToMeCount > 0 && (
                            renderInteractivePill(
                              `assigned-${song.id}`,
                              `${song.assignedToMeCount} assigned to me`,
                              event => {
                                event.stopPropagation();
                                openSongContext(song, {
                                  versionId: song.assignedContextVersionId,
                                  focus: 'actions',
                                  actionsTab: 'all_versions',
                                  actionFilter: 'assigned_to_me',
                                });
                              }
                            )
                          )}
                          {song.awaitingResponse && (
                            renderInteractivePill(
                              `awaiting-${song.id}`,
                              getAwaitingResponseLabel(song.awaitingResponse) ?? 'Awaiting response',
                              event => {
                                event.stopPropagation();
                                openSongContext(song, {
                                  versionId: song.awaitingVersionId,
                                  focus: 'threads',
                                  threadId: song.awaitingThreadId,
                                });
                              }
                            )
                          )}
                        </div>
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
                        {activitySummary && (
                          <div className={styles.activityFeed}>
                            <div className={styles.activityItem}>
                              <div className={styles.activityItemTop}>
                                <span className={styles.activityItemSummary}>{activitySummary.summary}</span>
                                <span className={styles.activityItemTime}>{formatActivityTime(activitySummary.createdAt)}</span>
                              </div>
                              {activitySummary.detail && (
                                <div className={styles.activityItemDetail}>{activitySummary.detail}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
