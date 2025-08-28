import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { prisma } from '@/lib/db/prisma';
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get system configuration from database
    const config = await prisma.adminConfig.findFirst();
    
    if (!config) {
      // Return default configuration if none exists
      return NextResponse.json({
        maintenanceMode: false,
        debugMode: false,
        emailNotifications: true,
        auditLogging: true,
        rateLimiting: true,
        backupFrequency: 'daily',
        sessionTimeout: 60,
        maxFileSize: 10,
      });
    }

    return NextResponse.json(config);
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
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    // Parse request body
    const configData = await request.json();

    // Validate required fields
    const requiredFields = [
      'maintenanceMode', 'debugMode', 'emailNotifications', 
      'auditLogging', 'rateLimiting', 'backupFrequency', 
      'sessionTimeout', 'maxFileSize'
    ];

    for (const field of requiredFields) {
      if (!(field in configData)) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Update or create configuration
    const updatedConfig = await prisma.adminConfig.upsert({
      where: { id: 1 }, // Assuming single config record
      update: {
        maintenanceMode: configData.maintenanceMode,
        debugMode: configData.debugMode,
        emailNotifications: configData.emailNotifications,
        auditLogging: configData.auditLogging,
        rateLimiting: configData.rateLimiting,
        backupFrequency: configData.backupFrequency,
        sessionTimeout: configData.sessionTimeout,
        maxFileSize: configData.maxFileSize,
        updatedAt: new Date(),
      },
      create: {
        id: 1,
        maintenanceMode: configData.maintenanceMode,
        debugMode: configData.debugMode,
        emailNotifications: configData.emailNotifications,
        auditLogging: configData.auditLogging,
        rateLimiting: configData.rateLimiting,
        backupFrequency: configData.backupFrequency,
        sessionTimeout: configData.sessionTimeout,
        maxFileSize: configData.maxFileSize,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the action
    await logAdminAction(adminUser, AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, 'system', {
      metadata: {
        changes: configData,
        previousConfig: await prisma.adminConfig.findFirst()
      }
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('[ADMIN] System config PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
