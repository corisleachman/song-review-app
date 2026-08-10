'use client';

import AppShell from '@/components/AppShell';
import UpgradeModal from '@/components/UpgradeModal';
import { SettingsProvider, useSettingsData, useSettingsActions } from '@/lib/settingsContext';

function UploadLayoutInner({ children }: { children: React.ReactNode }) {
  const { identityLabel, workspaceName, workspaceImageUrl, workspacePlan, membershipRole } = useSettingsData();
  const { upgradeModalType, setUpgradeModalType } = useSettingsActions();
  return (
    <AppShell
      label={identityLabel || 'User'}
      plan={workspacePlan}
      workspaceName={workspaceName}
      workspaceImageUrl={workspaceImageUrl}
      membershipRole={membershipRole}
    >
      {children}
      <UpgradeModal
        isOpen={upgradeModalType !== null}
        type={upgradeModalType ?? 'collaborators'}
        onClose={() => setUpgradeModalType(null)}
      />
    </AppShell>
  );
}

export const dynamic = 'force-dynamic';

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <UploadLayoutInner>{children}</UploadLayoutInner>
    </SettingsProvider>
  );
}
