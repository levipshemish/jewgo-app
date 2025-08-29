import { NextRequest, NextResponse } from 'next/server';
import { generateSignedCSRFToken } from '@/lib/admin/csrf';
import { requireAdmin, type AdminUser } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  const adminUser: AdminUser | null = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = generateSignedCSRFToken(adminUser.id);
  const res = NextResponse.json({ token });
  res.cookies.set('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60,
    path: '/',
  });
  return res;
}

