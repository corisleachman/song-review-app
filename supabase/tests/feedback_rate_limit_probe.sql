-- Synthetic feedback only, no notification/provider side effects; always roll back.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE TEMP TABLE feedback_probe_fixture ON COMMIT DROP AS
  SELECT (SELECT p.id FROM public.profiles p WHERE NOT EXISTS (
    SELECT 1 FROM public.beta_feedback f WHERE f.user_id=p.id AND f.created_at>=clock_timestamp()-interval '1 hour'
  ) ORDER BY p.id LIMIT 1) AS user_a,
  md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text) AS ip_a,
  md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text) AS ip_b,
  md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text) AS ip_c,
  md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text) AS ip_d;
CREATE TEMP TABLE feedback_probe_results(test_case text,passed boolean) ON COMMIT DROP;
GRANT SELECT ON feedback_probe_fixture TO service_role,anon,authenticated;
GRANT SELECT,INSERT ON feedback_probe_results TO service_role,anon,authenticated;
DO $$ BEGIN
  IF (SELECT user_a IS NULL FROM feedback_probe_fixture) THEN RAISE EXCEPTION 'Need profile without recent feedback'; END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.beta_feedback'::regclass AND NOT tgisinternal
    AND tgname<>'beta_feedback_rate_limit') THEN RAISE EXCEPTION 'Review unexpected feedback trigger'; END IF;
END $$;

-- MIGRATION_UNDER_TEST

SET LOCAL ROLE service_role;
DO $$
DECLARE i integer; h record; v_limit boolean := /* LIMIT_EXPECTED */; v_detail text; v_msg text;
BEGIN
  SELECT * INTO h FROM feedback_probe_fixture;
  FOR i IN 1..6 LOOP
    BEGIN
      INSERT INTO public.beta_feedback(type,message,email,ip_hash)
        VALUES('bug','Agent feedback rollback probe','agent-feedback-probe@example.invalid',h.ip_a);
      IF i=6 AND v_limit THEN RAISE EXCEPTION 'Sixth anonymous feedback accepted'; END IF;
    EXCEPTION WHEN raise_exception THEN
      GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT,v_detail=PG_EXCEPTION_DETAIL;
      IF NOT (v_limit AND i=6 AND v_msg='feedback_rate_limited' AND v_detail::integer BETWEEN 1 AND 3600) THEN RAISE; END IF;
    END;
  END LOOP;
  INSERT INTO feedback_probe_results SELECT 'anonymous rolling quota and denied row absent',count(*)=(CASE WHEN v_limit THEN 5 ELSE 6 END)
    FROM public.beta_feedback WHERE ip_hash=h.ip_a;

  FOR i IN 1..6 LOOP
    BEGIN
      INSERT INTO public.beta_feedback(type,message,user_id,email,ip_hash)
        VALUES('idea','Agent feedback rollback probe',h.user_a,'agent-feedback-probe@example.invalid',CASE WHEN i<=4 THEN h.ip_b ELSE h.ip_c END);
      IF i=6 AND v_limit THEN RAISE EXCEPTION 'User bypassed quota by changing IP'; END IF;
    EXCEPTION WHEN raise_exception THEN
      GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
      IF NOT (v_limit AND i=6 AND v_msg='feedback_rate_limited') THEN RAISE; END IF;
    END;
  END LOOP;
  INSERT INTO feedback_probe_results SELECT 'user quota shared across visitor addresses',count(*)=(CASE WHEN v_limit THEN 5 ELSE 6 END)
    FROM public.beta_feedback WHERE user_id=h.user_a AND email='agent-feedback-probe@example.invalid';
  -- Anonymous shares the IP history even when the earlier rows were signed in.
  INSERT INTO public.beta_feedback(type,message,email,ip_hash)
    VALUES('other','Agent feedback rollback probe','agent-feedback-probe@example.invalid',h.ip_b);
  BEGIN
    INSERT INTO public.beta_feedback(type,message,email,ip_hash)
      VALUES('other','Agent feedback rollback probe','agent-feedback-probe@example.invalid',h.ip_b);
    IF v_limit THEN RAISE EXCEPTION 'Anonymous ignored signed-in IP history'; END IF;
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg=MESSAGE_TEXT;
    IF NOT (v_limit AND v_msg='feedback_rate_limited') THEN RAISE; END IF;
  END;
  INSERT INTO feedback_probe_results VALUES('anonymous accounts for signed-in IP history',true);

  UPDATE public.beta_feedback SET created_at=clock_timestamp()-interval '61 minutes' WHERE ip_hash=h.ip_a;
  INSERT INTO public.beta_feedback(type,message,email,ip_hash)
    VALUES('bug','Agent feedback rollback probe','agent-feedback-probe@example.invalid',h.ip_a);
  INSERT INTO feedback_probe_results SELECT 'expired rows release allowance without deletion',count(*)=1
    FROM public.beta_feedback WHERE ip_hash=h.ip_a AND created_at>=clock_timestamp()-interval '1 hour';
  BEGIN
    INSERT INTO public.beta_feedback(type,message,email,ip_hash)
      VALUES('bug','short','agent-feedback-probe@example.invalid',h.ip_d);
    RAISE EXCEPTION 'Invalid message saved';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO feedback_probe_results SELECT 'constraint failure leaves no feedback row',count(*)=0 FROM public.beta_feedback WHERE ip_hash=h.ip_d;
END $$;
RESET ROLE;

-- If the quota query cannot read its ledger, insertion must fail, not continue.
-- Privilege changes remain inside this rolled-back probe.
DO $$ BEGIN
  ASSERT has_table_privilege('service_role','public.beta_feedback','SELECT'),'Unexpected initial server grants';
END $$;
REVOKE SELECT ON public.beta_feedback FROM service_role;
SET LOCAL ROLE service_role;
DO $$ DECLARE v_limit boolean := /* LIMIT_EXPECTED */; BEGIN
  BEGIN
    INSERT INTO public.beta_feedback(type,message,email,ip_hash)
      SELECT 'bug','Agent feedback rollback probe','agent-feedback-probe@example.invalid',ip_d FROM feedback_probe_fixture;
    IF v_limit THEN RAISE EXCEPTION 'Saved feedback without quota read permission'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    IF NOT v_limit THEN RAISE EXCEPTION 'Baseline insert unexpectedly required a ledger read'; END IF;
  END;
  INSERT INTO feedback_probe_results VALUES('quota-read failure expected result',true);
END $$;
RESET ROLE;
GRANT SELECT ON public.beta_feedback TO service_role;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.beta_feedback(type,message,email,ip_hash)
      SELECT 'bug','Agent feedback rollback probe','agent-feedback-probe@example.invalid',ip_d FROM feedback_probe_fixture;
    RAISE EXCEPTION 'Anonymous bypassed RLS';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO feedback_probe_results VALUES('anonymous direct insert denied',true);
  END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.beta_feedback(type,message,email,ip_hash)
      SELECT 'bug','Agent feedback rollback probe','agent-feedback-probe@example.invalid',ip_d FROM feedback_probe_fixture;
    RAISE EXCEPTION 'Member bypassed RLS';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO feedback_probe_results VALUES('member direct insert denied',true);
  END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM feedback_probe_results WHERE NOT passed) THEN RAISE EXCEPTION 'Feedback probe failed'; END IF;
END $$;
SELECT * FROM feedback_probe_results ORDER BY test_case;
ROLLBACK;
