'use client';

import { useEffect, useState } from 'react';
import styles from '../settings.module.css';

type ReferralStatus = 'pending' | 'converted' | 'rewarded' | 'ineligible';

interface ReferralRow {
  id: string;
  maskedEmail: string;
  status: ReferralStatus;
  convertedAt: string | null;
  rewardedAt: string | null;
  creditPence: number | null;
  createdAt: string;
}

interface ReferralSummary {
  code: string;
  url: string;
  rewardCap: number;
  rewardsEarned: number;
  rewardsRemaining: number;
  totalCreditPence: number;
  counts: Record<ReferralStatus, number>;
  referrals: ReferralRow[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

function formatPence(pence: number | null) {
  if (!pence) return '—';
  return `£${(pence / 100).toFixed(2)}`;
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending:    'Signed up',
  converted:  'Upgraded',
  rewarded:   'Rewarded',
  ineligible: 'Ineligible',
};

const STATUS_CLASS: Record<ReferralStatus, string> = {
  pending:    '',
  converted:  '',
  rewarded:   'roleBadgeAccepted',
  ineligible: 'roleBadgeMuted',
};

export default function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch('/api/referrals/summary')
      .then(r => r.json())
      .then((data: ReferralSummary & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setSummary(data);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load referrals.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!summary?.url) return;
    try {
      await navigator.clipboard.writeText(summary.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link.');
    }
  };

  if (loading) return <div className={styles.sectionLoading}>Loading…</div>;

  const rewardCap = summary?.rewardCap ?? 5;

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Referrals</h2>
        <p>
          Invite a collaborator. If they upgrade to a monthly plan, you get 50% off one month.
          They get 50% off their first three months.
        </p>
      </div>

      {error && <div className={styles.blockError}>{error}</div>}

      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Your referral link</h3>
          <p>Share this with anyone you think would get value from The Song Room.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.inlineForm}>
            <input
              type="text"
              readOnly
              value={summary?.url ?? ''}
              className={styles.textInput}
              onFocus={e => e.target.select()}
            />
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => void handleCopy()}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Rewards earned</h3>
          <p>
            You can earn up to {rewardCap} rewards.
            Each successful referral gives you 50% off one month.
          </p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.planSummaryGrid}>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Rewards earned</span>
              <strong className={styles.planSummaryValue}>
                {summary?.rewardsEarned ?? 0} / {rewardCap}
              </strong>
            </div>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Credits applied</span>
              <strong className={styles.planSummaryValue}>
                {formatPence(summary?.totalCreditPence ?? 0)}
              </strong>
            </div>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Rewards remaining</span>
              <strong className={styles.planSummaryValue}>
                {summary?.rewardsRemaining ?? rewardCap}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>How it works</h3>
        </div>
        <div className={styles.blockControl}>
          <ol className={styles.howItWorksList}>
            <li>Share your referral link with a collaborator, bandmate, or producer.</li>
            <li>They sign up and upgrade to a Pro or Studio monthly plan.</li>
            <li>They get 50% off their first three months automatically.</li>
            <li>You get 50% off your next month, applied as a credit to your bill.</li>
            <li>You can earn up to {rewardCap} rewards in total.</li>
          </ol>
        </div>
      </div>

      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Referral history</h3>
          <p>
            {(summary?.referrals.length ?? 0) === 0
              ? 'No referrals yet.'
              : `${summary?.referrals.length} referral${(summary?.referrals.length ?? 0) === 1 ? '' : 's'} tracked.`}
          </p>
        </div>
        <div className={styles.blockControl}>
          {(summary?.referrals.length ?? 0) === 0 ? (
            <p className={styles.emptyState}>
              Share your link to get started. Referrals appear here once someone signs up.
            </p>
          ) : (
            <div className={styles.memberList}>
              {summary?.referrals.map(r => (
                <div key={r.id} className={styles.memberRow}>
                  <div className={styles.memberMeta}>
                    <strong>{r.maskedEmail}</strong>
                    <span>Referred {formatDate(r.createdAt)}</span>
                  </div>
                  <div className={styles.memberActions}>
                    {r.status === 'rewarded' && r.creditPence && (
                      <span className={styles.roleBadge} style={{ color: '#6ee7b7' }}>
                        {formatPence(r.creditPence)} credited
                      </span>
                    )}
                    <span className={`${styles.roleBadge} ${styles[STATUS_CLASS[r.status]] ?? ''}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
