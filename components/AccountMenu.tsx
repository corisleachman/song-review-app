'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { clearAuth, clearIdentity } from '@/lib/auth';
import styles from './AccountMenu.module.css';

interface AccountMenuProps {
  label: string;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || '?';
}

export default function AccountMenu({ label }: AccountMenuProps) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

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

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className={styles.avatar}>{getInitial(label)}</span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuLabel}>{label}</div>
          <Link href="/dashboard" className={styles.menuLink} role="menuitem" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          <Link href="/settings" className={styles.menuLink} role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
