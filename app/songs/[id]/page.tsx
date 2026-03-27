'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from './song.module.css';

const supabase = createClient();
const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

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

export default function SongUploadPage() {
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;
  const identity = getIdentity();

  const [songTitle, setSongTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identity) { router.push('/identify'); return; }
    loadSong();
  }, []);

  async function loadSong() {
    const { data } = await supabase.from('songs').select('id, title, song_versions(id)').eq('id', songId).single();
    if (!data) return;
    setSongTitle(data.title);
    // If versions already exist, redirect to latest
    const versions = (data as any).song_versions ?? [];
    if (versions.length > 0) {
      const { data: versionsData } = await supabase
        .from('song_versions')
        .select('id')
        .eq('song_id', songId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      if (versionsData) router.replace(`/songs/${songId}/versions/${versionsData.id}`);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const validationError = validateAudioFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(f);
  }

  function handleFileSelected(f?: File) {
    if (!f) return;
    const validationError = validateAudioFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(f);
  }

  async function handleUpload() {
    if (!file || !identity) return;
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const res = await fetch('/api/versions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          fileName: file.name,
          fileSize: file.size,
          createdBy: identity,
          label: label.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.uploadUrl || !data.versionId) {
        throw new Error(data.error || 'Could not start the upload.');
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.send(file);
      });

      router.push(`/songs/${songId}/versions/${data.versionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Songs
        </button>
        {songTitle && <span className={styles.songTitle}>{songTitle}</span>}
      </header>

      <div className={styles.body}>
        <div className={styles.uploadCard}>
          <div className={styles.uploadTitle}>Upload first version</div>
          <div className={styles.uploadSub}>Drop your audio file to get started</div>

          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''} ${file ? styles.dropZoneHasFile : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            {file ? (
              <div className={styles.fileInfo}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M8 11l2.5 2.5 4-4" stroke="#1d9e75" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="11" cy="11" r="8.5" stroke="#1d9e75" strokeWidth="1.4"/>
                </svg>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                <button
                  className={styles.removeFile}
                  onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); setError(''); }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 22V10M11 15l5-5 5 5M8 24h16" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.dropText}>Drop audio file here</span>
                <span className={styles.dropOr}>or click to browse</span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
            style={{ display: 'none' }}
            onChange={e => { handleFileSelected(e.target.files?.[0]); }}
          />

          <input
            className={styles.labelInput}
            placeholder='Version label (optional, e.g. "Rough mix")'
            value={label}
            onChange={e => setLabel(e.target.value)}
            disabled={uploading}
          />

          <textarea
            className={styles.notesInput}
            placeholder='Version notes (optional, e.g. "New vocal comp and brighter snare")'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            disabled={uploading}
          />

          <p className={styles.uploadHelp}>Supported: MP3, WAV, M4A, FLAC, OGG. Files under 200 MB work best. Notes are optional and meant to be short.</p>

          {uploading && (
            <div>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressLabel}>{progress}% uploaded to song-files...</span>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload version'}
          </button>
        </div>
      </div>
    </div>
  );
}
