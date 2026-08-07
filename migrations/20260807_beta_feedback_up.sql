-- =============================================================================
-- Beta Feedback + Founding Tester capture — schema migration (UP)
-- Date: 2026-08-07
-- =============================================================================
-- Creates one table:
--   beta_feedback  — one row per feedback submission. Doubles as the triage
--                    queue (status) and the Founding Tester reward ledger
--                    (reward_* columns).
--
-- Notes for the v2 consumer build:
--   • Public-facing. The in-app feedback FAB and the logged-out /listen page
--     can both submit. All writes go through /api/feedback using the
--     service-role client — never directly from the browser. RLS is therefore
--     enabled with NO policies (deny-all to anon/authenticated; the service
--     role bypasses RLS), keeping the endpoint write-only through the API.
--   • Reward is two-phase. Approving quality feedback sets reward_eligible =
--     true during beta but issues nothing. Unique Stripe promotion codes are
--     batch-issued AT LAUNCH, when plan gating (Phase 10) goes live — see
--     reward_issued / reward_code / reward_issued_at.
--   • Founding Tester cap = 100. Enforced in the admin approval route
--     (count of reward_eligible = true), NOT as a DB constraint, so the ceiling
--     can be raised later without a migration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS beta_feedback (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Submission ──
  type              TEXT        NOT NULL
                    CHECK (type IN ('bug', 'idea', 'other')),
  message           TEXT        NOT NULL
                    CHECK (char_length(message) BETWEEN 10 AND 2000),

  -- ── Submitter ──
  -- user_id NULL = logged-out submitter (e.g. public /listen page).
  -- In that case email is required (enforced in the API, not the schema).
  user_id           UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  email             TEXT,

  -- ── Silently captured context (for reproducing bugs) ──
  page_url          TEXT,
  user_agent        TEXT,
  viewport          TEXT,        -- e.g. '390x844'
  app_version       TEXT,        -- release tag / short git sha at submission time
  ip_hash           TEXT,        -- sha256(ip + salt); rate-limiting only, never the raw IP

  -- ── Triage ──
  status            TEXT        NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'approved', 'rejected', 'spam')),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       TEXT,
  admin_notes       TEXT,

  -- ── Reward (two-phase — eligibility now, code issue at launch) ──
  reward_eligible   BOOLEAN     NOT NULL DEFAULT false,
  reward_issued     BOOLEAN     NOT NULL DEFAULT false,
  reward_code       TEXT,
  reward_issued_at  TIMESTAMPTZ
);

-- Triage queue: list items by status, newest first
CREATE INDEX IF NOT EXISTS idx_beta_feedback_status
  ON beta_feedback (status, created_at DESC);

-- A submitter's own history
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id
  ON beta_feedback (user_id);

-- Rate-limiting: count recent rows per hashed IP within a time window
CREATE INDEX IF NOT EXISTS idx_beta_feedback_ip_hour
  ON beta_feedback (ip_hash, created_at);

-- Cap enforcement: fast count of reward-eligible rows
CREATE INDEX IF NOT EXISTS idx_beta_feedback_reward_eligible
  ON beta_feedback (reward_eligible)
  WHERE reward_eligible = true;


-- ── Row Level Security ──
-- Deny-all: no policies are created, so anon/authenticated roles cannot read or
-- write. The service-role key used by /api/feedback and the admin routes
-- bypasses RLS. Public feedback is therefore write-only, and only through the API.
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;


-- ── Comments ──
COMMENT ON TABLE beta_feedback IS
  'One row per beta feedback submission. Doubles as the triage queue (status) and the Founding Tester reward ledger (reward_*). Public writes go through /api/feedback with the service-role client; RLS is deny-all.';

COMMENT ON COLUMN beta_feedback.ip_hash IS
  'sha256(ip + salt). Used only for per-IP rate limiting of logged-out submissions. The raw IP is never stored.';

COMMENT ON COLUMN beta_feedback.reward_eligible IS
  'Set true when an admin approves quality feedback AND the Founding Tester cap (100) has not been reached. Does not issue a code — see reward_issued.';

COMMENT ON COLUMN beta_feedback.reward_issued IS
  'Set true once a unique Stripe promotion code (coupon founding_tester_6mo) has been generated and emailed to the tester. Batch-issued at launch when plan gating goes live.';
