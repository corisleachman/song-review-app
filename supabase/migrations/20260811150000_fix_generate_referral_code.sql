-- Fix a PL/pgSQL name collision that made the uniqueness check ambiguous.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  safe_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate_code TEXT;
  collision_found BOOLEAN;
BEGIN
  FOR attempt IN 1..10 LOOP
    candidate_code := 'TSR-' || (
      SELECT string_agg(
        substr(safe_chars, floor(random() * length(safe_chars) + 1)::int, 1),
        ''
      )
      FROM generate_series(1, 5)
    );

    SELECT EXISTS (
      SELECT 1
      FROM public.referral_codes AS rc
      WHERE rc.code = candidate_code
    )
    INTO collision_found;

    IF NOT collision_found THEN
      RETURN candidate_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Could not generate a unique referral code after 10 attempts';
END;
$$;
