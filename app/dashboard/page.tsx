'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './dashboard.module.css';

const supabase = createClient();

type Stage = 'early_stage' | 'in_production' | 'completed';

interface Song {
  id: string;
  title: string;
  image_url?: string | null;
  imageUploading?: boolean;
  imageError?: string | null;
  created_at?: string;
  stage: Stage | null;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  latestVersionLabel: string | null;
  latestVersionCreatedAt: string | null;
  commentCount: number;
  latestActivityAt: string | null;
  hasNewActivity: boolean;
}

interface Action {
  id: string;
  description: string;
  status: 'pending' | 'approved' | 'completed';
  suggested_by: string;
  timestamp_seconds?: number;
  song_id: string;
  songTitle?: string;
}

function getNextActionStatus(status: Action['status']) {
  if (status === 'pending') return 'approved';
  if (status === 'approved') return 'completed';
  return 'pending';
}

function getSongSeenStorageKey(identity: 'Coris' | 'Al') {
  return `song-review-song-seen:${identity}`;
}

function getComparableTime(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function DashboardContent() {
  const router = useRouter();
  const [identity, setIdentity] = useState<'Coris' | 'Al' | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'songs' | 'actions'>('songs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [actionFilter, setActionFilter] = useState<'all' | Action['status']>('all');
  const [songSort, setSongSort] = useState<'activity' | 'upload' | 'title'>('activity');
  const [stageFilter, setStageFilter] = useState<'all' | Stage>('all');

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
    const currentIdentity = getIdentity();
    if (!currentIdentity) { router.push('/identify'); return; }
    setIdentity(currentIdentity);
    loadAll(currentIdentity);
  }, [router]);

  async function loadAll(currentIdentity: 'Coris' | 'Al' | null = identity) {
    setLoading(true);
    await Promise.all([loadSongs(currentIdentity), loadActions()]);
    setLoading(false);
  }

  async function loadSongs(currentIdentity: 'Coris' | 'Al' | null = identity) {
    const { data: songsData } = await supabase
      .from('songs')
      .select('id, title, image_url, created_at, stage')
      .order('created_at', { ascending: false });

    if (!songsData) return;

    const { data: versionsData } = await supabase
      .from('song_versions')
      .select('id, song_id, version_number, label, created_at')
      .order('version_number', { ascending: false });

    const { data: threadsData } = await supabase
      .from('comment_threads')
      .select('id, song_version_id, created_at, updated_at');

    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, thread_id');

    const { data: actionsActivityData } = await supabase
      .from('actions')
      .select('song_id, created_at, updated_at');

    const seenMap = typeof window !== 'undefined' && currentIdentity
      ? JSON.parse(window.localStorage.getItem(getSongSeenStorageKey(currentIdentity)) || '{}') as Record<string, string>
      : {};
    const nextSeenMap = { ...seenMap };
    let seededSeenMap = false;

    const assembled: Song[] = songsData.map(song => {
      const songVersions = (versionsData ?? []).filter(v => v.song_id === song.id);
      const latest = songVersions[0] ?? null;
      const versionIds = songVersions.map(v => v.id);
      const threadIds = (threadsData ?? [])
        .filter(t => versionIds.includes(t.song_version_id))
        .map(t => t.id);
      const commentCount = (commentsData ?? []).filter(c => threadIds.includes(c.thread_id)).length;
      const songThreadActivity = (threadsData ?? [])
        .filter(t => versionIds.includes(t.song_version_id))
        .map(t => t.updated_at || t.created_at);
      const songActionActivity = (actionsActivityData ?? [])
        .filter(a => a.song_id === song.id)
        .map(a => a.updated_at || a.created_at);
      const latestActivityAt = [song.created_at, ...songVersions.map(v => v.created_at), ...songThreadActivity, ...songActionActivity]
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

      if (currentIdentity && latestActivityAt && !nextSeenMap[song.id]) {
        nextSeenMap[song.id] = latestActivityAt;
        seededSeenMap = true;
      }

      return {
        id: song.id,
        title: song.title,
        image_url: song.image_url ?? null,
        created_at: song.created_at,
        stage: (song.stage as Stage) ?? null,
        latestVersionId: latest?.id ?? null,
        latestVersionNumber: latest?.version_number ?? null,
        latestVersionLabel: latest?.label ?? null,
        latestVersionCreatedAt: latest?.created_at ?? null,
        commentCount,
        latestActivityAt,
        hasNewActivity: Boolean(
          latestActivityAt &&
          nextSeenMap[song.id] &&
          new Date(latestActivityAt).getTime() > new Date(nextSeenMap[song.id]).getTime()
        ),
      };
    });

    if (currentIdentity && seededSeenMap && typeof window !== 'undefined') {
      window.localStorage.setItem(getSongSeenStorageKey(currentIdentity), JSON.stringify(nextSeenMap));
    }

    setSongs(assembled);
  }

  async function loadActions() {
    const { data: actionsData } = await supabase
      .from('actions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: songsData } = await supabase.from('songs').select('id, title');

    const withTitles = (actionsData ?? []).map(a => ({
      ...a,
      songTitle: songsData?.find(s => s.id === a.song_id)?.title ?? 'Unknown',
    }));

    setActions(withTitles);
  }

  async function toggleAction(action: Action) {
    const newStatus = getNextActionStatus(action.status);
    await supabase.from('actions').update({ status: newStatus }).eq('id', action.id);
    loadActions();
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
      const { songId } = await res.json();
      setShowNewModal(false);
      setNewTitle('');
      await loadSongs();
      // Navigate to song page (no version yet)
      router.push(`/songs/${songId}`);
    } finally {
      setCreating(false);
    }
  }

  async function commitRename(id: string) {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await supabase.from('songs').update({ title: trimmed }).eq('id', id);
      setSongs(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s));
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
    // Clear any previous error and mark uploading
    setSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUploading: true, imageError: null } : s));
    try {
      const formData = new FormData();
      formData.append('songId', songId);
      formData.append('file', file);
      const res = await fetch('/api/songs/upload-image', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        console.error('Image upload failed', text);
        setSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUploading: false, imageError: 'Upload failed' } : s));
        return;
      }
      const { imageUrl } = await res.json();
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, image_url: imageUrl, imageUploading: false, imageError: null } : s));
    } catch (e) {
      console.error('Image upload error:', e);
      setSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUploading: false, imageError: 'Upload failed' } : s));
    }
  }

  function handleCardClick(e: React.MouseEvent, song: Song) {
    // Don't navigate if clicking an action button or if renaming
    if ((e.target as HTMLElement).closest('button') || editingId === song.id) return;
    if (identity && typeof window !== 'undefined') {
      const seenMap = JSON.parse(window.localStorage.getItem(getSongSeenStorageKey(identity)) || '{}') as Record<string, string>;
      window.localStorage.setItem(
        getSongSeenStorageKey(identity),
        JSON.stringify({ ...seenMap, [song.id]: new Date().toISOString() })
      );
      setSongs(prev => prev.map(item => item.id === song.id ? { ...item, hasNewActivity: false } : item));
    }
    if (song.latestVersionId) {
      router.push(`/songs/${song.id}/versions/${song.latestVersionId}`);
    } else {
      router.push(`/songs/${song.id}`);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const filteredActions = actions.filter(a => {
    if (actionFilter === 'all') return true;
    return a.status === actionFilter;
  });

  const actionCounts = actions.reduce<Record<Action['status'], number>>((acc, action) => {
    acc[action.status] += 1;
    return acc;
  }, { pending: 0, approved: 0, completed: 0 });

  const activeActionCount = actions.filter(a => a.status !== 'completed').length;
  const emptyActionMessage = actionFilter === 'all'
    ? 'No actions yet. Mark a comment as an action when something needs following up.'
    : `No ${actionFilter} actions right now`;

  const sortedActionGroups = Object.entries(filteredActions.reduce<Record<string, Action[]>>((acc, action) => {
    const key = action.songTitle ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(action);
    return acc;
  }, {})).sort(([left], [right]) => left.localeCompare(right));

  const actionFilterOptions: Array<{ value: 'all' | Action['status']; label: string; count: number }> = [
    { value: 'all', label: 'All', count: actions.length },
    { value: 'pending', label: 'Pending', count: actionCounts.pending },
    { value: 'approved', label: 'Approved', count: actionCounts.approved },
    { value: 'completed', label: 'Completed', count: actionCounts.completed },
  ];

  const getActionToggleClass = (status: Action['status']) => {
    if (status === 'approved') return styles.actionToggleApproved;
    if (status === 'completed') return styles.actionToggleDone;
    return '';
  };

  const getActionStatusClass = (status: Action['status']) => {
    if (status === 'approved') return styles.actionStatusApproved;
    if (status === 'completed') return styles.actionStatusDone;
    return styles.actionStatusPending;
  };

  const getActionStatusLabel = (status: Action['status']) => {
    if (status === 'completed') return 'Completed';
    if (status === 'approved') return 'Approved';
    return 'Pending';
  };

  const getActionToggleTitle = (status: Action['status']) => {
    if (status === 'pending') return 'Mark as approved';
    if (status === 'approved') return 'Mark as completed';
    return 'Move back to pending';
  };

  const renderActionGlyph = (status: Action['status']) => {
    if (status === 'completed') {
      return (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      );
    }

    if (status === 'approved') {
      return <span className={styles.actionApprovedDot} />;
    }

    return null;
  };

  const hasSongs = songs.length > 0;
  const songEmptyMessage = 'Start with one upload and the review flow will build from there.';

  const sortedSongs = [...songs].sort((left, right) => {
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

  const stageCounts: Record<'all' | Stage, number> = {
    all: songs.length,
    early_stage: songs.filter(s => (s.stage ?? 'early_stage') === 'early_stage').length,
    in_production: songs.filter(s => s.stage === 'in_production').length,
    completed: songs.filter(s => s.stage === 'completed').length,
  };

  const visibleSongs = stageFilter === 'all'
    ? sortedSongs
    : sortedSongs.filter(s => (s.stage ?? 'early_stage') === stageFilter);

  const stageTabs: Array<{ value: 'all' | Stage; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'early_stage', label: 'Early Stage' },
    { value: 'in_production', label: 'In Production' },
    { value: 'completed', label: 'Completed' },
  ];

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
              background: identity === 'Coris'
                ? 'rgba(255,20,147,0.2)'
                : identity === 'Al'
                  ? 'rgba(0,212,255,0.2)'
                  : 'rgba(255,255,255,0.08)',
              color: identity === 'Coris'
                ? '#ff1493'
                : identity === 'Al'
                  ? '#00d4ff'
                  : 'rgba(255,255,255,0.45)',
            }}
          >
            {identity?.[0] ?? ''}
          </div>
        </div>
      </header>

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
            <div className={styles.stageTabs}>
              {stageTabs.map(tab => (
                <button
                  key={tab.value}
                  className={`${styles.stageTab} ${stageFilter === tab.value ? styles.stageTabActive : ''}`}
                  onClick={() => setStageFilter(tab.value)}
                >
                  {tab.label}
                  {stageCounts[tab.value] > 0 && (
                    <span className={styles.stageTabCount}>{stageCounts[tab.value]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className={styles.emptyState}>Loading your songs and actions…</p>
          ) : visibleSongs.length > 0 ? (
            <div className={`${styles.songsGrid} ${viewMode === 'list' ? styles.songsGridList : ''}`}>
              {visibleSongs.map(song => (
                <div
                  key={song.id}
                  className={`${styles.card} ${viewMode === 'list' ? styles.desktopListCard : styles.desktopGridCard} ${fadingSongIds.includes(song.id) ? styles.cardDeleting : ''}`}
                  onClick={e => handleCardClick(e, song)}
                >
                  {/* Thumbnail */}
                  <div className={styles.cardThumb}>
                    {song.imageUploading ? (
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(13,9,20,0.7)',borderRadius:8}}>
                        <div style={{width:18,height:18,border:'2px solid #ff1493',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
                      </div>
                    ) : song.imageError ? (
                      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(13,9,20,0.85)',borderRadius:8,gap:4}}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 12H2L8 2z" stroke="#ff6b6b" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="#ff6b6b" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        <span style={{fontSize:'0.62rem',color:'#ff6b6b',textAlign:'center',lineHeight:1.2}}>Upload failed<br/>tap to retry</span>
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
                    {song.latestVersionNumber != null && (
                      <span className={styles.versionBadge}>v{song.latestVersionNumber}</span>
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
                    <div className={styles.cardActions}>
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
                    <div className={styles.cardMetaPrimary}>
                      {song.latestVersionLabel
                        ? song.latestVersionLabel
                        : song.latestVersionNumber
                          ? `v${song.latestVersionNumber}`
                          : 'No audio'}
                    </div>
                    {song.commentCount > 0 && (
                      <div className={styles.cardMetaComments}>
                        <span className={styles.commentCountIcon}>
                          <span>{song.commentCount}</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path
                              d="M3 3.5h8a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6l-2.5 2V9.5H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className={styles.commentCountText}>
                          {song.commentCount} comment{song.commentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

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
              <div className={styles.emptyStateTitle}>{stageFilter === 'all' ? 'No songs yet' : 'No songs here'}</div>
              <p className={styles.emptyStateText}>{stageFilter === 'all' ? songEmptyMessage : 'No songs in this category yet.'}</p>
              {stageFilter === 'all' && (
                <button className={styles.emptyStateAction} onClick={() => setShowNewModal(true)}>
                  Create your first song
                </button>
              )}
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
                      <div className={`${styles.actionText} ${action.status === 'completed' ? styles.actionTextDone : ''}`}>
                        {action.description}
                      </div>
                      <div className={styles.actionMeta}>
                        <span className={`${styles.actionStatus} ${getActionStatusClass(action.status)}`}>
                          {getActionStatusLabel(action.status)}
                        </span>
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
