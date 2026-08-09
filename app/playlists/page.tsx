'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './playlists.module.css';

type PlaylistItem = { id: string; title: string; is_public: boolean; song_count: number; updated_at: string };

export default function PlaylistsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/playlists', { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled playlist' }),
      });
      const data = await res.json();
      if (data.id) { router.push(`/playlists/${data.id}`); return; }
    } catch { /* ignore */ }
    setCreating(false);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Playlists</h1>
        <button className={styles.primary} onClick={() => void create()} disabled={creating}>
          {creating ? 'Creating…' : '+ New playlist'}
        </button>
      </header>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No playlists yet. Create one to share a set of songs that plays in sequence.</div>
      ) : (
        <ul className={styles.grid}>
          {items.map((p) => (
            <li key={p.id} className={styles.card}>
              <Link href={`/playlists/${p.id}`} className={styles.cardLink}>
                <span className={styles.cardTitle}>{p.title}</span>
                <span className={styles.cardMeta}>
                  {p.song_count} {p.song_count === 1 ? 'song' : 'songs'} · {p.is_public ? 'Public' : 'Draft'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
