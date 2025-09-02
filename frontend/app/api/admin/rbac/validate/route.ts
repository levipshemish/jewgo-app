import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin-auth';
import { validateRolePermissions } from '@/lib/server/admin-constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Restrict to development to avoid leaking internal mappings
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!admin.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const result = validateRolePermissions();
  return NextResponse.json(result);
}

