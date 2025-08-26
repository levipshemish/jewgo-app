import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { getCSRFTokenFromCookie, validateSignedCSRFToken } from '@/lib/admin/csrf';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const defaults = {
      maintenanceMode: false,
      debugMode: false,
      emailNotifications: true,
      auditLogging: true,
      rateLimiting: true,
      backupFrequency: 'daily',
      sessionTimeout: 60,
      maxFileSize: 5,
    } as const;

    const prisma = new PrismaClient();
    const rows = await prisma.$queryRaw<any[]>`
      SELECT key, value FROM admin_config
    `;
    
    const cfg: any = { ...defaults };
    if (rows) {
      for (const row of rows) {
        cfg[row.key] = row.value;
      }
    }
    
    await prisma.$disconnect();

    await logAdminAction(adminUser, 'system_config_view', 'system', {
      metadata: { action: 'view_config' },
    });

    // Return plain object (UI expects direct values)
    return NextResponse.json(cfg);
  } catch (error) {
    console.error('[ADMIN] System config GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch system configuration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const cookieToken = await getCSRFTokenFromCookie();
    const headerToken = request.headers.get('x-csrf-token');
    if (!cookieToken || !headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    const body = await request.json();
    const allowedKeys = [
      'maintenanceMode','debugMode','emailNotifications','auditLogging','rateLimiting','backupFrequency','sessionTimeout','maxFileSize'
    ];

    const prisma = new PrismaClient();
    
    for (const key of allowedKeys) {
      if (key in body) {
        try {
          await prisma.$executeRaw`
            INSERT INTO admin_config (key, value, updated_by, updated_at)
            VALUES (${key}, ${JSON.stringify(body[key])}, ${adminUser.id}, NOW())
            ON CONFLICT (key) 
            DO UPDATE SET 
              value = EXCLUDED.value,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
          `;
        } catch (error) {
          console.error('[ADMIN] Error updating config key:', key, error);
          await prisma.$disconnect();
          return NextResponse.json({ error: 'Failed to update system configuration' }, { status: 500 });
        }
      }
    }

    await logAdminAction(adminUser, 'system_config_update', 'system', {
      metadata: { action: 'update_config', keys: Object.keys(body) },
    });

    // Fetch updated config
    const rows = await prisma.$queryRaw<any[]>`
      SELECT key, value FROM admin_config
    `;
    
    const cfg: any = {};
    if (rows) {
      for (const row of rows) {
        cfg[row.key] = row.value;
      }
    }
    
    await prisma.$disconnect();
    return NextResponse.json(cfg);
  } catch (error) {
    console.error('[ADMIN] System config PUT error:', error);
    return NextResponse.json({ error: 'Failed to update system configuration' }, { status: 500 });
  }
}
