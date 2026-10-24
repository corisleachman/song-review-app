import { NextResponse } from 'next/server';
import { isEmailPasswordAuthReady, isSignedInPasswordManagementReady } from '@/lib/authFeatureFlags';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = NextResponse.json({
    enabled: isEmailPasswordAuthReady(),
    passwordManagementEnabled: isSignedInPasswordManagementReady(),
  });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
