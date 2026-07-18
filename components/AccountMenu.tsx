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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!open || !menuRef.current) return;

    const menu = menuRef.current;
    const focusMenuItem = (index: number) => {
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
      if (items.length === 0) return;
      items[(index + items.length) % items.length]?.focus();
    };

    const focusFrame = window.requestAnimationFrame(() => focusMenuItem(0));
    const handleKeyDown = (event: KeyboardEvent) => {
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusMenuItem(currentIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusMenuItem(currentIndex - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusMenuItem(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusMenuItem(items.length - 1);
      }
    };

    menu.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      menu.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

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
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        aria-controls="account-menu-panel"
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={styles.avatar}>{getInitial(label)}</span>
      </button>

      {open && (
        <div ref={menuRef} id="account-menu-panel" className={styles.menu} role="menu" aria-label="Account options">
          <div className={styles.menuLabel} role="presentation">{label}</div>
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
