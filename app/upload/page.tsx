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
};

function cleanTitle(name: string) {
  let t = name.replace(/\.[^.]+$/, '');
  t = t.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  return t || 'Untitled';
}
let counter = 0;
const uid = () => `u${++counter}`;

export default function UploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const uploadOne = useCallback(async (item: Item) => {
    try {
      const s = await fetch('/api/songs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title }),
      });
      if (!s.ok) { const e = await s.json().catch(() => ({})); throw new Error(e.error || 'Could not create song'); }
      const { songId } = await s.json();
      update(item.id, { songId });

      const v = await fetch('/api/versions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, fileName: item.file.name, fileSize: item.file.size }),
      });
      if (!v.ok) { const e = await v.json().catch(() => ({})); throw new Error(e.error || 'Could not start upload'); }
      const { versionId, uploadUrl } = await v.json();
      update(item.id, { versionId });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) update(item.id, { progress: e.loaded / e.total });
        });
        xhr.addEventListener('load', () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))));
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', item.file.type || 'audio/mpeg');
        xhr.send(item.file);
      });
      update(item.id, { progress: 1, status: 'done' });
    } catch (err) {
      update(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const audio = Array.from(files).filter((f) => f.type.startsWith('audio/'));
    if (!audio.length) return;
    const newItems: Item[] = audio.map((f) => {
      const title = cleanTitle(f.name);
      return { id: uid(), file: f, title, savedTitle: title, songId: null, versionId: null, progress: 0, status: 'uploading' as Status };
    });
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((it) => void uploadOne(it));
  }, [uploadOne]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); };

  const saveTitle = (item: Item) => {
    const t = item.title.trim();
    if (!item.songId || !t || t === item.savedTitle) return;
    void fetch(`/api/songs/${item.songId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t }),
    }).then(() => update(item.id, { savedTitle: t })).catch(() => {});
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

  const finish = async () => {
    setFinishing(true);
    await Promise.all(
      items.filter((i) => i.songId && i.title.trim() && i.title.trim() !== i.savedTitle).map((i) =>
        fetch(`/api/songs/${i.songId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: i.title.trim() }) }).catch(() => {}),
      ),
    );
    router.push('/dashboard');
  };

  const uploaded = items.filter((i) => i.status === 'done').length;
  const anyItems = items.length > 0;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Add songs</h1>
      <p className={styles.sub}>Drop your tracks in — they start uploading straight away while you tidy the names.</p>

      {!anyItems && (
        <div
          className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className={styles.dropBig}>Drop your tracks here</div>
          <div className={styles.dropSmall}>WAV, MP3, AIFF, M4A · or click to browse</div>
        </div>
      )}

      {anyItems && (
        <>
          <div className={styles.listHead}>Uploading {items.length} {items.length === 1 ? 'track' : 'tracks'}</div>
          <div className={styles.list}>
            {items.map((it) => (
              <div key={it.id} className={`${styles.row} ${it.status === 'done' ? styles.rowDone : ''} ${it.status === 'error' ? styles.rowError : ''}`}>
                <span className={styles.thumb}>♪</span>
                <div className={styles.rowMain}>
                  <input
                    className={styles.tin}
                    value={it.title}
                    onChange={(e) => update(it.id, { title: e.target.value })}
                    onBlur={() => saveTitle(it)}
                    aria-label="Track title"
                  />
                  <div className={styles.meta}>
                    <span className={styles.fname}>{it.file.name}</span>
                    <span className={`${styles.pct} ${it.status === 'done' ? styles.pctDone : ''} ${it.status === 'error' ? styles.pctErr : ''}`}>
                      {it.status === 'error' ? (it.error || 'Failed') : it.status === 'done' ? 'Uploaded ✓' : `${Math.round(it.progress * 100)}%`}
                    </span>
                  </div>
                </div>
                <button className={styles.remove} onClick={() => void removeItem(it)} title="Remove" aria-label="Remove">✕</button>
                <span className={styles.prog} style={{ width: `${it.progress * 100}%` }} />
              </div>
            ))}
          </div>
          <div className={styles.dropMini} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>＋ Add more tracks</div>
        </>
      )}

      <input ref={inputRef} type="file" accept="audio/*" multiple className={styles.hiddenInput} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />

      {anyItems && (
        <div className={styles.foot}>
          <div className={styles.footInner}>
            <span className={styles.status}>{uploaded < items.length ? `Uploading… ${uploaded} of ${items.length} done` : `All ${items.length} uploads complete`}</span>
            <span className={styles.spacer} />
            <button className={styles.ghostBtn} onClick={() => void discardAll()} disabled={finishing}>Discard</button>
            <button className={styles.primaryBtn} onClick={() => void finish()} disabled={finishing}>{finishing ? 'Finishing…' : 'Done'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
