-- Synthetic limiter metadata only. All changes roll back; no songs, users,
-- comments, invites or emails are created. Run after the limiter migration.
begin;
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.mutation_rate_limits'::regclass), 'RLS required';
  assert not has_table_privilege('anon', 'public.mutation_rate_limits', 'SELECT'), 'anon table access';
  assert not has_table_privilege('authenticated', 'public.mutation_rate_limits', 'INSERT'), 'client table write';
  assert not has_function_privilege('anon', 'public.consume_mutation_attempt(text,text,text)', 'EXECUTE'), 'anon RPC access';
  assert not has_function_privilege('authenticated', 'public.consume_mutation_attempt(text,text,text)', 'EXECUTE'), 'client RPC access';
  assert not (select prosecdef from pg_proc where oid = 'public.consume_mutation_attempt(text,text,text)'::regprocedure), 'must be invoker';
end $$;
set local role service_role;
do $$
declare
  d record;
  i integer;
  h text := repeat('a',64);
  w text := repeat('c',64);
  r text := repeat('d',64);
  previous_hits timestamptz[];
begin
  -- Isolate these reserved synthetic keys from previous probe runs.
  delete from public.mutation_rate_limits where subject_hash in (h,w,r,repeat('b',64),repeat('e',64))
    or subject_hash = lpad('ffff',64,'0');
  for i in 1..6 loop
    select * into d from public.consume_mutation_attempt('public_comment',h);
    assert d.allowed = (i <= 5), 'public budget';
    assert d.retry_after_seconds between (case when i <= 5 then 0 else 1 end) and 60, 'public retry';
  end loop;
  assert (select cardinality(hits) from public.mutation_rate_limits where scope='public_comment' and subject_hash=h) = 5, 'denial appended hit';
  -- Same subject has an independent private budget; create and reply share it.
  for i in 1..31 loop
    select * into d from public.consume_mutation_attempt('workspace_comment',h);
    assert d.allowed = (i <= 30), 'private budget';
  end loop;
  select * into d from public.consume_mutation_attempt('public_comment',repeat('b',64));
  assert d.allowed, 'different visitor blocked';
  -- Sliding expiry, including expiry at the edge, rather than a fixed minute.
  update public.mutation_rate_limits set hits=array_fill(clock_timestamp()-interval '61 seconds',array[5]), expires_at=clock_timestamp()+interval '1 minute'
    where scope='public_comment' and subject_hash=h;
  select * into d from public.consume_mutation_attempt('public_comment',h);
  assert d.allowed, 'expired rolling hits blocked';
  assert (select cardinality(hits) from public.mutation_rate_limits where scope='public_comment' and subject_hash=h) = 1, 'expired hits retained';

  select * into d from public.consume_mutation_attempt('workspace_invite',w,r);
  assert d.allowed, 'first invite';
  select hits into previous_hits from public.mutation_rate_limits where scope='workspace_invite' and subject_hash=w;
  select * into d from public.consume_mutation_attempt('workspace_invite',w,r);
  assert not d.allowed and d.retry_after_seconds between 1 and 60, 'resend cooldown';
  assert (select hits from public.mutation_rate_limits where scope='workspace_invite' and subject_hash=w) = previous_hits, 'denied resend consumed workspace allowance';
  update public.mutation_rate_limits set hits=array[clock_timestamp()-interval '61 seconds'], expires_at=clock_timestamp()+interval '1 minute'
    where scope='workspace_invite_recipient' and subject_hash=r;
  select * into d from public.consume_mutation_attempt('workspace_invite',w,r);
  assert d.allowed, 'recipient cooldown expiry';
  -- Fill the workspace hour while using different recipient keys.
  for i in 3..30 loop
    select * into d from public.consume_mutation_attempt('workspace_invite',w,lpad(to_hex(i),64,'0'));
    assert d.allowed, 'workspace slot lost to denied resend';
  end loop;
  select * into d from public.consume_mutation_attempt('workspace_invite',w,lpad('ffff',64,'0'));
  assert not d.allowed and d.retry_after_seconds between 1 and 3600, 'workspace hourly budget';
  assert (select cardinality(hits) from public.mutation_rate_limits where scope='workspace_invite_recipient' and subject_hash=lpad('ffff',64,'0')) = 0, 'hourly denial consumed recipient allowance';
  select * into d from public.consume_mutation_attempt('workspace_invite',repeat('e',64),repeat('b',64));
  assert d.allowed, 'other workspace blocked';
  update public.mutation_rate_limits set hits=array_fill(clock_timestamp()-interval '3601 seconds',array[30]), expires_at=clock_timestamp()+interval '1 hour'
    where scope='workspace_invite' and subject_hash=w;
  select * into d from public.consume_mutation_attempt('workspace_invite',w,lpad('ffff',64,'0'));
  assert d.allowed, 'hourly expiry did not release workspace and recipient';

  begin
    perform * from public.consume_mutation_attempt('other',h);
    raise exception 'invalid scope accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform * from public.consume_mutation_attempt('workspace_invite',h);
    raise exception 'missing recipient accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform * from public.consume_mutation_attempt('public_comment','raw-ip');
    raise exception 'raw subject accepted';
  exception when invalid_parameter_value then null; end;
end $$;
rollback;
select 'PASS: permissions, rolling budgets, denial accounting, isolation, expiry and parameter guards; probe rolled back' as result;
