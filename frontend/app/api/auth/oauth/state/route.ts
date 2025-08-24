import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  // Generate cryptographically strong random state
  const state = randomBytes(16).toString('hex');

  const res = NextResponse.json({ state });

  // Set HttpOnly state cookie for double-submit validation
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 5 * 60, // 5 minutes
  });

  return res;
}

