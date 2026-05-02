import { supabaseServer } from '@/lib/supabaseServer';
import type { CanonicalIdentity } from '@/lib/canonicalIdentity';

export interface ThemeSettings {
  primary_color: string;
  accent_color: string;
  background_color: string;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primary_color: '#ff1493',
  accent_color: '#a855f7',
  background_color: '#0d0914',
};

export function isThemeSettingsInput(value: unknown): value is ThemeSettings {
  if (!value || typeof value !== 'object') return false;

  const maybeTheme = value as Partial<Record<keyof ThemeSettings, unknown>>;

  return (
    typeof maybeTheme.primary_color === 'string' &&
    typeof maybeTheme.accent_color === 'string' &&
    typeof maybeTheme.background_color === 'string' &&
    Boolean(maybeTheme.primary_color.trim()) &&
    Boolean(maybeTheme.accent_color.trim()) &&
    Boolean(maybeTheme.background_color.trim())
  );
}

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === 'PGRST116';
}

function isProfileSettingsUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === '42P01' || error.code === '42703' || error.code === 'PGRST205') return true;

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('profile_settings') && (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find')
  );
}

async function loadLegacyThemeSettings(authorName: string): Promise<ThemeSettings | null> {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('primary_color, accent_color, background_color')
    .eq('user_identity', authorName)
    .maybeSingle();

  if (error && !isNoRowsError(error)) throw error;
  if (!data) return null;

  return data;
}

export async function loadThemeSettings(identity: CanonicalIdentity): Promise<ThemeSettings> {
  const { data, error } = await supabaseServer
    .from('profile_settings')
    .select('primary_color, accent_color, background_color')
    .eq('user_id', identity.userId)
    .maybeSingle();

  if (!error && data) return data;

  if (error && !isNoRowsError(error) && !isProfileSettingsUnavailable(error)) {
    throw error;
  }

  const legacyTheme = await loadLegacyThemeSettings(identity.authorName);
  return legacyTheme ?? DEFAULT_THEME_SETTINGS;
}

export async function saveThemeSettings(
  identity: CanonicalIdentity,
  theme: ThemeSettings
): Promise<ThemeSettings> {
  const nextTheme = {
    primary_color: theme.primary_color.trim(),
    accent_color: theme.accent_color.trim(),
    background_color: theme.background_color.trim(),
  };

  const { data, error } = await supabaseServer
    .from('profile_settings')
    .upsert(
      {
        user_id: identity.userId,
        ...nextTheme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('primary_color, accent_color, background_color')
    .single();

  if (!error && data) return data;

  if (!isProfileSettingsUnavailable(error)) throw error;

  const { data: legacyData, error: legacyError } = await supabaseServer
    .from('settings')
    .upsert(
      {
        user_identity: identity.authorName,
        ...nextTheme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_identity' }
    )
    .select('primary_color, accent_color, background_color')
    .single();

  if (legacyError) throw legacyError;

  return legacyData ?? nextTheme;
}
