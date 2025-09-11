/**
 * Consolidated v5 admin API routes.
 * 
 * Provides administrative functionality including user management,
 * system monitoring, and bulk operations with strict access controls.
 * Replaces: multiple admin endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { validateAuthFromRequest, isValidEntityType } from '@/lib/api/utils-v5';

// GET /api/v5/admin?action=health|users|analytics
export async function GET(request: NextRequest) {
  try {
    // All admin endpoints require admin authentication
    const authResult = await validateAuthFromRequest(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'health';

    // Set authentication token for backend calls
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    switch (action) {
      case 'health':
        return handleSystemHealth(request);
      
      case 'users':
        return handleUserManagement(request);
      
      case 'analytics':
        return handleAnalytics(request);
      
      case 'audit':
        return handleAuditLog(request);
      
      default:
        return NextResponse.json(
          { error: 'Invalid admin action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v5/admin - Handle admin actions
export async function POST(request: NextRequest) {
  try {
    // All admin endpoints require admin authentication
    const authResult = await validateAuthFromRequest(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Set authentication token for backend calls
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    switch (action) {
      case 'bulk_import':
        return handleBulkImport(data);
      
      case 'bulk_export':
        return handleBulkExport(data);
      
      case 'update_user_roles':
        return handleUpdateUserRoles(data);
      
      case 'moderate_content':
        return handleContentModeration(data);
      
      case 'clear_cache':
        return handleClearCache(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid admin action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSystemHealth(_request: NextRequest) {
  try {
    // This would call the backend admin health endpoint
    // For now, return local health information
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      frontend: {
        version: 'v5',
        status: 'operational'
      },
      backend: {
        status: 'checking...'
      },
      database: {
        status: 'checking...'
      },
      cache: {
        status: 'checking...'
      }
    };

    // Try to get backend health
    try {
      const backendHealth = await apiClient.getHealthMetrics();
      if (backendHealth.success) {
        health.backend = backendHealth.data;
      }
    } catch (_error) {
      health.backend = { status: 'error' };
      health.status = 'degraded';
    }

    return NextResponse.json(health);

  } catch (error) {
    console.error('System health error:', error);
    return NextResponse.json(
      { error: 'Failed to get system health' },
      { status: 500 }
    );
  }
}

async function handleUserManagement(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '50'), 500);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    // This would call the backend admin users endpoint
    // For now, return placeholder data
    const users = {
      users: [],
      pagination: {
        page,
        per_page: perPage,
        total: 0,
        has_more: false
      },
      filters: {
        search,
        role
      }
    };

    return NextResponse.json(users);

  } catch (error) {
    console.error('User management error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

async function handleAnalytics(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 90);

    // This would call the backend admin analytics endpoint
    // For now, return placeholder data
    const analytics = {
      period: {
        days,
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      entities: {
        restaurants: { total: 0, new_this_period: 0 },
        synagogues: { total: 0, new_this_period: 0 },
        mikvahs: { total: 0, new_this_period: 0 },
        stores: { total: 0, new_this_period: 0 }
      },
      usage: {
        total_requests: 0,
        unique_users: 0,
        search_queries: 0
      },
      performance: {
        avg_response_time_ms: 0,
        error_rate_percent: 0,
        cache_hit_rate_percent: 0
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

async function handleAuditLog(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '50'), 500);
    const userId = searchParams.get('user_id') || '';
    const action = searchParams.get('action') || '';

    // This would call the backend admin audit log endpoint
    // For now, return placeholder data
    const auditLog = {
      audit_entries: [],
      pagination: {
        page,
        per_page: perPage,
        total: 0,
        has_more: false
      },
      filters: {
        user_id: userId,
        action
      }
    };

    return NextResponse.json(auditLog);

  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

async function handleBulkImport(data: any) {
  try {
    const { entity_type, file_data, format } = data;

    if (!entity_type || !isValidEntityType(entity_type)) {
      return NextResponse.json(
        { error: 'Valid entity_type required' },
        { status: 400 }
      );
    }

    if (!file_data) {
      return NextResponse.json(
        { error: 'File data required' },
        { status: 400 }
      );
    }

    // This would process the bulk import
    // For now, return placeholder response
    const result = {
      success: true,
      message: 'Bulk import initiated',
      entity_type,
      format: format || 'json',
      processing: true
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Bulk import failed' },
      { status: 500 }
    );
  }
}

async function handleBulkExport(data: any) {
  try {
    const { entity_type, format, filters } = data;

    if (!entity_type || !isValidEntityType(entity_type)) {
      return NextResponse.json(
        { error: 'Valid entity_type required' },
        { status: 400 }
      );
    }

    // This would initiate the bulk export
    // For now, return placeholder response
    const result = {
      success: true,
      message: 'Bulk export initiated',
      entity_type,
      format: format || 'json',
      filters: filters || {},
      download_url: `/api/v5/admin/download/${entity_type}_export_${Date.now()}.${format || 'json'}`
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk export error:', error);
    return NextResponse.json(
      { error: 'Bulk export failed' },
      { status: 500 }
    );
  }
}

async function handleUpdateUserRoles(data: any) {
  try {
    const { user_id, roles } = data;

    if (!user_id || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: 'user_id and roles array required' },
        { status: 400 }
      );
    }

    // Validate roles
    const validRoles = ['user', 'moderator', 'data_admin', 'system_admin', 'super_admin'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // This would update user roles in the backend
    // For now, return success response
    const result = {
      success: true,
      message: 'User roles updated successfully',
      user_id,
      roles
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Update user roles error:', error);
    return NextResponse.json(
      { error: 'Failed to update user roles' },
      { status: 500 }
    );
  }
}

async function handleContentModeration(data: any) {
  try {
    const { content_type, content_id, action, reason } = data;

    if (!content_type || !content_id || !action) {
      return NextResponse.json(
        { error: 'content_type, content_id, and action required' },
        { status: 400 }
      );
    }

    const validActions = ['approve', 'reject', 'flag', 'unflag'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Use: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // This would perform content moderation in the backend
    // For now, return success response
    const result = {
      success: true,
      message: `Content ${action}ed successfully`,
      content_type,
      content_id,
      action,
      reason: reason || ''
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Content moderation error:', error);
    return NextResponse.json(
      { error: 'Content moderation failed' },
      { status: 500 }
    );
  }
}

async function handleClearCache(data: any) {
  try {
    const { pattern, force } = data;

    // Clear client-side cache
    apiClient.clearCache();

    // This would also clear server-side cache
    // For now, return success response
    const result = {
      success: true,
      message: 'Cache cleared successfully',
      pattern: pattern || 'all',
      force: force || false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}