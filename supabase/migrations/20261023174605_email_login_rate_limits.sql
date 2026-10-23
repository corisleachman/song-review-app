-- Shared server-side fixed-window limiter for password login attempts.
-- The application supplies an environment-specific HMAC of Vercel's visitor
-- IP. No raw address, email, password, CAPTCHA value, or auth intent is stored.
create table public.email_login_rate_limits (
  client_hash text primary key,
  window_started_at timestamptz not null,
  attempt_count integer not null,
  expires_at timestamptz not null,
  constraint email_login_rate_limits_client_hash_format
    check (client_hash ~ '^[0-9a-f]{64}$'),
  constraint email_login_rate_limits_attempt_count_positive
    check (attempt_count > 0),
  constraint email_login_rate_limits_expiry_window
    check (
      expires_at >= window_started_at + interval '5 minutes'
      and expires_at <= window_started_at + interval '10 minutes'
    )
);

create index email_login_rate_limits_expires_at_idx
  on public.email_login_rate_limits (expires_at);

alter table public.email_login_rate_limits enable row level security;

-- No client policies are intentional. Only the server-side service-role
-- client may consume or inspect this limiter.
revoke all privileges on table public.email_login_rate_limits
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.email_login_rate_limits
  to service_role;

create or replace function public.consume_email_login_attempt(p_client_hash text)
returns table (
  allowed boolean,
  attempt_count integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_window_started_at timestamptz;
  v_attempt_count integer;
begin
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid Email login limiter client hash'
      using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / 300) * 300
  );

  -- Keep cleanup bounded. SKIP LOCKED prevents concurrent login requests
  -- from waiting on the same expired rows.
  delete from public.email_login_rate_limits as expired
  where expired.client_hash in (
    select candidate.client_hash
    from public.email_login_rate_limits as candidate
    where candidate.expires_at <= v_now
    order by candidate.expires_at, candidate.client_hash
    for update skip locked
    limit 100
  );

  insert into public.email_login_rate_limits as limiter (
    client_hash,
    window_started_at,
    attempt_count,
    expires_at
  )
  values (
    p_client_hash,
    v_window_started_at,
    1,
    v_window_started_at + interval '10 minutes'
  )
  on conflict (client_hash) do update
  set
    window_started_at = excluded.window_started_at,
    attempt_count = case
      when limiter.window_started_at = excluded.window_started_at
        then least(limiter.attempt_count::bigint + 1, 2147483647)::integer
      else 1
    end,
    expires_at = excluded.expires_at
  returning limiter.attempt_count into v_attempt_count;

  return query
    select
      v_attempt_count <= 15,
      v_attempt_count,
      greatest(
        1,
        ceil(
          extract(
            epoch from (v_window_started_at + interval '5 minutes' - v_now)
          )
        )::integer
      );
end;
$$;

revoke all privileges on function public.consume_email_login_attempt(text)
  from public, anon, authenticated, service_role;

grant execute on function public.consume_email_login_attempt(text)
  to service_role;

comment on table public.email_login_rate_limits is
  'Service-role-only five-minute password-login limiter keyed by an environment-specific visitor-IP HMAC.';

comment on function public.consume_email_login_attempt(text) is
  'Atomically counts password-login attempts and allows the first fifteen per visitor HMAC in each five-minute window.';
