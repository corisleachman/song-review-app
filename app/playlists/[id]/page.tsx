'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from '../playlists.module.css';

type Song = { id: string; title: string; status: string | null; position?: number };
type Detail = { playlist: { id: string; title: string; is_public: boolean; image_url: string | null }; songs: Song[]; available: Song[] };

export default function ManagePlaylistPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) ?? '';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, { cache: 'no-store' });
      if (!res.ok) { setError('Could not load this playlist.'); setDetail(null); return; }
      const data = (await res.json()) as Detail;
      setDetail(data);
      setTitle(data.playlist.title);
      setError(null);
    } catch {
      setError('Could not load this playlist.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    await fetch(`/api/playlists/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  };

  const saveTitle = async () => {
    const t = title.trim();
    if (t && detail && t !== detail.playlist.title) {
      await patch({ title: t });
      setDetail({ ...detail, playlist: { ...detail.playlist, title: t } });
    }
  };

  const togglePublic = async (pub: boolean) => {
    if (!detail) return;
    setDetail({ ...detail, playlist: { ...detail.playlist, is_public: pub } });
    await patch({ is_public: pub });
  };

  const addSong = async (songId: string) => {
    setBusy(true);
    await fetch(`/api/playlists/${id}/songs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }),
    });
    await load();
    setBusy(false);
  };

  const removeSong = async (songId: string) => {
    setBusy(true);
    await fetch(`/api/playlists/${id}/songs/${songId}`, { method: 'DELETE' });
    await load();
    setBusy(false);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    if (!detail) return;
    const arr = [...detail.songs];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setDetail({ ...detail, songs: arr });
    await fetch(`/api/playlists/${id}/songs`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedSongIds: arr.map((s) => s.id) }),
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/listen/playlist/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };

  if (loading) return <div className={styles.wrap}><div className={styles.empty}>Loading…</div></div>;
  if (!detail) return <div className={styles.wrap}><div className={styles.empty}>{error ?? 'Not found.'}</div></div>;

  const isPublic = detail.playlist.is_public;
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/listen/playlist/${id}`
    : `/listen/playlist/${id}`;

  const uploadCover = async (file: File) => {
    setCoverPreview(URL.createObjectURL(file)); setCoverUploading(true); setCoverError(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`/api/playlists/${id}/image`, { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Upload failed'); }
      const data = await res.json();
      setDetail((d) => (d ? { ...d, playlist: { ...d.playlist, image_url: data.imageUrl } } : d));
      setCoverUploading(false);
    } catch (err) { setCoverUploading(false); setCoverError(err instanceof Error ? err.message : 'Cover upload failed'); }
  };
  const removeCover = async () => {
    setCoverError(null);
    try { await fetch(`/api/playlists/${id}/image`, { method: 'DELETE' }); } catch { /* ignore */ }
    setCoverPreview(null);
    setDetail((d) => (d ? { ...d, playlist: { ...d.playlist, image_url: null } } : d));
  };

  const coverUrl = coverPreview || detail?.playlist.image_url || null;

  return (
    <div className={styles.wrap}>
      <div className={styles.crumb}><Link href="/playlists" className={styles.back}>← Playlists</Link></div>

      <div className={styles.titleRow}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void saveTitle()}
          aria-label="Playlist title"
          maxLength={200}
        />
      </div>

      <div className={styles.coverRow}>
        <div
          className={styles.coverSlot}
          onClick={() => coverInputRef.current?.click()}
          style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          title="Playlist cover"
        >
          {coverUploading ? <span className={styles.coverBusy}>…</span> : !coverUrl ? '＋' : null}
        </div>
        <div className={styles.coverText}>
          <div className={styles.coverLabel}>Playlist cover</div>
          <div className={styles.coverHint}>
            {coverError ? coverError : coverUrl ? 'Custom cover set — used as the share preview.' : 'Optional. Defaults to the first track’s artwork. Click to upload.'}
          </div>
          {coverUrl && <button type="button" className={styles.coverRemove} onClick={() => void removeCover()}>Remove cover</button>}
        </div>
      </div>
      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); e.target.value = ''; }} />

      <div className={styles.publish}>
        <div className={styles.pubRow}>
          <div className={styles.seg}>
            <button className={!isPublic ? styles.segOn : ''} onClick={() => void togglePublic(false)}>Draft</button>
            <button className={isPublic ? styles.segOn : ''} onClick={() => void togglePublic(true)}>Public</button>
          </div>
          <span className={styles.pubHint}>
            {isPublic
              ? 'Anyone with the link can listen. Songs play through the playlist.'
              : 'Only your workspace can see this. Publish to get a share link.'}
          </span>
        </div>
        {isPublic && (
          <div className={styles.shareBox}>
            <code className={styles.shareUrl}>{shareUrl}</code>
            <button className={styles.copy} onClick={() => void copyLink()}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          </div>
        )}
      </div>

      <div className={styles.cols}>
        <div className={styles.col}>
          <h3 className={styles.colHead}>In this playlist
            <span className={styles.n}>{detail.songs.length} {detail.songs.length === 1 ? 'song' : 'songs'}</span>
          </h3>
          <div className={styles.list}>
            {detail.songs.length === 0 ? (
              <div className={styles.rowEmpty}>No songs yet — add some from the right.</div>
            ) : detail.songs.map((s, i) => (
              <div key={s.id} className={styles.row}>
                <span className={styles.pos}>{i + 1}</span>
                <span className={styles.rt}>{s.title}</span>
                <button className={styles.mini} disabled={i === 0 || busy} onClick={() => void move(i, -1)} title="Move up">↑</button>
                <button className={styles.mini} disabled={i === detail.songs.length - 1 || busy} onClick={() => void move(i, 1)} title="Move down">↓</button>
                <button className={styles.mini} disabled={busy} onClick={() => void removeSong(s.id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.col}>
          <h3 className={styles.colHead}>Add from your songs
            <span className={styles.n}>{detail.available.length} available</span>
          </h3>
          <div className={styles.list}>
            {detail.available.length === 0 ? (
              <div className={styles.rowEmpty}>All your songs are in this playlist.</div>
            ) : detail.available.map((s) => (
              <div key={s.id} className={styles.row}>
                <span className={styles.rt}>{s.title}</span>
                <button className={styles.addBtn} disabled={busy} onClick={() => void addSong(s.id)}>+ Add</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

