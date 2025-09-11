/**
 * V5 Admin Health API routes for Next.js.
 * 
 * Provides health check endpoints for monitoring system status
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

    // Get health status from backend API
    const response = await apiClient.getAdminHealth({
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'X-Correlation-ID': getCorrelationId(request)
      }
    });

    if (!response.success) {
      return createErrorResponse(
        response.error || 'Failed to get health status',
        500,
        'HEALTH_CHECK_ERROR'
      );
    }

    return createSuccessResponse(response.data);

  } catch (error) {
    console.error('Admin health GET error:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
}
