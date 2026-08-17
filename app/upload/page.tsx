'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './upload.module.css';

type Status = 'uploading' | 'done' | 'error';
type Item = {
  id: string;
  file: File;
  title: string;
  savedTitle: string;
  songId: string | null;
  versionId: string | null;
  progress: number;
  status: Status;
  error?: string;
  artPreview?: string;
  artUploading?: boolean;
  artError?: string;
};

function cleanTitle(name: string) {
  let t = name.replace(/\.[^.]+$/, '');
  t = t.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  return t || 'Untitled';
}
let counter = 0;
const uid = () => `u${++counter}`;

function contentTypeFor(file: File): string {
  if (file.type && file.type.startsWith('audio/')) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', wave: 'audio/wav',
    aiff: 'audio/aiff', aif: 'audio/aiff', aifc: 'audio/aiff',
    m4a: 'audio/mp4', mp4: 'audio/mp4', flac: 'audio/flac',
    ogg: 'audio/ogg', oga: 'audio/ogg', aac: 'audio/aac',
  };
  return map[ext] || file.type || 'application/octet-stream';
}

// Confirm the uploaded audio actually landed in storage (mirrors the single-song
// uploader). Prevents a broken/partial upload being silently accepted.
async function verifyVersion(versionId: string) {
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) await new Promise((r) => setTimeout(r, 450));
    try {
      const res = await fetch(`/api/versions/${versionId}`, { cache: 'no-store' });
      const p = await res.json().catch(() => null);
      if (res.ok && p?.version?.audioUrl && !p?.version?.audioMissing) return;
    } catch { /* retry */ }
  }
  throw new Error('Uploaded file could not be verified — please retry this track.');
}

async function finalizeVersion(versionId: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 450));

    let res: Response;
    try {
      res = await fetch(`/api/versions/${versionId}/finalize`, { method: 'POST' });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Could not finish the upload.');
      continue;
    }

    const payload = await res.json().catch(() => null);
    if (res.ok) return;

    const responseError = new Error(payload?.error || 'Could not finish the upload.');
    if (res.status < 500 && res.status !== 409) throw responseError;
    lastError = responseError;
  }

  throw lastError ?? new Error('Could not finish the upload.');
}

export default function UploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [step, setStep] = useState<'upload' | 'artwork'>('upload');
  const [dragging, setDragging] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  const artForId = useRef<string | null>(null);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const uploadOne = useCallback(async (item: Item) => {
    let createdVersionId: string | null = null;

    try {
      const s = await fetch('/api/songs/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title }),
      });
      if (!s.ok) { const e = await s.json().catch(() => ({})); throw new Error(e.error || 'Could not create song'); }
      const { songId } = await s.json();
      update(item.id, { songId });

      const v = await fetch('/api/versions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, fileName: item.file.name, fileSize: item.file.size }),
      });
      if (!v.ok) { const e = await v.json().catch(() => ({})); throw new Error(e.error || 'Could not start upload'); }
      const { versionId, uploadUrl } = await v.json();
      createdVersionId = versionId;
      update(item.id, { versionId });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) update(item.id, { progress: e.loaded / e.total }); });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', contentTypeFor(item.file));
        xhr.send(item.file);
      });
      await finalizeVersion(versionId);
      await verifyVersion(versionId);
      update(item.id, { progress: 1, status: 'done' });
    } catch (err) {
      if (createdVersionId) {
        await fetch(`/api/versions/${createdVersionId}/finalize`, { method: 'DELETE' }).catch(() => null);
      }
      update(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const all = Array.from(files);
    const audio = all.filter((f) => f.type.startsWith('audio/'));
    const skipped = all.length - audio.length;
    setNotice(skipped > 0 ? `Skipped ${skipped} non-audio file${skipped === 1 ? '' : 's'}.` : null);
    if (!audio.length) return;
    const newItems: Item[] = audio.map((f) => {
      const title = cleanTitle(f.name);
      return { id: uid(), file: f, title, savedTitle: title, songId: null, versionId: null, progress: 0, status: 'uploading' as Status };
    });
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((it) => void uploadOne(it));
  }, [uploadOne]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); };

  const retryItem = async (item: Item) => {
    if (item.songId) { try { await fetch(`/api/songs/${item.songId}`, { method: 'DELETE' }); } catch { /* ignore */ } }
    update(item.id, { songId: null, versionId: null, progress: 0, status: 'uploading', error: undefined });
    void uploadOne({ ...item, songId: null, versionId: null, progress: 0, status: 'uploading' });
  };

  const saveTitle = (item: Item) => {
    const t = item.title.trim();
    if (!item.songId || !t || t === item.savedTitle) return;
    void fetch(`/api/songs/${item.songId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t }) })
      .then(() => update(item.id, { savedTitle: t })).catch(() => {});
  };

  const removeItem = async (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.songId) { try { await fetch(`/api/songs/${item.songId}`, { method: 'DELETE' }); } catch { /* ignore */ } }
  };

  const discardAll = async () => {
    if (!window.confirm('Discard these uploads? The songs will be deleted.')) return;
    const toDelete = items.filter((i) => i.songId);
    setItems([]);
    await Promise.all(toDelete.map((i) => fetch(`/api/songs/${i.songId}`, { method: 'DELETE' }).catch(() => {})));
    router.push('/dashboard');
  };

  const saveAllTitles = () => Promise.all(
    items.filter((i) => i.songId && i.title.trim() && i.title.trim() !== i.savedTitle).map((i) =>
      fetch(`/api/songs/${i.songId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: i.title.trim() }) }).catch(() => {})),
  );

  const goArtwork = async () => { await saveAllTitles(); setNotice(null); setStep('artwork'); window.scrollTo(0, 0); };

  const finish = async () => { setFinishing(true); await saveAllTitles(); router.push('/dashboard'); };

  const pickArt = (item: Item) => { if (!item.songId) return; artForId.current = item.id; artInputRef.current?.click(); };

  const onArtChosen = async (file: File) => {
    const id = artForId.current; if (!id) return;
    const item = items.find((i) => i.id === id); if (!item?.songId) return;
    const preview = URL.createObjectURL(file);
    update(id, { artPreview: preview, artUploading: true, artError: undefined });
    try {
      const fd = new FormData(); fd.append('songId', item.songId); fd.append('file', file);
      const res = await fetch('/api/songs/upload-image', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Could not upload cover'); }
      update(id, { artUploading: false });
    } catch (err) {
      update(id, { artUploading: false, artError: err instanceof Error ? err.message : 'Cover upload failed' });
    }
  };

  const uploaded = items.filter((i) => i.status === 'done').length;
  const anyItems = items.length > 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.steps}>
        <span className={step === 'upload' ? styles.stepOn : styles.stepDone}>1 · Upload &amp; name</span>
        <span className={styles.stepBar} />
        <span className={step === 'artwork' ? styles.stepOn : styles.stepIdle}>2 · Artwork (optional)</span>
      </div>

      {step === 'upload' && (
        <>
          <h1 className={styles.title}>Add songs</h1>
          <p className={styles.sub}>Drop your tracks in — they start uploading straight away while you tidy the names.</p>
          {notice && <div className={styles.notice}>{notice}</div>}

          {!anyItems && (
            <button
              type="button"
              className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              aria-label="Choose audio tracks to upload"
            >
              <span className={styles.dropBig}>Drop your tracks here</span>
              <span className={styles.dropSmall}>WAV, MP3, AIFF, M4A · or click to browse</span>
            </button>
          )}

          {anyItems && (
            <>
              <div className={styles.listHead}>Uploading {items.length} {items.length === 1 ? 'track' : 'tracks'}</div>
              <div className={styles.list}>
                {items.map((it) => (
                  <div key={it.id} className={`${styles.row} ${it.status === 'done' ? styles.rowDone : ''} ${it.status === 'error' ? styles.rowError : ''}`}>
                    <span className={styles.thumb}>♪</span>
                    <div className={styles.rowMain}>
                      <input className={styles.tin} value={it.title} onChange={(e) => update(it.id, { title: e.target.value })} onBlur={() => saveTitle(it)} aria-label="Track title" />
                      <div className={styles.meta}>
                        <span className={styles.fname}>{it.file.name}</span>
                        <span className={`${styles.pct} ${it.status === 'done' ? styles.pctDone : ''} ${it.status === 'error' ? styles.pctErr : ''}`}>
                          {it.status === 'error' ? (it.error || 'Failed') : it.status === 'done' ? 'Uploaded ✓' : `${Math.round(it.progress * 100)}%`}
                        </span>
                      </div>
                    </div>
                    {it.status === 'error' && <button className={styles.retryBtn} onClick={() => void retryItem(it)}>Retry</button>}
                    <button className={styles.remove} onClick={() => void removeItem(it)} title="Remove" aria-label="Remove">✕</button>
                    <span className={styles.prog} style={{ width: `${it.progress * 100}%` }} />
                  </div>
                ))}
              </div>
              <button type="button" className={styles.dropMini} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>＋ Add more tracks</button>
            </>
          )}
        </>
      )}

      {step === 'artwork' && (
        <>
          <h1 className={styles.title}>Add artwork</h1>
          <p className={styles.sub}>Optional — give each track a cover, or skip and add it later.</p>
          <div className={styles.list}>
            {items.map((it) => (
              <div key={it.id} className={styles.row}>
                <button
                  type="button"
                  className={`${styles.thumb} ${styles.artSlot}`}
                  onClick={() => pickArt(it)}
                  title={it.artPreview ? 'Replace cover' : 'Add cover'}
                  aria-label={`${it.artPreview ? 'Replace' : 'Add'} cover for ${it.title || 'Untitled'}`}
                  disabled={it.artUploading}
                  style={it.artPreview ? { backgroundImage: `url(${it.artPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  {!it.artPreview && '＋'}
                </button>
                <div className={styles.rowMain}>
                  <div className={styles.artTitle}>{it.title || 'Untitled'}</div>
                  <div className={styles.meta}>
                    <span className={styles.fname}>
                      {it.artError ? it.artError : it.artUploading ? 'Uploading cover…' : it.artPreview ? 'Cover added' : 'Click the square to add a cover'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <input ref={inputRef} type="file" accept="audio/*" multiple className={styles.hiddenInput} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={artInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onArtChosen(f); e.target.value = ''; }} />

      {anyItems && (
        <div className={styles.foot}>
          <div className={styles.footInner}>
            {step === 'upload' ? (
              <>
                <span className={styles.status}>{uploaded < items.length ? `Uploading… ${uploaded} of ${items.length} done` : `All ${items.length} uploads complete`}</span>
                <span className={styles.spacer} />
                <button className={styles.ghostBtn} onClick={() => void discardAll()} disabled={finishing}>Discard</button>
                <button className={styles.primaryBtn} onClick={() => void goArtwork()} disabled={finishing}>Continue to artwork →</button>
              </>
            ) : (
              <>
                <span className={styles.status}>{items.length} song{items.length === 1 ? '' : 's'} ready</span>
                <span className={styles.spacer} />
                <button className={styles.ghostBtn} onClick={() => setStep('upload')} disabled={finishing}>← Back</button>
                <button className={styles.primaryBtn} onClick={() => void finish()} disabled={finishing}>{finishing ? 'Finishing…' : 'Finish'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
