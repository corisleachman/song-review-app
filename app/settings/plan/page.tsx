'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsData, useSettingsActions } from '@/lib/settingsContext';
import {
  getPlanDisplayName,
  getStorageLimitLabel,
  getStorageLimit,
  formatStorageBytes,
  getCollaboratorLimitLabel,
  FREE_COLLABORATOR_LIMIT,
  isPlanAtLeast,
  type AccountPlan,
} from '@/lib/plans';
import styles from '../settings.module.css';

const canToggleForTesting = process.env.NODE_ENV !== 'production';

export default function PlanPage() {
  const router = useRouter();
  const {
    isOwner, workspacePlan, storageBytesUsed, members, invites, loading,
  } = useSettingsData();
  const { setWorkspacePlan } = useSettingsActions();

  const [openingPortal, setOpeningPortal] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<AccountPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'cancelled') {
      setNotice('Checkout was cancelled. Your plan has not changed.');
      params.delete('billing');
      const next = params.toString();
      window.history.replaceState({}, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
    }
  }, []);

  const handleManageBilling = async () => {
    setBillingError(null);
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not open billing portal.');
      if (!payload?.url) throw new Error('Billing portal URL was missing.');
      window.location.assign(payload.url as string);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Could not open billing portal.');
      setOpeningPortal(false);
    }
  };

  const handlePlanToggle = async (nextPlan: AccountPlan) => {
    if (workspacePlan === nextPlan) return;
    setBillingError(null);
    setNotice(null);
    setSwitchingPlan(nextPlan);
    try {
      const res = await fetch('/api/workspace/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Could not switch plan.');
      setWorkspacePlan(nextPlan);
      setNotice(payload?.message || `Switched to ${nextPlan} for local testing.`);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Could not switch plan.');
    } finally {
      setSwitchingPlan(null);
    }
  };

  if (loading) return <div className={styles.sectionLoading}>Loading…</div>;

  if (!isOwner) {
    return (
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeading}>
          <h2>Plan & Billing</h2>
          <p>Billing is managed by the workspace owner.</p>
        </div>
        <div className={styles.settingsBlock}>
          <div className={styles.blockLabel}>
            <h3>Current plan</h3>
          </div>
          <div className={styles.blockReadOnly}>
            {workspacePlan ? getPlanDisplayName(workspacePlan) : 'Free'}
          </div>
        </div>
      </div>
    );
  }

  const plan = workspacePlan ?? 'free';
  const storageLimit = getStorageLimit(plan);
  const storagePct = Math.min(100, Math.round((storageBytesUsed / storageLimit) * 100));
  const collaboratorsUsed = members.filter(m => m.role !== 'owner').length
    + invites.filter(i => i.status === 'pending').length;

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeading}>
        <h2>Plan & Billing</h2>
        <p>Your workspace is on the <strong>{getPlanDisplayName(plan)}</strong> plan.</p>
      </div>

      {notice && <div className={styles.blockNotice}>{notice}</div>}
      {billingError && <div className={styles.blockError}>{billingError}</div>}

      {/* ── Plan summary ── */}
      <div className={styles.planSummaryGrid}>
        <div className={styles.planSummaryCard}>
          <span className={styles.planSummaryLabel}>Current plan</span>
          <strong className={styles.planSummaryValue}>{getPlanDisplayName(plan)}</strong>
        </div>
        <div className={styles.planSummaryCard}>
          <span className={styles.planSummaryLabel}>Storage limit</span>
          <strong className={styles.planSummaryValue}>{getStorageLimitLabel(plan)}</strong>
        </div>
        <div className={styles.planSummaryCard}>
          <span className={styles.planSummaryLabel}>Collaborators</span>
          <strong className={styles.planSummaryValue}>{getCollaboratorLimitLabel(plan)}</strong>
        </div>
      </div>

      {/* ── Storage bar ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>Storage used</h3>
          <p>{formatStorageBytes(storageBytesUsed)} of {getStorageLimitLabel(plan)} used</p>
        </div>
        <div className={styles.blockControl}>
          <div className={styles.storageBarWrap}>
            <div
              className={styles.storageBarFill}
              style={{
                width: `${storagePct}%`,
                background: storagePct >= 90 ? 'var(--color-primary)' : 'var(--color-accent)',
              }}
            />
          </div>
          <p className={styles.storageBarMeta}>{storagePct}% used</p>
        </div>
      </div>

      {/* ── Collaborators used (free only) ── */}
      {!isPlanAtLeast(plan, 'pro') && (
        <div className={styles.settingsBlock}>
          <div className={styles.blockLabel}>
            <h3>Collaborators used</h3>
            <p>Members and pending invites count toward your limit.</p>
          </div>
          <div className={styles.blockReadOnly}>
            {collaboratorsUsed} of {FREE_COLLABORATOR_LIMIT} collaborators
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div className={styles.settingsBlock}>
        <div className={styles.blockLabel}>
          <h3>{isPlanAtLeast(plan, 'pro') ? 'Manage your subscription' : 'Upgrade your plan'}</h3>
          <p>
            {isPlanAtLeast(plan, 'pro')
              ? 'Update your payment method, view invoices, or change your plan.'
              : 'Get more storage and collaborators with Pro or Studio.'}
          </p>
        </div>
        <div className={styles.blockControl}>
          {isPlanAtLeast(plan, 'pro') ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleManageBilling()}
              disabled={openingPortal}
            >
              {openingPortal ? 'Opening…' : 'Manage billing'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => router.push('/upgrade?returnTo=settings')}
            >
              See plans
            </button>
          )}
        </div>
      </div>

      {/* ── Dev testing toggle ── */}
      {canToggleForTesting && (
        <div className={styles.devToggle}>
          <p className={styles.devToggleLabel}>Local testing — switch plan without touching Stripe</p>
          <div className={styles.devToggleButtons}>
            {(['free', 'pro', 'studio'] as AccountPlan[]).map(p => (
              <button
                key={p}
                type="button"
                className={`${styles.devToggleBtn} ${workspacePlan === p ? styles.devToggleBtnActive : ''}`}
                onClick={() => void handlePlanToggle(p)}
                disabled={switchingPlan !== null || workspacePlan === p}
              >
                {switchingPlan === p ? '…' : getPlanDisplayName(p)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
