import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentAuthenticatedUser } from '@/lib/currentUser';
import { supabaseServer } from '@/lib/supabaseServer';
import styles from '../feedback/feedback.module.css';

export const dynamic = 'force-dynamic';

const OWNER_EMAIL = 'corisleachman@googlemail.com';
const PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 120;

async function searchSignups(query: string, page: number) {
  const url = new URL('/auth/v1/admin/users', process.env.NEXT_PUBLIC_SUPABASE_URL!);
  url.search = new URLSearchParams({ filter: query, page: String(page), per_page: String(PAGE_SIZE) }).toString();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error('Signup search failed.');
  return await response.json() as { users: Array<{ id: string; email?: string; created_at: string }> };
}

export default async function AdminSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const owner = await getCurrentAuthenticatedUser();
  if (owner?.email?.trim().toLowerCase() !== OWNER_EMAIL || !owner.emailConfirmed) {
    notFound();
  }

  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, MAX_SEARCH_LENGTH) : '';
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { data, error } = query
    ? await searchSignups(query, page).then(data => ({ data, error: null })).catch(() => ({
        data: { users: [] },
        error: true,
      }))
    : await supabaseServer.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
  const users = data.users;
  const workspaces = users.length
    ? await supabaseServer
        .from('accounts')
        .select('id, name, plan, created_by_user_id')
        .in('created_by_user_id', users.map(user => user.id))
        .order('name')
    : { data: [], error: null };

  function pageLink(targetPage: number) {
    const params = new URLSearchParams({ page: String(targetPage) });
    if (query) params.set('q', query);
    return `?${params}`;
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Signups</h1>
        <Link href="/admin/feedback">Feedback</Link>
      </header>
      <form action="/admin/signups" className={styles.filters} autoComplete="off">
        <label htmlFor="signup-search">Search signups</label>
        <input id="signup-search" type="search" name="q" defaultValue={query} maxLength={MAX_SEARCH_LENGTH} />
        <button type="submit" className={styles.filterBtn}>Search</button>
        {query && <Link href="/admin/signups">Clear</Link>}
      </form>
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
            {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}
            <span>Page {page}</span>
            {users.length === PAGE_SIZE && <Link href={pageLink(page + 1)}>Next</Link>}
          </nav>
        </>
      )}
    </main>
  );
}
