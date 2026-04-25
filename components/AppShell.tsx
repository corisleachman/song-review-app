import type { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import styles from './AppShell.module.css';
import type { AccountPlan } from '@/lib/plans';

interface AppShellProps {
  children: ReactNode;
  label?: string;
  plan?: AccountPlan | null;
}

export default function AppShell({ children, label, plan }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <AppSidebar label={label} plan={plan} />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
