import { PrismaClient } from '@prisma/client';
import { AdminUser } from './auth';

// Audit log interface
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  auditLevel: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

// Audit levels
export const AUDIT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  
  // Restaurant operations
  RESTAURANT_CREATE: 'restaurant_create',
  RESTAURANT_UPDATE: 'restaurant_update',
  RESTAURANT_DELETE: 'restaurant_delete',
  RESTAURANT_APPROVE: 'restaurant_approve',
  RESTAURANT_REJECT: 'restaurant_reject',
  
  // Review operations
  REVIEW_CREATE: 'review_create',
  REVIEW_UPDATE: 'review_update',
  REVIEW_DELETE: 'review_delete',
  REVIEW_MODERATE: 'review_moderate',
  REVIEW_FLAG: 'review_flag',
  
  // User operations
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ROLE_CHANGE: 'user_role_change',
  
  // System operations
  SYSTEM_SETTING_CHANGE: 'system_setting_change',
  BULK_OPERATION: 'bulk_operation',
  DATA_EXPORT: 'data_export',
  AUDIT_LOG_VIEW: 'audit_log_view',
  AUDIT_LOG_DELETE: 'audit_log_delete',
} as const;

// Prisma client instance
const prisma = new PrismaClient();

/**
 * Log admin action with comprehensive audit trail
 */
export async function logAdminAction(
  user: AdminUser,
  action: string,
  entityType: string,
  options: {
    entityId?: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
    auditLevel?: 'info' | 'warning' | 'critical';
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const {
      entityId,
      oldData,
      newData,
      ipAddress,
      userAgent,
      sessionId,
      correlationId,
      auditLevel = 'info',
      metadata = {},
    } = options;

    // Sanitize sensitive data
    const sanitizedOldData = sanitizeData(oldData);
    const sanitizedNewData = sanitizeData(newData);

    // Create audit log entry
    // TODO: Add auditLog model to Prisma schema
    // await prisma.auditLog.create({
    //   data: {
    //     userId: user.id,
    //     action,
    //     entityType,
    //     entityId,
    //     oldData: sanitizedOldData ? JSON.stringify(sanitizedOldData) : null,
    //     newData: sanitizedNewData ? JSON.stringify(sanitizedNewData) : null,
    //     timestamp: new Date(),
    //     ipAddress,
    //     userAgent,
    //     sessionId,
    //     correlationId,
    //     auditLevel,
    //     metadata: metadata ? JSON.stringify(metadata) : null,
    //   },
    // });

    // Log to console for development/debugging
    console.log(`[AUDIT] ${action} by ${user.email} on ${entityType}${entityId ? ` (${entityId})` : ''}`);
  } catch (error) {
    // Don't fail the operation if audit logging fails
    console.error('[AUDIT] Failed to log admin action:', error);
  }
}

/**
 * Sanitize sensitive data for audit logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    'password', 'token', 'refresh_token', 'access_token', 'secret',
    'api_key', 'private_key', 'credit_card', 'ssn', 'social_security'
  ];

  if (typeof data === 'object') {
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  return data;
}

/**
 * Query audit logs with filtering and pagination
 * TODO: Add auditLog model to Prisma schema
 */
export async function queryAuditLogs(options: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  auditLevel?: 'info' | 'warning' | 'critical';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  correlationId?: string;
} = {}): Promise<{
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}> {
  // TODO: Implement when auditLog model is added to Prisma schema
  return {
    logs: [],
    total: 0,
    page: 1,
    pageSize: 50,
  };
}

/**
 * Get audit log statistics
 * TODO: Add auditLog model to Prisma schema
 */
export async function getAuditStats(options: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
} = {}): Promise<{
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByAction: Record<string, number>;
  logsByUser: Record<string, number>;
  recentActivity: AuditLog[];
}> {
  // TODO: Implement when auditLog model is added to Prisma schema
  return {
    totalLogs: 0,
    logsByLevel: {},
    logsByAction: {},
    logsByUser: {},
    recentActivity: [],
  };
}

/**
 * Clean up old audit logs based on retention policy
 */
export async function cleanupAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`[AUDIT] Cleaned up ${result.count} audit logs older than ${retentionDays} days`);
  return result.count;
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(options: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  entityType?: string;
} = {}): Promise<string> {
  const { logs } = await queryAuditLogs({ ...options, pageSize: 10000 });

  // Convert to CSV format
  const csvHeaders = [
    'Timestamp',
    'User ID',
    'User Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'Audit Level',
    'IP Address',
    'User Agent',
    'Correlation ID',
  ];

  const csvRows = logs.map(log => [
    log.timestamp.toISOString(),
    log.userId,
    log.user?.email || '',
    log.action,
    log.entityType,
    log.entityId || '',
    log.auditLevel,
    log.ipAddress || '',
    log.userAgent || '',
    log.correlationId || '',
  ]);

  const csvContent = [csvHeaders, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log bulk operation with progress tracking
 */
export async function logBulkOperation(
  user: AdminUser,
  operation: string,
  entityType: string,
  totalItems: number,
  options: {
    correlationId?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<string> {
  const correlationId = options.correlationId || generateCorrelationId();
  
  await logAdminAction(user, operation, entityType, {
    entityId: correlationId,
    auditLevel: 'info',
    correlationId,
    metadata: {
      ...options.metadata,
      totalItems,
      operationType: 'bulk',
    },
  });

  return correlationId;
}

/**
 * Log bulk operation progress
 */
export async function logBulkProgress(
  correlationId: string,
  processedItems: number,
  totalItems: number,
  errors: string[] = []
): Promise<void> {
  try {
    await prisma.auditLog.updateMany({
      where: { correlationId },
      data: {
        metadata: JSON.stringify({
          processedItems,
          totalItems,
          progress: Math.round((processedItems / totalItems) * 100),
          errors,
          lastUpdated: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('[AUDIT] Failed to log bulk progress:', error);
  }
}
