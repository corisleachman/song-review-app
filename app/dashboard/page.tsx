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
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .select('id, title')
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
        body: JSON.stringify({
          title: newTitle.trim(),
          fileName: newFile?.name ?? null,
          fileSize: newFile?.size ?? null,
        }),
      });
      const { songId, versionId, uploadUrl } = await res.json();
      if (newFile && uploadUrl) {
        await fetch(uploadUrl, { method: 'PUT', body: newFile, headers: { 'Content-Type': newFile.type } });
      }
      setShowNewModal(false);
      setNewTitle('');
      setNewFile(null);
      if (versionId) {
        router.push(`/songs/${songId}/versions/${versionId}`);
      } else {
        loadSongs();
      }
    } finally {
      setCreating(false);
    }
  }

  function handleCardClick(song: Song) {
    if (!song.latestVersionId) return;
    router.push(`/songs/${song.id}/versions/${song.latestVersionId}`);
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

  // Group actions by song title
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
          {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
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
                  onClick={() => handleCardClick(song)}
                  style={{ cursor: song.latestVersionId ? 'pointer' : 'default' }}
                >
                  <div className={styles.cardThumb}>
                    <div className={styles.thumbPlaceholder}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3v8M6 8l3 3 3-3M4 13.5h10" stroke="rgba(255,20,147,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {song.latestVersionNumber != null && (
                      <span className={styles.versionBadge}>v{song.latestVersionNumber}</span>
                    )}
                    {song.commentCount > 0 && (
                      <span className={styles.commentBadge}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1h6v4.5H4.5L3 7V5.5H1V1z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/>
                        </svg>
                        {song.commentCount}
                      </span>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>{song.title}</div>
                    <div className={styles.cardMeta}>
                      <span>{song.latestVersionNumber ? `${song.latestVersionNumber} version${song.latestVersionNumber !== 1 ? 's' : ''}` : 'No audio yet'}</span>
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
                      className={`${styles.actionCheck} ${action.status === 'completed' ? styles.actionCheckDone : ''}`}
                      onClick={() => toggleAction(action)}
                    >
                      {action.status === 'completed' && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    <div className={styles.actionContent}>
                      <div className={`${styles.actionText} ${action.status === 'completed' ? styles.actionDone : ''}`}>
                        {action.description}
                      </div>
                      {action.timestamp_seconds != null && (
                        <div className={styles.actionMeta}>@ {formatTime(action.timestamp_seconds)}</div>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={e => setNewFile(e.target.files?.[0] ?? null)}
            />
            <button
              className={styles.modalInput}
              style={{ cursor: 'pointer', textAlign: 'left', color: newFile ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)', marginBottom: 16 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {newFile ? newFile.name : 'Attach audio file (optional)'}
            </button>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => { setShowNewModal(false); setNewTitle(''); setNewFile(null); }}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={createSong} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
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
