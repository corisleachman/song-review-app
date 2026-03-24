'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getIdentity, getAuth, formatTimestamp } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface Song {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  versions?: Array<{ version_number: number; label: string | null }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSongForm, setShowNewSongForm] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const identity = getIdentity();

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/?redirectTo=/dashboard');
      return;
    }
    loadSongs();
  }, [router, identity]);

  const loadSongs = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          song_versions(version_number, label)
        `)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSongs(data || []);
    } catch (err) {
      console.error('Error loading songs:', err);
      setError('Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle || !newVersionFile) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/songs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSongTitle,
          versionLabel: newVersionLabel || 'Demo',
          fileName: newVersionFile.name,
          fileSize: newVersionFile.size,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create song');
      }

      const { songId, versionId, uploadUrl } = await response.json();

      // Upload file to Supabase Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: newVersionFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }

      // Clear form and reload
      setNewSongTitle('');
      setNewVersionLabel('');
      setNewVersionFile(null);
      setShowNewSongForm(false);
      loadSongs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating song');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Song Review</h1>
        <p className={styles.user}>Logged in as: {identity}</p>
      </div>

      {songs.length === 0 && !showNewSongForm && (
        <p className={styles.empty}>No songs yet. Create one to get started.</p>
      )}

      {songs.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Song</th>
              <th>Latest Version</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => {
              const latestVersion = song.versions && song.versions.length > 0 
                ? song.versions.sort((a, b) => b.version_number - a.version_number)[0]
                : null;
              const updated = new Date(song.updated_at).toLocaleDateString();
              return (
                <tr key={song.id}>
                  <td className={styles.songTitle}>{song.title}</td>
                  <td className={styles.version}>
                    {latestVersion
                      ? `Version ${latestVersion.version_number}${latestVersion.label ? ` - ${latestVersion.label}` : ''}`
                      : 'No versions'}
                  </td>
                  <td className={styles.updated}>{updated}</td>
                  <td className={styles.action}>
                    <Link href={`/songs/${song.id}`} className={styles.link}>
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showNewSongForm ? (
        <form onSubmit={handleCreateSong} className={styles.form}>
          <h2>New Song</h2>
          <div className={styles.formGroup}>
            <label>Song Title</label>
            <input
              type="text"
              value={newSongTitle}
              onChange={(e) => setNewSongTitle(e.target.value)}
              placeholder="e.g., Fake It Like You've Made It"
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Version Label</label>
            <input
              type="text"
              value={newVersionLabel}
              onChange={(e) => setNewVersionLabel(e.target.value)}
              placeholder="e.g., Demo"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Upload MP3</label>
            <input
              type="file"
              accept=".mp3"
              onChange={(e) => setNewVersionFile(e.files?.[0] || null)}
              required
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Song'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewSongForm(false);
                setError('');
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowNewSongForm(true)}
          className={styles.newSongButton}
        >
          + New Song
        </button>
      )}
    </div>
  );
}
