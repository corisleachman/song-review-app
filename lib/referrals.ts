import { supabaseServer } from '@/lib/supabaseServer';

export const REFERRAL_REWARD_CAP = 5;
export const REFERRAL_COOKIE_NAME = 'tsr_ref';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ── Types ────────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'converted' | 'rewarded' | 'ineligible';

export interface ReferralCode {
  id: string;
  user_id: string;
  account_id: string | null;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referral_code_id: string;
  referred_by_user_id: string;
  referred_by_account_id: string | null;
  referred_user_id: string;
  referred_account_id: string | null;
  status: ReferralStatus;
  ineligible_reason: string | null;
  credit_amount_pence: number | null;
  converted_at: string | null;
  reward_eligible_at: string | null;
  rewarded_at: string | null;
  referee_coupon_applied: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Code helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the active referral code for a user, or creates one if none exists.
 * Enforces one active code per user at query time (not schema constraint).
 */
export async function getOrCreateReferralCode(
  userId: string,
  accountId: string | null,
): Promise<ReferralCode> {
  // Try to find an existing active code
  const { data: existing } = await supabaseServer
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) return existing as ReferralCode;

  // Generate a unique code in JS — avoids PostgREST RPC exposure issues
  // Format: TSR-XXXXX (5 chars from unambiguous alphabet, no 0/O/1/I)
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let generated: string | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Array.from({ length: 5 }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('');
    const candidate = `TSR-${suffix}`;

    const { data: collision } = await supabaseServer
      .from('referral_codes')
      .select('id')
      .eq('code', candidate)
      .maybeSingle();

    if (!collision) {
      generated = candidate;
      break;
    }
  }

  if (!generated) {
    throw new Error('Could not generate a unique referral code after 10 attempts.');
  }

  const { data: created, error: createError } = await supabaseServer
    .from('referral_codes')
    .insert({
      user_id:    userId,
      account_id: accountId,
      code:       generated,
    })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error('Could not save referral code.');
  }

  return created as ReferralCode;
}

/**
 * Looks up a referral code by its code string.
 * Returns null if not found or not active.
 */
export async function getReferralCodeByCode(
  code: string,
): Promise<ReferralCode | null> {
  const { data } = await supabaseServer
    .from('referral_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  return (data as ReferralCode | null) ?? null;
}

// ── Referral attribution ─────────────────────────────────────────────────────

/**
 * Attempts to attribute a referral when a new user signs up.
 * Called from bootstrap after account creation.
 * Best-effort — never throws, never blocks bootstrap.
 */
export async function attributeReferralOnSignup(params: {
  referralCode:      string;
  referredUserId:    string;
  referredAccountId: string;
}): Promise<void> {
  const { referralCode, referredUserId, referredAccountId } = params;

  try {
    const code = await getReferralCodeByCode(referralCode);
    if (!code) return; // Invalid or inactive code — silent

    // Self-referral check
    if (code.user_id === referredUserId) {
      await supabaseServer.from('referrals').insert({
        referral_code_id:       code.id,
        referred_by_user_id:    code.user_id,
        referred_by_account_id: code.account_id,
        referred_user_id:       referredUserId,
        referred_account_id:    referredAccountId,
        status:                 'ineligible',
        ineligible_reason:      'self_referral',
      });
      return;
    }

    // Duplicate referral check — this user already has a referral row
    const { data: existing } = await supabaseServer
      .from('referrals')
      .select('id')
      .eq('referred_user_id', referredUserId)
      .maybeSingle();

    if (existing) return; // Already attributed — silent

    // Cap check — has the referrer already hit 5 rewards?
    const { count: rewardCount } = await supabaseServer
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by_user_id', code.user_id)
      .eq('status', 'rewarded');

    if ((rewardCount ?? 0) >= REFERRAL_REWARD_CAP) {
      await supabaseServer.from('referrals').insert({
        referral_code_id:       code.id,
        referred_by_user_id:    code.user_id,
        referred_by_account_id: code.account_id,
        referred_user_id:       referredUserId,
        referred_account_id:    referredAccountId,
        status:                 'ineligible',
        ineligible_reason:      'cap_reached',
      });
      return;
    }

    // All clear — write pending referral
    await supabaseServer.from('referrals').insert({
      referral_code_id:       code.id,
      referred_by_user_id:    code.user_id,
      referred_by_account_id: code.account_id,
      referred_user_id:       referredUserId,
      referred_account_id:    referredAccountId,
      status:                 'pending',
    });
  } catch (err) {
    // Never block bootstrap
    console.error('[referrals] Attribution error (non-fatal):', err);
  }
}

// ── Reward helpers ───────────────────────────────────────────────────────────

/**
 * Returns the pending/converted referral for a given account, if any.
 * Used by the invoice.paid webhook to find rewardable referrals.
 */
export async function getPendingReferralForAccount(
  accountId: string,
): Promise<Referral | null> {
  const { data, error } = await supabaseServer
    .from('referrals')
    .select('*')
    .eq('referred_account_id', accountId)
    .in('status', ['pending', 'converted'])
    .maybeSingle();

  if (error) throw error;

  return (data as Referral | null) ?? null;
}

/**
 * Marks a referral as converted (first paid invoice received).
 * Sets reward_eligible_at = now() for immediate eligibility at launch.
 */
export async function markReferralConverted(
  referralId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseServer
    .from('referrals')
    .update({
      status:             'converted',
      converted_at:       now,
      reward_eligible_at: now, // No holding period at launch
      metadata,
    })
    .eq('id', referralId);

  if (error) throw error;
}

/**
 * Marks a referral as rewarded after Stripe credit is applied.
 */
export async function markReferralRewarded(
  referralId: string,
  creditAmountPence: number,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabaseServer
    .from('referrals')
    .update({
      status:               'rewarded',
      rewarded_at:          new Date().toISOString(),
      credit_amount_pence:  creditAmountPence,
      metadata,
    })
    .eq('id', referralId);

  if (error) throw error;
}
