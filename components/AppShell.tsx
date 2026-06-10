import type { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import styles from './AppShell.module.css';
import type { AccountPlan } from '@/lib/plans';

interface AppShellProps {
  children: ReactNode;
  label?: string;
  plan?: AccountPlan | null;
  workspaceName?: string | null;
  workspaceImageUrl?: string | null;
  membershipRole?: 'owner' | 'member' | null;
  avatarUrl?: string | null;
  onSignOut?: () => void;
}

export default function AppShell({ children, label, plan, workspaceName, workspaceImageUrl, membershipRole, avatarUrl, onSignOut }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <AppSidebar
        label={label}
        plan={plan}
        workspaceName={workspaceName}
        workspaceImageUrl={workspaceImageUrl}
        membershipRole={membershipRole}
      />
      <div className={styles.content}>
        {workspaceName && (
          <div className={styles.mobileWorkspaceBar}>
            <WorkspaceSwitcher
              userLabel={label}
              workspaceName={workspaceName}
              workspaceImageUrl={workspaceImageUrl}
              membershipRole={membershipRole}
              avatarUrl={avatarUrl}
              variant="mobile"
              onSignOut={onSignOut}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
