-- =============================================================================
-- Beta Feedback + Founding Tester capture — schema migration (DOWN)
-- Date: 2026-08-07
-- =============================================================================
-- Reverses 20260807_beta_feedback_up.sql.
-- Dropping the table removes its indexes automatically.
--
-- WARNING: this destroys all captured feedback and every reward-eligibility /
-- reward-issued record. Do not run in production once real feedback has landed
-- unless you have exported it first.
-- =============================================================================

DROP TABLE IF EXISTS beta_feedback;
