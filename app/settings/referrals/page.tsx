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

const STATUS_LABELS: Record<ReferralStatus, string> = {
  pending:    'Signed up',
  converted:  'Upgraded',
  rewarded:   'Rewarded',
  ineligible: 'Ineligible',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

function formatCredit(pence: number | null) {
  if (!pence) return '—';
  return `£${(pence / 100).toFixed(2)}`;
}

export default function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals/summary')
      .then(r => r.json())
      .then((data: ReferralSummary) => setSummary(data))
      .catch(() => setError('Could not load referral data.'))
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

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Referrals</h2>
        <p>
          Invite a collaborator. If they upgrade to a paid plan, you get 50% off
          one month — up to {summary?.rewardCap ?? 5} times.
        </p>
      </div>

      {error && <div className={styles.blockError}>{error}</div>}

      {/* ── Referral link ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Your referral link</h3>
          <p>
            Anyone who signs up via this link and upgrades to Pro or Studio gets
            50% off their first 3 months. You earn 50% off one month when they
            upgrade.
          </p>
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
              disabled={!summary?.url}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Rewards summary ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Your rewards</h3>
          <p>Credits are applied automatically to your next invoice.</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.planSummaryGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Rewards earned</span>
              <strong className={styles.planSummaryValue}>
                {summary?.rewardsEarned ?? 0} / {summary?.rewardCap ?? 5}
              </strong>
            </div>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Remaining</span>
              <strong className={styles.planSummaryValue}>
                {summary?.rewardsRemaining ?? 5}
              </strong>
            </div>
            <div className={styles.planSummaryCard}>
              <span className={styles.planSummaryLabel}>Total credited</span>
              <strong className={styles.planSummaryValue}>
                {summary ? formatCredit(summary.totalCreditPence) : '—'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Referral history ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Referral history</h3>
          <p>People who signed up using your link.</p>
        </div>
        <div className={styles.blockControl}>
          {!summary || summary.referrals.length === 0 ? (
            <p className={styles.emptyState}>
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <div className={styles.memberList}>
              {summary.referrals.map(r => (
                <div key={r.id} className={styles.memberRow}>
                  <div className={styles.memberMeta}>
                    <strong>{r.maskedEmail}</strong>
                    <span>Joined {formatDate(r.createdAt)}</span>
                  </div>
                  <div className={styles.memberActions}>
                    {r.status === 'rewarded' && r.creditPence && (
                      <span className={styles.referralCredit}>
                        {formatCredit(r.creditPence)} credited
                      </span>
                    )}
                    <span className={`${styles.roleBadge} ${
                      r.status === 'rewarded'   ? styles.roleBadgeAccepted :
                      r.status === 'ineligible' ? styles.roleBadgeMuted    : ''
                    }`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>How it works</h3>
        </div>
        <div className={styles.blockControl}>
          <ol className={styles.howItWorksList}>
            <li>Share your unique referral link with a collaborator.</li>
            <li>They sign up and get <strong>50% off their first 3 months</strong> when they upgrade to a monthly plan.</li>
            <li>Once they upgrade, you earn <strong>50% off one month</strong> — applied automatically to your next invoice.</li>
            <li>You can earn up to {summary?.rewardCap ?? 5} rewards in total.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
