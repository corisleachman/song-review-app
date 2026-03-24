'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getAuth, getIdentity } from '@/lib/auth';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface Action {
  id: string;
  song_id: string;
  description: string;
  suggested_by: string;
  status: 'pending' | 'approved' | 'completed';
  created_at: string;
}

interface Song {
  id: string;
  title: string;
  image_url?: string;
  actions?: Action[];
}

interface GroupedActions {
  [songId: string]: {
    song: Song;
    actions: Action[];
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const identity = getIdentity();
  const [songs, setSongs] = useState<Song[]>([]);
  const [actions, setActions] = useState<GroupedActions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [uploadingSongId, setUploadingSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }

    loadData();
  }, [identity]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (songsError) {
        throw songsError;
      }

      setSongs(songsData || []);

      // Load actions for all songs
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (actionsError) {
        throw actionsError;
      }

      // Group actions by song
      const groupedActions: GroupedActions = {};
      (actionsData || []).forEach(action => {
        if (!groupedActions[action.song_id]) {
          groupedActions[action.song_id] = {
            song: songsData?.find(s => s.id === action.song_id) || { id: action.song_id, title: 'Unknown' },
            actions: [],
          };
        }
        groupedActions[action.song_id].actions.push(action);
      });

      setActions(groupedActions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Error loading data:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSong = async () => {
    if (!newTitle.trim()) {
      setCreateError('Song title is required');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/songs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create song');
      }

      setNewTitle('');
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create song';
      setCreateError(errorMessage);
      console.error('Error creating song:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleImageUpload = async (songId: string, file: File) => {
    setUploadingSongId(songId);
    try {
      const formData = new FormData();
      formData.append('songId', songId);
      formData.append('file', file);

      const response = await fetch('/api/songs/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      console.error('Error uploading image:', err);
      alert(`Error: ${errorMessage}`);
    } finally {
      setUploadingSongId(null);
    }
  };

  const handleToggleAction = async (actionId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update action');
      }

      await loadData();
    } catch (err) {
      console.error('Error updating action:', err);
    }
  };

  const filteredActions = Object.entries(actions).flatMap(([songId, { song, actions: songActions }]) => {
    const filtered =
      filterStatus === 'all'
        ? songActions
        : songActions.filter(a => a.status === filterStatus);
    return filtered.length > 0 ? [{ songId, song, actions: filtered }] : [];
  });

  const pendingActionsCount = Object.values(actions).reduce(
    (sum, { actions: songActions }) => sum + songActions.filter(a => a.status === 'pending').length,
    0
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading songs...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          🎵 <span>Song Review</span>
        </div>
        <div className={styles.headerRight}>
          <p className={styles.userInfo}>Logged in as: {identity}</p>
          <Link href="/settings" className={styles.settingsButton}>
            ⚙️ SETTINGS
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>❌</span>
            <span className={styles.errorText}>{error}</span>
            <button className={styles.errorClose} onClick={() => setError(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {/* SONGS PANEL (Left) */}
        <div className={styles.songsPanel}>
          <div className={styles.songsHeader}>
            <h2 className={styles.sectionTitle}>🎵 Songs</h2>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className={styles.createButton}>
              + NEW SONG
            </button>
          </div>

          {showCreateForm && (
            <div className={styles.createForm}>
              <input
                type="text"
                placeholder="Song title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCreateSong()}
                className={styles.input}
                disabled={isCreating}
              />
              {createError && <div className={styles.createError}>{createError}</div>}
              <div className={styles.formButtons}>
                <button onClick={handleCreateSong} className={styles.submitButton} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTitle('');
                    setCreateError(null);
                  }}
                  className={styles.cancelButton}
                  disabled={isCreating}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className={styles.songsList}>
            {songs.map(song => (
              <div key={song.id} className={styles.songCardWrapper}>
                <Link href={`/songs/${song.id}`} className={styles.songCard}>
                  <div className={styles.songImageContainer}>
                    {song.image_url ? (
                      <img src={song.image_url} alt={song.title} className={styles.songImage} />
                    ) : (
                      <div className={styles.songImagePlaceholder}>🎵</div>
                    )}
                  </div>
                  <div className={styles.songInfo}>
                    <h3>{song.title}</h3>
                  </div>
                </Link>
                <div className={styles.songActions}>
                  <Link href={`/songs/${song.id}`} className={styles.editButton} title="Edit song">
                    ✏️
                  </Link>
                  <button
                    onClick={async e => {
                      e.preventDefault();
                      if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
                        try {
                          const response = await fetch(`/api/songs/${song.id}`, {
                            method: 'DELETE',
                          });

                          if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.error || 'Failed to delete song');
                          }

                          await loadData();
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Failed to delete song';
                          console.error('Error deleting song:', err);
                          alert(`Error: ${errorMessage}`);
                        }
                      }
                    }}
                    className={styles.deleteButton}
                    title="Delete song"
                  >
                    🗑️
                  </button>
                  <label className={styles.uploadLabel}>
                    {uploadingSongId === song.id ? '⏳' : '🖼️'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          handleImageUpload(song.id, e.target.files[0]);
                        }
                      }}
                      disabled={uploadingSongId === song.id}
                      className={styles.fileInput}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS PANEL (Right) */}
        <div className={styles.actionsPanel}>
          <div className={styles.actionsHeader}>
            <div>
              <h2 className={styles.sectionTitle}>📋 Actions</h2>
              <p className={styles.actionCount}>
                {pendingActionsCount} pending • {songs.length} song{songs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterButton} ${filterStatus === 'all' ? styles.active : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                ALL
              </button>
              <button
                className={`${styles.filterButton} ${filterStatus === 'pending' ? styles.active : ''}`}
                onClick={() => setFilterStatus('pending')}
              >
                PENDING
              </button>
              <button
                className={`${styles.filterButton} ${filterStatus === 'completed' ? styles.active : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                COMPLETED
              </button>
            </div>
          </div>

          {filteredActions.length > 0 ? (
            <div className={styles.actionsList}>
              {filteredActions.map(({ songId, song, actions: songActions }) => (
                <div key={songId} className={styles.songGroup}>
                  <Link href={`/songs/${songId}`} className={styles.songLink}>
                    <div className={styles.songHeader}>
                      <h3 className={styles.songTitle}>{song.title}</h3>
                      <span className={styles.actionCountBadge}>{songActions.length}</span>
                    </div>
                  </Link>

                  <div className={styles.actionsGroup}>
                    {songActions.map(action => (
                      <div
                        key={action.id}
                        className={`${styles.actionItem} ${action.status === 'completed' ? styles.completed : ''}`}
                      >
                        <button
                          className={styles.checkbox}
                          onClick={() => handleToggleAction(action.id, action.status)}
                          title={action.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {action.status === 'completed' ? '✓' : '○'}
                        </button>
                        <div className={styles.actionContent}>
                          <p className={styles.actionText}>{action.description}</p>
                          <span className={styles.actionMeta}>Suggested by {action.suggested_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              {filterStatus === 'all'
                ? 'No actions yet. Mark comments as actions to see them here.'
                : `No ${filterStatus} actions.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
