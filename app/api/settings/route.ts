import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getIdentity } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get identity from cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const identityMatch = cookieHeader.match(/song_review_identity=([^;]+)/);
    const identity = identityMatch ? decodeURIComponent(identityMatch[1]) : null;

    if (!identity || !['Coris', 'Al'].includes(identity)) {
      return NextResponse.json(
        { error: 'Invalid identity' },
        { status: 400 }
      );
    }

    // Get settings for this user
    const { data, error } = await supabaseServer
      .from('settings')
      .select('primary_color, accent_color, background_color')
      .eq('user_identity', identity)
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

    // Get identity from cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const identityMatch = cookieHeader.match(/song_review_identity=([^;]+)/);
    const identity = identityMatch ? decodeURIComponent(identityMatch[1]) : null;

    if (!identity || !['Coris', 'Al'].includes(identity)) {
      return NextResponse.json(
        { error: 'Invalid identity' },
        { status: 400 }
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
          user_identity: identity,
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

    console.log('Settings saved successfully for', identity);
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
