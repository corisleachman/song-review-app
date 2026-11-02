-- Count and save feedback in one transaction. Existing rows remain the rolling
-- quota ledger, so installation doesn't reset anyone's five/hour allowance.
create function public.enforce_beta_feedback_rate_limit()
returns trigger
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_keys bigint[] := '{}';
  v_key bigint;
  v_now timestamptz;
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if new.ip_hash is not null and new.ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid feedback visitor hash' using errcode = '22023';
  end if;
  if new.user_id is null and new.ip_hash is null then
    raise exception 'Feedback identity required' using errcode = '22023';
  end if;

  if new.user_id is not null then
    v_keys := array_append(v_keys, hashtextextended('song-room-feedback-user:' || new.user_id::text, 0));
  end if;
  if new.ip_hash is not null then
    v_keys := array_append(v_keys, hashtextextended('song-room-feedback-ip:' || new.ip_hash, 0));
  end if;
  -- Signed-in feedback also locks its IP: anonymous submissions count all rows
  -- from that IP, preserving the existing policy without a cross-identity race.
  for v_key in select distinct key from unnest(v_keys) as key order by key loop
    perform pg_advisory_xact_lock(v_key);
  end loop;

  v_now := clock_timestamp();
  if new.user_id is not null then
    select count(*), min(recent.created_at) into v_count, v_oldest
      from (select created_at from public.beta_feedback
        where user_id = new.user_id and created_at >= v_now - interval '1 hour'
        order by created_at desc limit 5) recent;
  else
    select count(*), min(recent.created_at) into v_count, v_oldest
      from (select created_at from public.beta_feedback
        where ip_hash = new.ip_hash and created_at >= v_now - interval '1 hour'
        order by created_at desc limit 5) recent;
  end if;

  if v_count >= 5 then
    -- Fifth newest gives the real next slot even if legacy races left >5 rows.
    v_retry := greatest(1, least(3600,
      ceil(extract(epoch from (v_oldest + interval '1 hour' - v_now)))::integer));
    raise exception using errcode = 'P0001', message = 'feedback_rate_limited', detail = v_retry::text;
  end if;
  -- Time accepted after a possible lock wait, rather than transaction start.
  new.created_at := v_now;
  return new;
end;
$$;

revoke all on function public.enforce_beta_feedback_rate_limit() from public, anon, authenticated, service_role;
grant execute on function public.enforce_beta_feedback_rate_limit() to service_role;

create trigger beta_feedback_rate_limit
before insert on public.beta_feedback
for each row execute function public.enforce_beta_feedback_rate_limit();

comment on function public.enforce_beta_feedback_rate_limit() is
  'Atomic rolling five/hour feedback limit per signed-in user, otherwise visitor hash. Invoker permissions; no email, counters, or raw visitor address stored.';
