import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';

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
  // Read-only initial config
  return NextResponse.json(DEFAULT_CONFIG);
}

export async function PUT(request: NextRequest) {
  const adminUser = await requireAdmin(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  // No-op write until ready; accept and return current config to keep UI functional
  return NextResponse.json(DEFAULT_CONFIG);
}

