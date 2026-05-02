import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  isThemeSettingsInput,
  loadThemeSettings,
  saveThemeSettings,
} from '@/lib/profileThemeSettings';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Profile settings request failed.';
}

export async function GET() {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to load settings.' },
        { status: 401 }
      );
    }

    const settings = await loadThemeSettings(resolved.identity);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching profile settings:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to save settings.' },
        { status: 401 }
      );
    }

    if (!isThemeSettingsInput(payload)) {
      return NextResponse.json(
        { error: 'Missing required colors' },
        { status: 400 }
      );
    }

    const settings = await saveThemeSettings(resolved.identity, payload);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving profile settings:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
