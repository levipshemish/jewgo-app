import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { requireSuperAdmin, withPermission } from '@/lib/server/rbac-middleware';

export const runtime = 'nodejs';

// Validation schemas
const RoleAssignmentSchema = z.object({
  action: z.literal('assign'),
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(['moderator', 'data_admin', 'system_admin', 'super_admin']),
  expires_at: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

const RoleRevocationSchema = z.object({
  action: z.literal('revoke'),
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(['moderator', 'data_admin', 'system_admin', 'super_admin']),
});

const RoleActionSchema = z.union([RoleAssignmentSchema, RoleRevocationSchema]);

const QuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1')),
  limit: z.string().optional().transform(val => parseInt(val || '50')),
  search: z.string().optional(),
  user_id: z.string().optional(),
  role: z.string().optional(),
  include_all: z.string().optional().transform(val => val === 'true'),
  include_expired: z.string().optional().transform(v => v === 'true'),
});

// GET handler - fetch users with roles
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    // Use RBAC middleware to ensure user has role management permissions
    const admin = await withPermission('role:manage')(request);
    
    // Add rate limiting for GET requests (dev safeguard only)
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_RATE_LIMITING === 'true') {
      const limiter = getLimiter();
      const key = `roles_get_${admin?.id || 'unknown'}`;
      if (!limiter.allow(key, 30, 60_000)) { // 30 requests per minute for GET
        return NextResponse.json({ success: false, error: 'Rate limit exceeded', message: 'Too many requests' }, { status: 429 });
      }
    }
    
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = QuerySchema.parse(queryParams);
    
    // Build backend URL with query parameters
    const backendUrl = new URL('/api/v4/admin/roles', process.env.BACKEND_URL || 'http://localhost:5000');
    Object.entries(validatedQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        backendUrl.searchParams.set(key, value.toString());
      }
    });
    
    try {
      // Forward request to backend with original Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authorization header required',
            message: 'No authorization header found',
            status_code: 401,
          },
          { status: 401 }
        );
      }

      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      const status = response.status;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = typeof payload === 'object' && payload ? payload : { error: 'Failed to fetch roles' };
        return NextResponse.json(
          {
            success: false,
            error: err.error || 'Failed to fetch roles',
            message: err.message || 'Request failed',
            status_code: status,
          },
          { status }
        );
      }

      // Normalize response to { success, data, message }
      if (payload && payload.success === true && payload.data) {
        return NextResponse.json(payload);
      }
      if (payload && typeof payload === 'object' && 'users' in payload) {
        return NextResponse.json({ success: true, data: payload, message: 'Success' });
      }
      return NextResponse.json({ success: true, data: payload, message: 'Success' });
      
          } catch (error) {
        console.error('Error fetching admin roles:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch admin roles',
            message: error instanceof Error ? error.message : 'Unknown error',
            status_code: 503,
          },
          { status: 503 }
        );
      }
  });
}

// POST handler - assign or revoke roles
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const admin = await requireSuperAdmin(request);
    // Simple in-memory per-admin rate limiter (dev safeguard only)
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_RATE_LIMITING === 'true') {
      const limiter = getLimiter();
      const key = `roles_post_${admin?.id || 'unknown'}`;
      if (!limiter.allow(key, 10, 60_000)) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded', message: 'Too many requests' }, { status: 429 });
      }
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedBody = RoleActionSchema.parse(body);
    
    // Determine backend endpoint based on action
    const endpoint = validatedBody.action === 'assign' ? 'assign' : 'revoke';
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v4/admin/roles/${endpoint}`;
    
    try {
      // Forward request to backend
      // Normalize expires_at to UTC
      const normalizedBody = {
        user_id: validatedBody.user_id,
        role: validatedBody.role,
        ...(validatedBody.action === 'assign' && {
          expires_at: validatedBody.expires_at ? new Date(validatedBody.expires_at).toISOString() : undefined,
          notes: (validatedBody as any).notes,
        }),
      };

      // Forward request to backend with original Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authorization header required',
            message: 'No authorization header found',
            status_code: 401,
          },
          { status: 401 }
        );
      }

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedBody),
      });
      
      if (!response.ok) {
        const status = response.status;
        const payload = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        // Ensure clear 403 messaging alignment
        if (status === 403) {
          return NextResponse.json(
            {
              success: false,
              error: payload?.error || 'Insufficient permissions: super_admin role required',
              message: payload?.message || 'Forbidden',
              status_code: status,
            },
            { status }
          );
        }
        return NextResponse.json(
          {
            success: false,
            error: payload?.error || `Request failed: ${status}`,
            message: payload?.message || 'Request failed',
            status_code: status,
          },
          { status }
        );
      }
      
      const data = await response.json();
      
      // Return backend response directly since it already has the correct format
      return NextResponse.json(data);
      
    } catch (error) {
      console.error(`Error ${validatedBody.action}ing role:`, error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to ${validatedBody.action} role`,
          message: error instanceof Error ? error.message : 'Unknown error',
          status_code: 503,
        },
        { status: 503 }
      );
    }
  });
}

// Minimal in-memory rate limiter (dev safeguard only - production should use WAF)
function getLimiter() {
  const store: Record<string, { count: number; ts: number }> = (global as any).__ADMIN_ROLES_LIMITER__ || {};
  (global as any).__ADMIN_ROLES_LIMITER__ = store;
  return {
    allow(key: string, max: number, windowMs: number) {
      const now = Date.now();
      const entry = store[key] || { count: 0, ts: now };
      if (now - entry.ts > windowMs) {
        entry.count = 0;
        entry.ts = now;
      }
      entry.count += 1;
      store[key] = entry;
      return entry.count <= max;
    },
  };
}
