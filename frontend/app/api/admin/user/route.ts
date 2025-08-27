import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await logAdminAction(adminUser, 'current_admin_view', 'user', { entityId: adminUser.id });
  } catch {}
  return NextResponse.json(adminUser, { headers: { 'Cache-Control': 'no-store' } });
}
