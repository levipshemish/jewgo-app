/**
 * V5 Admin Audit API routes for Next.js.
 * 
 * Provides audit log endpoints for monitoring system activity
 * with consistent patterns, authentication, and monitoring.
 */

import { NextRequest } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { 
  validateAuthFromRequest, 
  createErrorResponse,
  createSuccessResponse,
  getCorrelationId
} from '@/lib/api/utils-v5';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const auth = validateAuthFromRequest(request);
    if (!auth.isValid) {
      return createErrorResponse(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      );
    }

    // Check if user has admin permissions
    if (!auth.userRoles?.includes('admin')) {
      return createErrorResponse(
        'Admin permissions required',
        403,
        'ADMIN_REQUIRED'
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build query parameters
    const queryParams: Record<string, string> = {
      limit,
      offset
    };

    if (action) queryParams.action = action;
    if (userId) queryParams.userId = userId;
    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;

    // Get audit logs from backend API
    const response = await apiClient.getAdminAuditLogs(queryParams, {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'X-Correlation-ID': getCorrelationId(request)
      }
    });

    if (!response.success) {
      return createErrorResponse(
        response.error || 'Failed to get audit logs',
        500,
        'AUDIT_FETCH_ERROR'
      );
    }

    return createSuccessResponse(response.data);

  } catch (error) {
    console.error('Admin audit GET error:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
}
