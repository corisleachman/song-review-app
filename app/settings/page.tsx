'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsData } from '@/lib/settingsContext';

export default function SettingsRootPage() {
  const router = useRouter();
  const { loading, isOwner } = useSettingsData();

  useEffect(() => {
    if (loading) return;
    router.replace(isOwner ? '/settings/workspace' : '/settings/appearance');
  }, [loading, isOwner, router]);

  return null;
}
