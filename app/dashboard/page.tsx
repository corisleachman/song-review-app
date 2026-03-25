'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './dashboard.module.css';

const supabase = createClient();

interface Song {
  id: string;
  title: string;
  image_url?: string | null;
  imageUploading?: boolean;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  commentCount: number;
}

interface Action {
  id: string;
  description: string;
  status: string;
  suggested_by: string;
  timestamp_seconds?: number;
  song_id: string;
  songTitle?: string;
}

function DashboardContent() {
  const router = useRouter();
  const identity = getIdentity();

  const [songs, setSongs] = useState<Song[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'songs' | 'actions'>('songs');
  const [actionFilter, setActionFilter] = useState<'all' | 'pending' | 'done'>('all');

  // New song modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cover art uploads
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverUploadTargetId = useRef<string | null>(null);

  useEffect(() => {
    if (!identity) { router.push('/identify'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadSongs(), loadActions()]);
    setLoading(false);
  }

  async function loadSongs() {
    const { data: songsData } = await supabase
      .from('songs')
      .select('id, title, image_url')
      .order('created_at', { ascending: false });

    if (!songsData) return;

    const { data: versionsData } = await supabase
      .from('song_versions')
      .select('id, song_id, version_number')
      .order('version_number', { ascending: false });

    const { data: threadsData } = await supabase
      .from('comment_threads')
      .select('id, song_version_id');

    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, thread_id');

    const assembled: Song[] = songsData.map(song => {
      const songVersions = (versionsData ?? []).filter(v => v.song_id === song.id);
      const latest = songVersions[0] ?? null;
      const versionIds = songVersions.map(v => v.id);
      const threadIds = (threadsData ?? [])
        .filter(t => versionIds.includes(t.song_version_id))
        .map(t => t.id);
      const commentCount = (commentsData ?? []).filter(c => threadIds.includes(c.thread_id)).length;
      return {
        id: song.id,
        title: song.title,
        image_url: song.image_url ?? null,
        latestVersionId: latest?.id ?? null,
        latestVersionNumber: latest?.version_number ?? null,
        commentCount,
      };
    });

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
    const newStatus = action.status === 'completed' ? 'pending' : 'completed';
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
    await fetch(`/api/songs/${id}`, { method: 'DELETE' });
    setSongs(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
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

  function handleCardClick(e: React.MouseEvent, song: Song) {
    // Don't navigate if clicking an action button or if renaming
    if ((e.target as HTMLElement).closest('button') || editingId === song.id) return;
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
    if (actionFilter === 'pending') return a.status === 'pending';
    if (actionFilter === 'done') return a.status === 'completed';
    return true;
  });

  const pendingCount = actions.filter(a => a.status === 'pending').length;

  const actionsBySong: Record<string, Action[]> = {};
  for (const a of filteredActions) {
    const key = a.songTitle ?? 'Unknown';
    if (!actionsBySong[key]) actionsBySong[key] = [];
    actionsBySong[key].push(a);
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            Pulse
          </div>
        </div>
        <div className={styles.headerRight}>
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
          {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
        </button>
      </div>

      <div className={styles.body}>
        {/* Songs panel */}
        <div className={`${styles.songsPanel} ${mobileTab === 'actions' ? styles.hideMobile : ''}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Songs</span>
            <button className={styles.newBtn} onClick={() => setShowNewModal(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New song
            </button>
          </div>

          {loading ? (
            <p className={styles.emptyState}>Loading…</p>
          ) : (
            <div className={styles.songsGrid}>
              {songs.map(song => (
                <div
                  key={song.id}
                  className={styles.card}
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
                    {song.latestVersionNumber != null && (
                      <span className={styles.versionBadge}>v{song.latestVersionNumber}</span>
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
                    <div className={styles.cardMeta}>
                      <span>
                        {song.latestVersionNumber
                          ? `v${song.latestVersionNumber}`
                          : 'No audio'}
                      </span>
                      {song.commentCount > 0 && (
                        <>
                          <span style={{opacity:0.3}}>·</span>
                          <span>{song.commentCount} comment{song.commentCount !== 1 ? 's' : ''}</span>
                        </>
                      )}
                      {/* Hover icon buttons */}
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
                    </div>
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
          )}
        </div>

        {/* Actions panel */}
        <div className={`${styles.actionsPanel} ${mobileTab === 'songs' ? styles.hideMobile : ''}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Actions</span>
          </div>

          <div className={styles.filterRow}>
            {(['all', 'pending', 'done'] as const).map(f => (
              <button
                key={f}
                className={`${styles.filterPill} ${actionFilter === f ? styles.filterPillActive : ''}`}
                onClick={() => setActionFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
              </button>
            ))}
          </div>

          {filteredActions.length === 0 ? (
            <p className={styles.emptyState}>No actions yet</p>
          ) : (
            Object.entries(actionsBySong).map(([songTitle, songActions]) => (
              <div key={songTitle} className={styles.actionGroup}>
                <div className={styles.groupLabel}>{songTitle}</div>
                {songActions.map(action => (
                  <div key={action.id} className={styles.actionRow}>
                    <button
                      className={`${styles.actionToggle} ${action.status === 'completed' ? styles.actionToggleDone : ''}`}
                      onClick={() => toggleAction(action)}
                    >
                      {action.status === 'completed' && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    <div className={styles.actionContent}>
                      <div className={`${styles.actionText} ${action.status === 'completed' ? styles.actionTextDone : ''}`}>
                        {action.description}
                      </div>
                      {action.timestamp_seconds != null && (
                        <div className={styles.actionTimestamp}>@ {formatTime(action.timestamp_seconds)}</div>
                      )}
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
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setDeletingId(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Delete song?</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
              This will permanently delete the song, all versions, comments, and actions. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeletingId(null)}>
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                style={{ background: '#e53e3e' }}
                onClick={() => deleteSong(deletingId)}
              >
                Delete
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
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
