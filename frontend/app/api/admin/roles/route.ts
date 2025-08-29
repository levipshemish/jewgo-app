import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { requireSuperAdmin } from '@/lib/server/rbac-middleware';

export const runtime = 'nodejs';

// Validation schemas
const RoleAssignmentSchema = z.object({
  action: z.literal('assign'),
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(['moderator', 'data_admin', 'system_admin', 'super_admin']),
  expires_at: z.string().optional(),
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
});

// GET handler - fetch users with roles
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(request);
    
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
      // Forward request to backend
      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const status = response.status;
        const payload = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        return NextResponse.json(payload, { status });
      }
      
      const data = await response.json();
      
      // Return backend response directly since it already has the correct format
      return NextResponse.json(data);
      
    } catch (error) {
      console.error('Error fetching admin roles:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch admin roles',
          details: error instanceof Error ? error.message : 'Unknown error',
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
    
    // Parse and validate request body
    const body = await request.json();
    const validatedBody = RoleActionSchema.parse(body);
    
    // Determine backend endpoint based on action
    const endpoint = validatedBody.action === 'assign' ? 'assign' : 'revoke';
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v4/admin/roles/${endpoint}`;
    
    try {
      // Forward request to backend
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: validatedBody.user_id,
          role: validatedBody.role,
          ...(validatedBody.action === 'assign' && {
            expires_at: validatedBody.expires_at,
            notes: validatedBody.notes,
          }),
        }),
      });
      
      if (!response.ok) {
        const status = response.status;
        const payload = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        return NextResponse.json(payload, { status });
      }
      
      const data = await response.json();
      
      // Return backend response directly since it already has the correct format
      return NextResponse.json(data);
      
    } catch (error) {
      console.error(`Error ${validatedBody.action}ing role:`, error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient permissions for this operation',
            },
            { status: 403 }
          );
        }
        
        if (error.message.includes('400')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid request data',
              details: error.message,
            },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to ${validatedBody.action} role`,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 503 }
      );
    }
  });
}
