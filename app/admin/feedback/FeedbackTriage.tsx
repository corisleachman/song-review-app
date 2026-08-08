'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './feedback.module.css';

type FeedbackRow = {
  id: string;
  created_at: string;
  type: 'bug' | 'idea' | 'other';
  message: string;
  user_id: string | null;
  email: string | null;
  page_url: string | null;
  user_agent: string | null;
  viewport: string | null;
  app_version: string | null;
  status: 'new' | 'approved' | 'rejected' | 'spam';
  reward_eligible: boolean;
  reward_issued: boolean;
};

type Filter = 'new' | 'approved' | 'rejected' | 'spam' | 'all';
const FILTERS: Filter[] = ['new', 'approved', 'rejected', 'spam', 'all'];

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.pathname + url.search;
  } catch {
    return u;
  }
}

export default function FeedbackTriage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [cap, setCap] = useState(100);
  const [filter, setFilter] = useState<Filter>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const qs = f === 'all' ? '' : `?status=${f}`;
      const res = await fetch(`/api/admin/feedback${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not load feedback.');
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
      setEligibleCount(data.eligibleCount ?? 0);
      setCap(data.cap ?? 100);
    } catch {
      setError('Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const act = useCallback(
    async (id: string, action: 'approve' | 'reject' | 'spam') => {
      setBusyId(id);
      setError(null);
      try {
        const res = await fetch(`/api/admin/feedback/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Action failed.');
          return;
        }
        await load(filter);
        if (action === 'approve' && data.capReached) {
          setError('Approved, but the 100-tester cap is reached — no reward slot granted.');
        }
      } catch {
        setError('Action failed.');
      } finally {
        setBusyId(null);
      }
    },
    [filter, load],
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Beta Feedback</h1>
        <div className={styles.cap}>
          Founding Testers: <strong>{eligibleCount}</strong> / {cap} eligible
        </div>
      </header>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No feedback in this view.</div>
      ) : (
        <ul className={styles.list}>
          {items.map((it) => (
            <li key={it.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={`${styles.typeChip} ${styles['type_' + it.type] ?? ''}`}>{it.type}</span>
                <span className={styles.status}>{it.status}</span>
                {it.reward_eligible && <span className={styles.rewardBadge}>reward-eligible</span>}
                {it.reward_issued && <span className={styles.rewardBadge}>code issued</span>}
                <span className={styles.date}>{new Date(it.created_at).toLocaleString()}</span>
              </div>

              <p className={styles.message}>{it.message}</p>

              <div className={styles.meta}>
                <span>{it.email ?? (it.user_id ? `user ${it.user_id.slice(0, 8)}` : 'anonymous')}</span>
                {it.page_url && <span title={it.page_url}>{shortUrl(it.page_url)}</span>}
                {it.viewport && <span>{it.viewport}</span>}
                {it.app_version && <span>build {it.app_version}</span>}
              </div>
              {it.user_agent && <div className={styles.ua}>{it.user_agent}</div>}

              <div className={styles.actions}>
                <button
                  className={`${styles.btn} ${styles.approve}`}
                  disabled={busyId === it.id}
                  onClick={() => act(it.id, 'approve')}
                >
                  Approve
                </button>
                <button className={styles.btn} disabled={busyId === it.id} onClick={() => act(it.id, 'reject')}>
                  Reject
                </button>
                <button className={styles.btn} disabled={busyId === it.id} onClick={() => act(it.id, 'spam')}>
                  Spam
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
