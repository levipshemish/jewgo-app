/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/utils/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSignedCSRFToken } from '@/lib/admin/csrf';
import { corsHeaders, buildSecurityHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
    }

    const token = generateSignedCSRFToken(adminUser.id);
    const headers = {
      ...buildSecurityHeaders(request),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    } as HeadersInit;

    return NextResponse.json({ token }, { headers });
  } catch (error) {
    adminLogger.error('CSRF token generation error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
