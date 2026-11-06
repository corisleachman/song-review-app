import { readCollaborationInput } from '@/lib/collaborationInput';
import { safeErrorDetails } from '@/lib/safeErrorDetails';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalIdentity } from '@/lib/canonicalIdentity';
import {
  isThemeSettingsInput,
  loadThemeSettings,
  saveThemeSettings,
} from '@/lib/profileThemeSettings';

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
    console.error('Error fetching profile settings:', safeErrorDetails(error));
    return NextResponse.json(
      { error: 'Profile settings request failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveCanonicalIdentity();

    if (!resolved) {
      return NextResponse.json(
        { error: 'You must be signed in to save settings.' },
        { status: 401 }
      );
    }

    const payload = await readCollaborationInput(req);
    if (!isThemeSettingsInput(payload)) {
      return NextResponse.json(
        { error: 'Missing required colors' },
        { status: 400 }
      );
    }

    const settings = await saveThemeSettings(resolved.identity, payload);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving profile settings:', safeErrorDetails(error));
    return NextResponse.json(
      { error: 'Profile settings request failed.' },
      { status: 500 }
    );
  }
}
