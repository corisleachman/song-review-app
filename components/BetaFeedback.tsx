'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '@/lib/useDialogFocus';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeFeedback = useCallback(() => setOpen(false), []);

  useDialogFocus(open, closeFeedback, panelRef);

  // Let the beta banner (or anything) open the panel.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

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
        <div
          id="beta-feedback-panel"
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-feedback-title"
          aria-describedby="beta-feedback-description"
          tabIndex={-1}
        >
          <div className={styles.head}>
            <button type="button" className={styles.close} onClick={closeFeedback} aria-label="Close feedback">
              &#10005;
            </button>
            <h4 id="beta-feedback-title" className={styles.title}>Help us build Song Room</h4>
            <p id="beta-feedback-description" className={styles.sub}>Found a bug or got an idea? Tell us — we read every one.</p>
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

      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((value) => !value)}
        aria-label="Report a bug or send feedback"
        aria-expanded={open}
        aria-controls="beta-feedback-panel"
        title="Report a bug or send feedback"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M8.3 8.2A4.9 4.9 0 0 1 12 6.5a4.9 4.9 0 0 1 3.7 1.7M8 10.5h8v4.25a4 4 0 0 1-8 0V10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 3.5v3M8.4 5.2l1.7 2.2M15.6 5.2l-1.7 2.2M8 12H4.5M19.5 12H16M8.2 16.2l-3 1.6M15.8 16.2l3 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
