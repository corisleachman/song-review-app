-- =============================================================================
-- Phase 6: Referral Programme — schema migration (UP)
-- Date: 2026-05-22
-- =============================================================================
-- Creates two tables:
--   referral_codes  — one active code per user, revocable
--   referrals       — tracks every referral from attribution through to reward
--
-- Also creates a helper function to generate short unique referral codes.
-- =============================================================================

-- ── Helper: short code generator ─────────────────────────────────────────────
-- Generates a TSR-XXXXX style code (5 uppercase alphanumeric chars, no
-- ambiguous characters 0/O/1/I). Retries on collision up to 10 times.

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code   TEXT;
  i      INTEGER;
  exists BOOLEAN;
BEGIN
  FOR i IN 1..10 LOOP
    -- Build a 5-character random string from the safe alphabet
    code := 'TSR-' || (
      SELECT string_agg(
        substr(chars, floor(random() * length(chars) + 1)::int, 1),
        ''
      )
      FROM generate_series(1, 5)
    );

    SELECT EXISTS (
      SELECT 1 FROM referral_codes WHERE referral_codes.code = code
    ) INTO exists;

    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;

  -- Extremely unlikely to reach here, but raise a clear error if it does
  RAISE EXCEPTION 'Could not generate a unique referral code after 10 attempts';
END;
$$;


-- ── referral_codes ────────────────────────────────────────────────────────────
-- One active code per user at any time.
-- A user can have multiple rows over time (if a code is revoked and regenerated)
-- but only one where is_active = true.
-- account_id is nullable — resolved at reward time if the user has a paid account.

CREATE TABLE IF NOT EXISTS referral_codes (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  account_id  UUID                 REFERENCES accounts(id)  ON DELETE SET NULL,
  code        TEXT        NOT NULL UNIQUE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by code (public landing page) and by user (settings page)
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes (code)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id
  ON referral_codes (user_id)
  WHERE is_active = true;


-- ── referrals ─────────────────────────────────────────────────────────────────
-- One row per referred user, ever. The UNIQUE constraint on referred_user_id
-- prevents the same person being attributed to multiple referrers.
--
-- Status lifecycle:
--   pending    → referred user signed up, not yet paying
--   converted  → referred user has an active paid subscription
--                (first invoice.paid received)
--   rewarded   → Stripe credit successfully applied to referrer's account
--   ineligible → invalid case (self-referral, duplicate, manual block, etc.)
--
-- reward_eligible_at is set to converted_at at launch.
-- To add a holding period later, set it to converted_at + interval 'N days'.

CREATE TABLE IF NOT EXISTS referrals (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who referred
  referral_code_id        UUID        NOT NULL REFERENCES referral_codes(id),
  referred_by_user_id     UUID        NOT NULL REFERENCES profiles(id),
  referred_by_account_id  UUID                 REFERENCES accounts(id)  ON DELETE SET NULL,

  -- Who was referred
  referred_user_id        UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  referred_account_id     UUID                 REFERENCES accounts(id)  ON DELETE SET NULL,

  -- Lifecycle
  status                  TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'converted', 'rewarded', 'ineligible')),
  ineligible_reason       TEXT,        -- 'self_referral' | 'duplicate_user' | 'manual_block'
                                       -- | 'payment_failed' | 'refunded' | 'cap_reached'

  -- Reward
  credit_amount_pence     INTEGER,     -- e.g. 450 for £4.50 (50% of Pro monthly)
  converted_at            TIMESTAMPTZ,
  reward_eligible_at      TIMESTAMPTZ, -- set to converted_at at launch
  rewarded_at             TIMESTAMPTZ,

  -- Referee discount tracking
  -- Records whether the referred user received their 3-month coupon at checkout
  referee_coupon_applied  BOOLEAN     NOT NULL DEFAULT false,

  -- Debug / audit
  metadata                JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One referral row per referred user, ever
  UNIQUE (referred_user_id)
);

-- Fast lookup: find pending referral for a newly converted account
CREATE INDEX IF NOT EXISTS idx_referrals_referred_account_status
  ON referrals (referred_account_id, status);

-- Fast lookup: count rewarded referrals for cap enforcement
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by_user_rewarded
  ON referrals (referred_by_user_id, status);

-- Fast lookup: referral history for settings page
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by_user_id
  ON referrals (referred_by_user_id);


-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE referral_codes IS
  'One active referral code per user. Codes are revocable but not deleted — is_active = false marks a retired code.';

COMMENT ON TABLE referrals IS
  'Tracks every referral from attribution (cookie → signup) through to reward (Stripe credit applied). One row per referred user, ever.';

COMMENT ON COLUMN referrals.reward_eligible_at IS
  'Set to converted_at at launch for immediate reward eligibility. Increase to converted_at + interval to add a holding period without schema changes.';

COMMENT ON COLUMN referrals.ineligible_reason IS
  'Populated when status = ineligible. Values: self_referral, duplicate_user, manual_block, payment_failed, refunded, cap_reached.';

COMMENT ON COLUMN referrals.referee_coupon_applied IS
  'True when the 50%-off-3-months coupon was applied to the referred user at checkout.';
