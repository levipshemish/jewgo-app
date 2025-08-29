import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { queryAuditLogs, exportAuditLogs } from '@/lib/admin/audit';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.AUDIT_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const auditLevel = searchParams.get('auditLevel') as 'info' | 'warning' | 'critical' || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const correlationId = searchParams.get('correlationId') || undefined;

    // Query audit logs
    const result = await queryAuditLogs({
      userId,
      action,
      entityType,
      entityId,
      auditLevel,
      startDate,
      endDate,
      page,
      pageSize,
      correlationId,
    });

    // Normalize response to match UI expectations
    return NextResponse.json({
      logs: result.logs,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasNext: result.page < Math.ceil(result.total / result.pageSize),
        hasPrev: result.page > 1,
      },
    });
  } catch (error) {
    adminLogger.error('Audit log query error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for export operations
    const rateLimitResult = await rateLimit(RATE_LIMITS.STRICT)(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate CSRF token via header only
    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    const body = await request.json();
    const { format = 'csv', ...options } = body || {};

    if (format === 'json') {
      const result = await (await import('@/lib/admin/audit')).queryAuditLogs({ ...options, pageSize: 10000 });
      return NextResponse.json({ logs: result.logs, total: result.total });
    }

    if (format === 'csv') {
      const result = await exportAuditLogs(options);

      // Use streaming for large datasets
      if (result.stream) {
        return new NextResponse(result.stream, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
            'Transfer-Encoding': 'chunked',
          },
        });
      }

      return new NextResponse(result.csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    adminLogger.error('Audit log export error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
