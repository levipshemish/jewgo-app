import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, validateCSRFToken, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

// In-memory config store (in production, this would be in a database)
let systemConfig = {
  maintenanceMode: false,
  debugMode: false,
  emailNotifications: true,
  auditLogging: true,
  rateLimiting: true,
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  sessionTimeout: 3600, // 1 hour
  backupRetention: 30, // 30 days
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({
      config: systemConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] System config GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCSRFToken(csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    // Parse request body
    const body = await request.json();
    const oldConfig = { ...systemConfig };

    // Update configuration
    systemConfig = {
      ...systemConfig,
      ...body,
    };

    // Log the action
    await logAdminAction(adminUser, 'system_config_update', 'system', {
      oldData: oldConfig,
      newData: systemConfig,
      auditLevel: 'warning',
    });

    return NextResponse.json({
      config: systemConfig,
      message: 'System configuration updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] System config PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    );
  }
}
