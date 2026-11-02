-- Rolling mutation budgets shared across server instances. Hashes are generated
-- server-side with a domain-separated HMAC. No user/IP/email values are stored.
create table public.mutation_rate_limits (
  scope text not null check (scope in ('public_comment', 'workspace_comment', 'workspace_invite', 'workspace_invite_recipient')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  hits timestamptz[] not null default '{}',
  expires_at timestamptz not null,
  primary key (scope, subject_hash),
  constraint mutation_rate_limits_bounded_hits check (cardinality(hits) <= 30)
);
create index mutation_rate_limits_expiry_idx on public.mutation_rate_limits (expires_at);
alter table public.mutation_rate_limits enable row level security;
revoke all on table public.mutation_rate_limits from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.mutation_rate_limits to service_role;

create function public.consume_mutation_attempt(
  p_scope text, p_subject_hash text, p_recipient_hash text default null
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_now timestamptz;
  v_window interval;
  v_max integer;
  v_hits timestamptz[];
  v_recipient_hits timestamptz[];
  v_retry integer := 0;
begin
  if p_scope is null or p_scope not in ('public_comment', 'workspace_comment', 'workspace_invite')
    or p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$'
    or (p_scope = 'workspace_invite' and (p_recipient_hash is null or p_recipient_hash !~ '^[0-9a-f]{64}$'))
    or (p_scope <> 'workspace_invite' and p_recipient_hash is not null) then
    raise exception 'Invalid mutation limiter parameters' using errcode = '22023';
  end if;

  v_window := case when p_scope = 'workspace_invite' then interval '1 hour' else interval '1 minute' end;
  v_max := case when p_scope = 'public_comment' then 5 else 30 end;

  -- Lock one subject row first. All recipient decisions for a workspace share
  -- this lock, so concurrent resends and new invites cannot split the budget.
  insert into public.mutation_rate_limits(scope, subject_hash, expires_at)
    values (p_scope, p_subject_hash, clock_timestamp() + v_window)
    on conflict (scope, subject_hash) do update set subject_hash = excluded.subject_hash;

  if p_scope = 'workspace_invite' then
    insert into public.mutation_rate_limits(scope, subject_hash, expires_at)
      values ('workspace_invite_recipient', p_recipient_hash, clock_timestamp() + interval '1 minute')
      on conflict (scope, subject_hash) do update set subject_hash = excluded.subject_hash;
  end if;

  -- Read time after lock acquisition, not before a potentially queued request.
  v_now := clock_timestamp();
  select coalesce(array_agg(hit order by hit), '{}'::timestamptz[]) into v_hits
    from public.mutation_rate_limits as limiter, unnest(limiter.hits) as hit
    where limiter.scope = p_scope and limiter.subject_hash = p_subject_hash
      and hit > v_now - v_window;

  if cardinality(v_hits) >= v_max then
    v_retry := greatest(1, ceil(extract(epoch from (v_hits[1] + v_window - v_now)))::integer);
  end if;

  if p_scope = 'workspace_invite' then
    select coalesce(array_agg(hit order by hit), '{}'::timestamptz[]) into v_recipient_hits
      from public.mutation_rate_limits as limiter, unnest(limiter.hits) as hit
      where limiter.scope = 'workspace_invite_recipient' and limiter.subject_hash = p_recipient_hash
        and hit > v_now - interval '1 minute';
    if cardinality(v_recipient_hits) > 0 then
      v_retry := greatest(v_retry, 1,
        ceil(extract(epoch from (v_recipient_hits[1] + interval '1 minute' - v_now)))::integer);
    end if;
  end if;

  -- Denial consumes neither budget and does not extend the wait.
  if v_retry = 0 then
    update public.mutation_rate_limits set hits = array_append(v_hits, v_now), expires_at = v_now + v_window
      where scope = p_scope and subject_hash = p_subject_hash;
    if p_scope = 'workspace_invite' then
      update public.mutation_rate_limits set hits = array[v_now], expires_at = v_now + interval '1 minute'
        where scope = 'workspace_invite_recipient' and subject_hash = p_recipient_hash;
    end if;
  end if;

  -- Bounded cleanup; never wait for other callers' active counters.
  delete from public.mutation_rate_limits as expired
    where (expired.scope, expired.subject_hash) in (
      select candidate.scope, candidate.subject_hash from public.mutation_rate_limits as candidate
      where candidate.expires_at <= v_now
      order by candidate.expires_at, candidate.scope, candidate.subject_hash
      for update skip locked limit 100
    );

  return query select v_retry = 0, v_retry;
end;
$$;
revoke all on function public.consume_mutation_attempt(text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.consume_mutation_attempt(text, text, text) to service_role;
comment on table public.mutation_rate_limits is 'Service-role-only bounded rolling mutation counters; no client policies by design.';
comment on function public.consume_mutation_attempt(text, text, text) is 'Atomically reserves public 5/min, private 30/min, or invite 30/hour plus recipient 1/min. Failed downstream attempts still consume a reservation.';
