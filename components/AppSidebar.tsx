'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { clearAuth, clearIdentity } from '@/lib/auth';
import type { AccountPlan } from '@/lib/plans';
import styles from './AppSidebar.module.css';

interface AppSidebarProps {
  label?: string;
  plan?: AccountPlan | null;
}

type NavItem = {
  href?: string;
  label: string;
  icon: string;
  kind: 'link' | 'action';
  action?: () => Promise<void> | void;
  disabled?: boolean;
};

export default function AppSidebar({ label = 'Account', plan = null }: AppSidebarProps) {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      clearAuth();
      clearIdentity();
      window.location.assign('/');
    }
  };

  const topItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: '⌂',
      kind: 'link',
    },
  ];

  const bottomItems: NavItem[] = [
    {
      href: '/settings',
      label: 'Settings',
      icon: '⚙',
      kind: 'link',
    },
    {
      label: signingOut ? 'Signing out...' : 'Sign out',
      icon: '⎋',
      kind: 'action',
      action: handleSignOut,
      disabled: signingOut,
    },
  ];

  return (
    <aside className={styles.rail} aria-label="Authenticated app navigation">
      <div className={styles.inner}>
        <div className={styles.brand} title={label} aria-label={label}>
          <span className={styles.brandMark}>♪</span>
        </div>

        {plan === 'paid' && (
          <div className={styles.planLockup} aria-label="Paid plan active" title="Paid plan active">
            <span className={styles.planPill}>Pro</span>
            <span className={styles.planCaption}>Paid</span>
          </div>
        )}

        <nav className={styles.navGroup} aria-label="Primary">
          {topItems.map(item => {
            const active = item.href ? pathname === item.href : false;

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`${styles.navButton} ${active ? styles.active : ''}`}
                aria-label={item.label}
                title={item.label}
              >
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.spacer} />

        <nav className={styles.navGroup} aria-label="Secondary">
          {bottomItems.map(item => {
            if (item.kind === 'link') {
              const active = item.href ? pathname === item.href : false;

              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`${styles.navButton} ${active ? styles.active : ''}`}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => void item.action?.()}
                className={styles.navButton}
                aria-label={item.label}
                title={item.label}
                disabled={item.disabled}
              >
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
