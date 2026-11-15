import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { supabaseServer } from '@/lib/supabaseServer';
import styles from '../feedback/feedback.module.css';

export const dynamic = 'force-dynamic';

const OWNER_EMAIL = 'corisleachman@googlemail.com';
const PAGE_SIZE = 25;

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const owner = await getCurrentAuthenticatedUser();
  if (owner?.email?.trim().toLowerCase() !== OWNER_EMAIL || !owner.emailConfirmed) {
    notFound();
  }

  const requestedPage = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { data, error } = await supabaseServer.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
  const users = data.users;
  const workspaces = users.length
    ? await supabaseServer
        .from('accounts')
        .select('id, name, plan, created_by_user_id')
        .in('created_by_user_id', users.map(user => user.id))
        .order('name')
    : { data: [], error: null };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Signups</h1>
        <Link href="/admin/feedback">Feedback</Link>
      </header>
      {error || workspaces.error ? (
        <p className={styles.error} role="alert">Could not load signups. Refresh to try again.</p>
      ) : (
        <>
          {users.length === 0 && <p>No signups on this page.</p>}
          <ul>
            {users.map(user => {
              const ownedWorkspaces = workspaces.data?.filter(workspace => workspace.created_by_user_id === user.id) ?? [];
              return (
                <li key={user.id}>
                  <strong>{user.email ?? user.id}</strong>
                  {' · '}
                  <time dateTime={user.created_at}>{user.created_at.slice(0, 10)}</time>
                  {ownedWorkspaces.length ? (
                    <ul>
                      {ownedWorkspaces.map(workspace => (
                        <li key={workspace.id}>{workspace.name} · {workspace.plan}</li>
                      ))}
                    </ul>
                  ) : <p>No created workspace</p>}
                </li>
              );
            })}
          </ul>
          <nav aria-label="Signup pages" className={styles.filters}>
            {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
            <span>Page {page}</span>
            {users.length === PAGE_SIZE && <Link href={`?page=${page + 1}`}>Next</Link>}
          </nav>
        </>
      )}
    </main>
  );
}
