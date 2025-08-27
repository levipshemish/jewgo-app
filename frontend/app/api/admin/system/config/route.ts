import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { corsHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return system configuration (stubbed for now)
    return NextResponse.json({
      maintenanceMode: false,
      debugMode: process.env.NODE_ENV === 'development',
      emailNotifications: true,
      auditLogging: true,
      rateLimiting: true,
      backupFrequency: 'daily',
      sessionTimeout: 3600,
      maxFileSize: 5242880, // 5MB
    });
  } catch (error) {
    console.error('[ADMIN] System config error:', error);
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

    // Parse request body
    const configData = await request.json();

    // Validate config data
    if (!configData || typeof configData !== 'object') {
      return NextResponse.json({ error: 'Invalid configuration data' }, { status: 400 });
    }

    // Return success (stubbed for now)
    return NextResponse.json({
      message: 'Configuration updated successfully',
      config: configData,
    });
  } catch (error) {
    console.error('[ADMIN] System config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}
