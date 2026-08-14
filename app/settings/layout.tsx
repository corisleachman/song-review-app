'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import UpgradeModal from '@/components/UpgradeModal';
import { SettingsProvider, useSettingsData, useSettingsActions } from '@/lib/settingsContext';
import styles from './settings.module.css';

// ── Nav items ────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  ownerOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Workspace',     href: '/settings/workspace',    ownerOnly: true  },
  { label: 'Plan & Billing', href: '/settings/plan',        ownerOnly: true  },
  { label: 'Collaborators', href: '/settings/collaborators', ownerOnly: true  },
  { label: 'Referrals',     href: '/settings/referrals',    ownerOnly: false },
  { label: 'Appearance',    href: '/settings/appearance',   ownerOnly: false },
  { label: 'Privacy & cookies', href: '/settings/privacy',  ownerOnly: false },
];

// ── Inner layout (has access to context) ─────────────────────────

function SettingsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { identityLabel, workspaceName, workspaceImageUrl, workspacePlan, membershipRole, isOwner, loading } = useSettingsData();
  const { upgradeModalType, setUpgradeModalType } = useSettingsActions();

  const visibleNav = NAV_ITEMS.filter(item => !item.ownerOnly || isOwner);

  return (
    <AppShell
      label={identityLabel || 'User'}
      plan={workspacePlan}
      workspaceName={workspaceName}
      workspaceImageUrl={workspaceImageUrl}
      membershipRole={membershipRole}
    >
      <div className={styles.settingsShell}>
        {/* ── Left nav ── */}
        <aside className={styles.settingsNav}>
          <div className={styles.settingsNavHeader}>
            <Link href="/dashboard" className={styles.backButton}>← Back</Link>
            <h1 className={styles.settingsTitle}>Settings</h1>
          </div>
          <nav className={styles.settingsNavList}>
            {loading ? null : visibleNav.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.settingsNavItem} ${active ? styles.settingsNavItemActive : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {identityLabel && (
            <p className={styles.settingsNavFooter}>Signed in as {identityLabel}</p>
          )}
        </aside>

        {/* ── Content panel ── */}
        <main className={styles.settingsContent}>
          {children}
        </main>
      </div>

      <UpgradeModal
        isOpen={upgradeModalType !== null}
        type={upgradeModalType ?? 'collaborators'}
        onClose={() => setUpgradeModalType(null)}
      />
    </AppShell>
  );
}

// ── Exported layout ──────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <SettingsLayoutInner>{children}</SettingsLayoutInner>
    </SettingsProvider>
  );
}
