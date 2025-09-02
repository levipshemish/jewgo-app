import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/admin-auth';
import { hasPermission } from '@/lib/server/admin-utils';
import { ADMIN_PERMISSIONS } from '@/lib/server/admin-constants';
import { queryAuditLogs } from '@/lib/admin/audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!hasPermission(admin, ADMIN_PERMISSIONS.AUDIT_VIEW)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pageSize = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '10'), 50));
  const roleScope = searchParams.get('roleScope') || undefined;

  const stream = new ReadableStream<string>({
    start(controller) {
      let closed = false;

      async function pushOnce() {
        const opts: any = { page: 1, pageSize };
        if (roleScope === 'self') {
          // admin is guaranteed to be non-null here due to the check above
          opts.userId = admin!.id;
        } else if (roleScope === 'store') {
          opts.entityType = 'marketplace';
        }
        try {
          const { logs } = await queryAuditLogs(opts);
          const payload = JSON.stringify(logs);
          controller.enqueue(`event: message\n`);
          controller.enqueue(`data: ${payload}\n\n`);
        } catch (_err) {
          controller.enqueue(`event: error\n`);
          controller.enqueue(`data: ${JSON.stringify({ error: 'query_failed' })}\n\n`);
        }
      }

      // initial push and interval
      pushOnce();
      const interval = setInterval(pushOnce, 5000);

      // Close handler
      const close = () => {
        if (!closed) {
          closed = true;
          clearInterval(interval);
          controller.close();
        }
      };

      // Abort support
      (request as any).signal?.addEventListener?.('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

