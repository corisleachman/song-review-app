'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getIdentity, getAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import styles from './song.module.css';

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  created_by: string;
  created_at: string;
}

interface Song {
  id: string;
  title: string;
  versions: Version[];
}

export default function SongPage() {
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;
  const identity = getIdentity();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editingVersions, setEditingVersions] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/');
      return;
    }
    loadSong();
  }, [router, identity, songId]);

  const loadSong = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('songs')
        .select(
          `
          id,
          title,
          song_versions(id, version_number, label, created_by, created_at)
        `
        )
        .eq('id', songId)
        .single();

      if (fetchError) throw fetchError;
      const songData = {
        ...data,
        versions: data.song_versions || []
      };
      setSong(songData);
      setNewTitle(data.title);
    } catch (err) {
      console.error('Error loading song:', err);
      setError('Failed to load song');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (!newTitle.trim()) return;

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('songs')
        .update({ title: newTitle })
        .eq('id', songId);

      if (updateError) throw updateError;
      setSong(song ? { ...song, title: newTitle } : null);
      setEditingTitle(false);
    } catch (err) {
      setError('Failed to update song title');
    }
  };

  const handleUpdateVersionLabel = async (versionId: string) => {
    const label = editingVersions[versionId];
    if (!label) return;

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('song_versions')
        .update({ label })
        .eq('id', versionId);

      if (updateError) throw updateError;

      setSong(
        song
          ? {
              ...song,
              versions: song.versions.map((v) =>
                v.id === versionId ? { ...v, label } : v
              ),
            }
          : null
      );
      setEditingVersions({ ...editingVersions, [versionId]: '' });
    } catch (err) {
      setError('Failed to update version label');
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      if (!song) return;

      const nextVersion = (song.versions?.length || 0) + 1;
      const fileName = uploadFile.name;
      const filePath = `songs/${songId}/version-${nextVersion}/${fileName}`;

      // Get signed upload URL
      const createResponse = await fetch('/api/versions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          versionNumber: nextVersion,
          label: uploadLabel || `Version ${nextVersion}`,
          filePath,
          fileName,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create version');
      }

      const { uploadUrl } = await createResponse.json();

      // Upload file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: uploadFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      setUploadLabel('');
      setUploadFile(null);
      setShowUploadForm(false);
      loadSong();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading version');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!song) return <div className={styles.error}>Song not found</div>;

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.songHeader}>
        {editingTitle ? (
          <div className={styles.titleEdit}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <button onClick={handleUpdateTitle}>Save</button>
            <button
              onClick={() => {
                setEditingTitle(false);
                setNewTitle(song.title);
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.titleDisplay}>
            <h1>{song.title}</h1>
            <button
              onClick={() => setEditingTitle(true)}
              className={styles.editButton}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <div className={styles.versionsSection}>
        <h2>Versions</h2>
        {song.versions && song.versions.length > 0 ? (
          <div className={styles.versionsList}>
            {song.versions.map((version) => (
              <div key={version.id} className={styles.versionItem}>
                <div className={styles.versionInfo}>
                  {editingVersions[version.id] !== undefined ? (
                    <div className={styles.labelEdit}>
                      <input
                        type="text"
                        value={editingVersions[version.id]}
                        onChange={(e) =>
                          setEditingVersions({
                            ...editingVersions,
                            [version.id]: e.target.value,
                          })
                        }
                        autoFocus
                      />
                      <button onClick={() => handleUpdateVersionLabel(version.id)}>
                        Save
                      </button>
                      <button
                        onClick={() => {
                          const newEditing = { ...editingVersions };
                          delete newEditing[version.id];
                          setEditingVersions(newEditing);
                        }}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className={styles.labelDisplay}>
                      <span className={styles.versionLabel}>
                        Version {version.version_number}
                        {version.label && ` - ${version.label}`}
                      </span>
                      <button
                        onClick={() =>
                          setEditingVersions({
                            ...editingVersions,
                            [version.id]: version.label || '',
                          })
                        }
                        className={styles.editButton}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  <p className={styles.versionMeta}>
                    Uploaded by {version.created_by} on{' '}
                    {new Date(version.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/songs/${songId}/versions/${version.id}`}
                  className={styles.openButton}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No versions yet</p>
        )}
      </div>

      {showUploadForm ? (
        <form onSubmit={handleUploadVersion} className={styles.uploadForm}>
          <h3>Upload New Version</h3>
          <div className={styles.formGroup}>
            <label>Version Label (optional)</label>
            <input
              type="text"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="e.g., Drums Up"
            />
          </div>
          <div className={styles.formGroup}>
            <label>MP3 File</label>
            <input
              type="file"
              accept=".mp3"
              onChange={(e) => setUploadFile((e.target as HTMLInputElement).files?.[0] || null)}
              required
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Version'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
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
          onClick={() => setShowUploadForm(true)}
          className={styles.uploadButton}
        >
          + Upload New Version
        </button>
      )}
    </div>
  );
}
