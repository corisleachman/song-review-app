import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to load settings.' },
        { status: 401 }
      );
    }

    // Get settings for this user
    const { data, error } = await supabaseServer
      .from('settings')
      .select('primary_color, accent_color, background_color')
      .eq('user_identity', resolved.identity.authorName)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user hasn't saved settings yet)
      console.error('Error fetching settings:', error);
      throw error;
    }

    if (!data) {
      // Return defaults if no settings exist
      return NextResponse.json({
        primary_color: '#ff1493',
        accent_color: '#a855f7',
        background_color: '#0d0914',
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { primary_color, accent_color, background_color } = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to save settings.' },
        { status: 401 }
      );
    }

    // Validate colors
    if (!primary_color || !accent_color || !background_color) {
      return NextResponse.json(
        { error: 'Missing required colors' },
        { status: 400 }
      );
    }

    // Upsert settings (insert or update)
    const { data, error } = await supabaseServer
      .from('settings')
      .upsert(
        {
          user_identity: resolved.identity.authorName,
          primary_color,
          accent_color,
          background_color,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_identity' }
      )
      .select();

    if (error) {
      console.error('Error saving settings:', error);
      throw error;
    }

    console.log('Settings saved successfully for', resolved.identity.authorName);
    return NextResponse.json(data[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
