import { NextRequest, NextResponse } from 'next/server';
import { adminLogger } from '@/lib/admin/logger';
import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { validateSignedCSRFToken } from '@/lib/admin/csrf';
import { exportAuditLogs } from '@/lib/admin/audit';
import { errorResponses } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return errorResponses.unauthorized();
    }

    if (!hasPermission(adminUser, ADMIN_PERMISSIONS.DATA_EXPORT)) {
      return errorResponses.forbidden();
    }

    const headerToken = request.headers.get('x-csrf-token');
    if (!headerToken || !validateSignedCSRFToken(headerToken, adminUser.id)) {
      return NextResponse.json({ error: 'Forbidden', code: 'CSRF' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const options: Record<string, any> = {};
    const keys = ['userId','action','entityType','entityId','auditLevel','startDate','endDate','correlationId'];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v) {options[k] = v;}
    });
    if (options.startDate) {options.startDate = new Date(options.startDate);}
    if (options.endDate) {options.endDate = new Date(options.endDate);}

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
  } catch (error) {
    adminLogger.error('Audit export error', { error: String(error) });
    return errorResponses.internalError();
  }
}
