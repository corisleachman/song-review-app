-- =============================================================================
-- Phase 6: Referral Programme — schema migration (DOWN)
-- Reverses 20260522_phase6_referrals_up.sql
-- =============================================================================

DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS referral_codes;
DROP FUNCTION IF EXISTS generate_referral_code();
