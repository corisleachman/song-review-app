'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './BetaFeedback.module.css';

type FeedbackType = 'bug' | 'idea' | 'other';

const OPEN_EVENT = 'song-room:open-feedback';

export default function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const website = useRef(''); // honeypot — must stay empty

  // Let the beta banner (or anything) open the panel.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const reset = useCallback(() => {
    setType('bug');
    setMessage('');
    setEmail('');
    setShowEmail(false);
    setStatus('idle');
    setError(null);
    website.current = '';
  }, []);

  const submit = useCallback(async () => {
    if (status === 'sending') return;
    setError(null);

    if (message.trim().length < 10) {
      setError('Please add a little more detail (at least 10 characters).');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || undefined,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          website: website.current,
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));

      if (!res.ok) {
        // Logged-out users must supply an email — reveal the field and let them retry.
        if (res.status === 400 && typeof data.error === 'string' && /email/i.test(data.error)) {
          setShowEmail(true);
        }
        setError(typeof data.error === 'string' ? data.error : 'Could not send — please try again.');
        setStatus('idle');
        return;
      }

      setStatus('sent');
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1600);
    } catch {
      setError('Could not send — please check your connection and try again.');
      setStatus('idle');
    }
  }, [type, message, email, status, reset]);

  return (
    <div className={styles.wrap}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Send feedback">
          <div className={styles.head}>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              &#10005;
            </button>
            <h4 className={styles.title}>Help us build Song Room</h4>
            <p className={styles.sub}>Found a bug or got an idea? Tell us — we read every one.</p>
          </div>

          {status === 'sent' ? (
            <div className={styles.done}>Thanks — got it. ✓</div>
          ) : (
            <div className={styles.body}>
              <div className={styles.chips} role="group" aria-label="Feedback type">
                {(['bug', 'idea', 'other'] as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.chip} ${type === t ? styles.chipActive : ''}`}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <textarea
                className={styles.textarea}
                placeholder="What happened? Describe it in a sentence or two…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
              />

              {showEmail && (
                <input
                  className={styles.email}
                  type="email"
                  placeholder="you@email.com — so we can follow up"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              {/* Honeypot: off-screen, catches bots. Humans never see or fill it. */}
              <input
                className={styles.hp}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                onChange={(e) => {
                  website.current = e.target.value;
                }}
              />

              {error && <div className={styles.error}>{error}</div>}

              <button
                type="button"
                className={styles.submit}
                onClick={submit}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          )}
        </div>
      )}

      <button type="button" className={styles.fab} onClick={() => setOpen((v) => !v)} aria-label="Send feedback">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        <span>Feedback</span>
      </button>
    </div>
  );
}
