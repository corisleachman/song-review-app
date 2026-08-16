import { supabaseServer } from '@/lib/supabaseServer';
import { isPlanAtLeast, normalizeAccountPlan } from '@/lib/plans';
import EmbedPlayer from './EmbedPlayer';
import styles from './embed.module.css';

export const dynamic = 'force-dynamic';

// Gate the embeddable player server-side. Embedding is a Pro/Studio perk, so the
// decision is made here — hiding the copy block in the manager UI is not enough,
// since the iframe URL could otherwise be hand-crafted. Service role bypasses RLS,
// so we check is_public + the owning account's plan ourselves.
async function resolveEmbedState(id: string): Promise<'ok' | 'locked' | 'unavailable'> {
  const { data: playlist } = await supabaseServer
    .from('playlists')
    .select('id, is_public, account_id')
    .eq('id', id)
    .maybeSingle();

  // Don't confirm a private/absent playlist exists.
  if (!playlist || !playlist.is_public) return 'unavailable';
  if (!playlist.account_id) return 'locked';

  const { data: account } = await supabaseServer
    .from('accounts')
    .select('plan')
    .eq('id', playlist.account_id)
    .maybeSingle();

  const plan = normalizeAccountPlan(account?.plan);
  return isPlanAtLeast(plan, 'pro') ? 'ok' : 'locked';
}

export default async function EmbedPlaylistPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const state = await resolveEmbedState(id);

  if (state === 'ok') {
    return <EmbedPlayer id={id} />;
  }

  const locked = state === 'locked';
  return (
    <div className={styles.gate}>
      <div className={styles.gateInner}>
        <span className={styles.gateWordmark}>The Song Room</span>
        <p className={styles.gateMsg}>
          {locked
            ? 'Embedding playlists is a Pro feature.'
            : 'This playlist isn’t available.'}
        </p>
        <a
          className={styles.gateCta}
          href="https://song-room.live"
          target="_blank"
          rel="noopener noreferrer"
        >
          {locked ? 'Learn about Pro →' : 'Learn more →'}
        </a>
      </div>
    </div>
  );
}
