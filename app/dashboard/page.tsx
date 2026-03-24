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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }

    loadData();
  }, [router, identity]);

  const loadData = async () => {
    try {
      const supabase = createClient();

      // Load songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (songsError) throw songsError;

      // Load all actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select('id, song_id, description, suggested_by, status, created_at')
        .order('created_at', { ascending: false });

      if (actionsError) throw actionsError;

      // Group actions by song
      const grouped: GroupedActions = {};
      if (songsData) {
        songsData.forEach(song => {
          grouped[song.id] = {
            song,
            actions: (actionsData || []).filter(a => a.song_id === song.id),
          };
        });
      }

      setSongs(songsData || []);
      setActions(grouped);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSong = async () => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch('/api/songs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
        }),
      });

      if (!response.ok) throw new Error('Failed to create song');

      setNewTitle('');
      setShowCreateForm(false);
      loadData();
    } catch (err) {
      console.error('Error creating song:', err);
      alert('Failed to create song');
    }
  };

  const handleToggleAction = async (actionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update action');
      loadData();
    } catch (err) {
      console.error('Error updating action:', err);
    }
  };

  const pendingActionsCount = Object.values(actions).reduce(
    (sum, { actions: a }) => sum + a.filter(act => act.status === 'pending').length,
    0
  );

  const filteredActions = Object.entries(actions).map(([songId, { song, actions: songActions }]) => ({
    songId,
    song,
    actions: songActions.filter(a => filterStatus === 'all' || a.status === filterStatus),
  })).filter(item => item.actions.length > 0);

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>🏠 Song Review</h1>
          <p className={styles.user}>Logged in as: <strong>{identity}</strong></p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.actionsSection}>
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
                All
              </button>
              <button
                className={`${styles.filterButton} ${filterStatus === 'pending' ? styles.active : ''}`}
                onClick={() => setFilterStatus('pending')}
              >
                Pending
              </button>
              <button
                className={`${styles.filterButton} ${filterStatus === 'completed' ? styles.active : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                Completed
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
                          <span className={styles.actionMeta}>
                            Suggested by {action.suggested_by}
                          </span>
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

        <div className={styles.songsSection}>
          <div className={styles.songsHeader}>
            <h2 className={styles.sectionTitle}>🎵 Songs</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={styles.createButton}
            >
              + New Song
            </button>
          </div>

          {showCreateForm && (
            <div className={styles.createForm}>
              <input
                type="text"
                placeholder="Song title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSong()}
                autoFocus
                className={styles.input}
              />
              <div className={styles.formButtons}>
                <button onClick={handleCreateSong} className={styles.submitButton}>
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTitle('');
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className={styles.songsList}>
            {songs.map(song => (
              <Link key={song.id} href={`/songs/${song.id}`} className={styles.songCard}>
                <h3>{song.title}</h3>
                <p className={styles.songMeta}>
                  {actions[song.id]?.actions.length || 0} action{(actions[song.id]?.actions.length || 0) !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
