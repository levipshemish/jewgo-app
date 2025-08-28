import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { logAdminAction, ENTITY_TYPES, AUDIT_ACTIONS } from '@/lib/admin/audit';
import { prisma } from '@/lib/db/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';
import { AdminErrors } from '@/lib/admin/errors';

// CORS headers helper
const corsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
  };
};

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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_VIEW)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Get system configuration
    const configs = await prisma.adminConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const configObject = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(configObject);

  } catch (error) {
    console.error('[ADMIN] Get system config error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to get system config: ${error instanceof Error ? error.message : String(error)}`);
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
      return AdminErrors.UNAUTHORIZED();
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.SYSTEM_EDIT)) {
      return AdminErrors.INSUFFICIENT_PERMISSIONS();
    }

    // Validate CSRF token
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return AdminErrors.CSRF_INVALID();
    }

    // Parse request body
    const body = await request.json();
    const configUpdates = body.config || {};

    // Get current config for audit
    const currentConfigs = await prisma.adminConfig.findMany();
    const currentConfigObject = currentConfigs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, any>);

    // Update configurations
    const updatedConfigs = [];
    for (const [key, value] of Object.entries(configUpdates)) {
      const updatedConfig = await prisma.adminConfig.upsert({
        where: { key },
        update: { value: String(value), updated_at: new Date() },
        create: { key, value: String(value) },
      });
      updatedConfigs.push(updatedConfig);
    }

    // Log the config changes
    await logAdminAction(adminUser, AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE, ENTITY_TYPES.SYSTEM, {
      oldData: currentConfigObject,
      newData: { ...currentConfigObject, ...configUpdates },
      metadata: { changedKeys: Object.keys(configUpdates) },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'System configuration updated successfully',
      data: updatedConfigs 
    });

  } catch (error) {
    console.error('[ADMIN] Update system config error:', error);
    return AdminErrors.INTERNAL_ERROR(`Failed to update system config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
