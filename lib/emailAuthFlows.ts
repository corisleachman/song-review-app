import 'server-only';

import { hashAuthIntentEmail } from '@/lib/authIntentCore';
import { supabaseServer } from '@/lib/supabaseServer';

export type EmailAuthFlowPurpose = 'signup' | 'recovery';

export interface EmailAuthFlow {
  id: string;
  emailHash: string;
  purpose: EmailAuthFlowPurpose;
  sealedIntent: string;
}

const EMAIL_AUTH_FLOW_TTL_MS = 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEmailAuthFlowId(value: string | null | undefined) {
  return Boolean(value) && UUID_PATTERN.test(value as string);
}

export async function createEmailAuthFlow(input: {
  email: string;
  purpose: EmailAuthFlowPurpose;
  sealedIntent: string;
}) {
  const now = Date.now();
  const expiresAt = new Date(now + EMAIL_AUTH_FLOW_TTL_MS).toISOString();

  // Keep the table bounded without making cleanup a prerequisite for auth.
  const { error: cleanupError } = await supabaseServer
    .from('email_auth_flows')
    .delete()
    .lt('expires_at', new Date(now).toISOString());
  if (cleanupError) {
    console.warn('[email-auth] Expired confirmation flows could not be removed.');
  }

  const { data, error } = await supabaseServer
    .from('email_auth_flows')
    .insert({
      email_hash: hashAuthIntentEmail(input.email),
      purpose: input.purpose,
      sealed_intent: input.sealedIntent,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data?.id || !isEmailAuthFlowId(data.id)) {
    throw new Error('Email auth flow could not be created.');
  }

  return data.id as string;
}

export async function readEmailAuthFlow(id: string | null | undefined): Promise<EmailAuthFlow | null> {
  if (!isEmailAuthFlowId(id)) return null;

  const { data, error } = await supabaseServer
    .from('email_auth_flows')
    .select('id, email_hash, purpose, sealed_intent')
    .eq('id', id as string)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error('Email auth flow could not be read.');
  if (!data || (data.purpose !== 'signup' && data.purpose !== 'recovery')) return null;

  return {
    id: data.id,
    emailHash: data.email_hash,
    purpose: data.purpose,
    sealedIntent: data.sealed_intent,
  };
}

export async function consumeEmailAuthFlow(id: string) {
  if (!isEmailAuthFlowId(id)) throw new Error('Email auth flow could not be consumed.');

  const { data, error } = await supabaseServer
    .from('email_auth_flows')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data?.id) throw new Error('Email auth flow could not be consumed.');
}
