import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin-auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { errorResponses, createSuccessResponse } from '@/lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Restrict to development to avoid leaking internal mappings
  if (process.env.NODE_ENV !== 'development') {
    return errorResponses.notFound();
  }

  const admin = await requireAdmin(request);
  if (!admin) return errorResponses.unauthorized();
  if (!admin.isSuperAdmin) return errorResponses.forbidden();

  const result = ADMIN_PERMISSIONS;
  return NextResponse.json(result);
}

