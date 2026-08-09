import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { loadThemeSettings } from '@/lib/profileThemeSettings';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
    }
    const { data, error } = await supabaseServer
      .from('profile_settings')
      .select('visualizer_enabled')
      .eq('user_id', resolved.identity.userId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.error('[profile/visualizer] load error:', error);
      return NextResponse.json({ visualizer_enabled: true });
    }
    return NextResponse.json({ visualizer_enabled: data?.visualizer_enabled ?? true });
  } catch (err) {
    console.error('[profile/visualizer] Error:', err);
    return NextResponse.json({ visualizer_enabled: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();
    if (!resolved) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as { visualizer_enabled?: unknown } | null;
    if (typeof body?.visualizer_enabled !== 'boolean') {
      return NextResponse.json({ error: 'visualizer_enabled must be a boolean.' }, { status: 400 });
    }
    // Preserve the user's current theme colours on the row (a no-op for existing rows,
    // and correct defaults if the row is being created for the first time).
    const theme = await loadThemeSettings(resolved.identity);
    const { error } = await supabaseServer
      .from('profile_settings')
      .upsert(
        {
          user_id: resolved.identity.userId,
          primary_color: theme.primary_color,
          accent_color: theme.accent_color,
          background_color: theme.background_color,
          visualizer_enabled: body.visualizer_enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (error) {
      console.error('[profile/visualizer] save error:', error);
      return NextResponse.json({ error: 'Could not save preference.' }, { status: 500 });
    }
    return NextResponse.json({ visualizer_enabled: body.visualizer_enabled });
  } catch (err) {
    console.error('[profile/visualizer] Error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
