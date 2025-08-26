import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { exportAuditLogs } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 419 });
    }

    const { searchParams } = new URL(request.url);
    const options: Record<string, any> = {};
    const keys = ['userId','action','entityType','entityId','auditLevel','startDate','endDate','correlationId'];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v) options[k] = v;
    });
    if (options.startDate) options.startDate = new Date(options.startDate);
    if (options.endDate) options.endDate = new Date(options.endDate);

    const csvContent = await exportAuditLogs(options);

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Audit export error:', error);
    return NextResponse.json({ error: 'Failed to export audit logs' }, { status: 500 });
  }
}

