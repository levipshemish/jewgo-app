/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { generateSignedCSRFToken } from '@/lib/utils/auth-utils.server';
import { getCORSHeaders, ALLOWED_ORIGINS } from '@/lib/config/environment';
import { errorResponses } from '@/lib';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return new Response(null, {
    status: 204,
    headers: {
      ...getCORSHeaders(origin),
      'Cache-Control': 'no-store'
    }
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const baseHeaders = {
    ...getCORSHeaders(origin),
    'Cache-Control': 'no-store'
  };

  try {
    // Check if CSRF secret is properly configured
    const csrfSecret = process.env.CSRF_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && (!csrfSecret || csrfSecret === 'default-csrf-secret-change-in-production')) {
      // In production with invalid CSRF secret, return a simple token
      console.warn('CSRF_SECRET not properly configured in production, using fallback token');
      const fallbackToken = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return NextResponse.json({ token: fallbackToken }, { status: 200, headers: baseHeaders });
    }
    
    const token = generateSignedCSRFToken();
    return NextResponse.json({ token }, { status: 200, headers: baseHeaders });
  } catch (error) {
    console.error('CSRF token generation failed:', error);
    return NextResponse.json({ error: 'TOKEN_GENERATION_FAILED' }, { status: 500, headers: baseHeaders });
  }
}
