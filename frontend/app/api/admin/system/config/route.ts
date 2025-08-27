import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction } from '@/lib/admin/audit';

const DEFAULT_CONFIG = {
  maintenanceMode: false,
  debugMode: false,
  emailNotifications: true,
  auditLogging: true,
  rateLimiting: true,
  backupFrequency: 'daily',
  sessionTimeout: 60,
  maxFileSize: 10,
};

export async function GET(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await prisma.adminConfig.findUnique({ where: { key: 'system_config' } });
    const value = (row?.value as any) || {};
    const merged = { ...DEFAULT_CONFIG, ...value };
    await logAdminAction(adminUser, 'system_config_view', 'system', { metadata: { viewer: adminUser.id } });
    return NextResponse.json(merged);
  } catch (e) {
    // Fallback to defaults if table missing
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Validate CSRF
  const headerToken = request.headers.get('x-csrf-token');
  if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
  }

  const body = await request.json();
  const nextConfig = { ...DEFAULT_CONFIG, ...(body || {}) };

  try {
    await prisma.adminConfig.upsert({
      where: { key: 'system_config' },
      update: { value: nextConfig, updated_at: new Date(), updated_by: adminUser.id },
      create: { key: 'system_config', value: nextConfig, updated_at: new Date(), updated_by: adminUser.id },
    });
    await logAdminAction(adminUser, 'system_config_update', 'system', { newData: nextConfig });
  } catch (e) {
    console.error('[ADMIN] Failed to persist system config:', e);
  }

  return NextResponse.json(nextConfig);
}
