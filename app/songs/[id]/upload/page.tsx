'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getIdentity } from '@/lib/auth';
import styles from '../song.module.css';

const supabase = createClient();

export default function UploadVersionPage() {
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;
  const identity = getIdentity();

  const [songTitle, setSongTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identity) { router.push('/identify'); return; }
    supabase.from('songs').select('title').eq('id', songId).single()
      .then(({ data }) => { if (data) setSongTitle(data.title); });
  }, []);

  // NOTE: no redirect if versions exist — this page is always for uploading a NEW version

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('audio/')) setFile(f);
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
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const { versionId, uploadUrl } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.send(file);
      });

      router.push(`/songs/${songId}/versions/${versionId}`);
    } catch (e: any) {
      setError(e.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        {songTitle && <span className={styles.songTitle}>{songTitle}</span>}
      </header>

      <div className={styles.body}>
        <div className={styles.uploadCard}>
          <div className={styles.uploadTitle}>Upload new version</div>
          <div className={styles.uploadSub}>Drop your audio file to add a new version</div>

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
                <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  className={styles.removeFile}
                  onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); }}
                >✕</button>
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
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
          />

          <input
            className={styles.labelInput}
            placeholder='Version label (optional, e.g. "Rough mix")'
            value={label}
            onChange={e => setLabel(e.target.value)}
            disabled={uploading}
          />

          {uploading && (
            <div>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressLabel}>{progress}%</span>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? `Uploading… ${progress}%` : 'Upload version'}
          </button>
        </div>
      </div>
    </div>
  );
}
