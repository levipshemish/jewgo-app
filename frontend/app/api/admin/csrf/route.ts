import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { generateCSRFToken } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate CSRF token
    const token = generateCSRFToken();

    // Return the token
    return NextResponse.json({ token });
  } catch (error) {
    console.error('[ADMIN CSRF] Error generating CSRF token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
