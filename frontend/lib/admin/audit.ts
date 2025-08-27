/* eslint-disable no-console */
import { prisma } from '@/lib/db/prisma';
import { AdminUser } from './types';

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
  user?: {
    email: string;
    name?: string;
  };
}

// Audit levels
export const AUDIT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

// Entity types enum for consistent audit logging
export const ENTITY_TYPES = {
  RESTAURANT: 'restaurant',
  REVIEW: 'review',
  USER: 'user',
  RESTAURANT_IMAGE: 'restaurant_image',
  ADMIN_ROLE: 'admin_role',
  SYSTEM: 'system',
  SYNAGOGUE: 'synagogue',
  KOSHER_PLACE: 'kosher_place',
  AUDIT_LOG: 'audit_log',
} as const;

// Predefined audit field allowlists for common entities
export const AUDIT_FIELD_ALLOWLISTS = {
  RESTAURANT: ['id', 'name', 'city', 'state', 'status', 'submission_status', 'approval_date', 'rejection_reason'] as string[],
  REVIEW: ['id', 'restaurant_id', 'rating', 'title', 'status', 'moderator_notes'] as string[],
  USER: ['id', 'email', 'name', 'isSuperAdmin', 'createdAt', 'updatedAt'] as string[],
  SYSTEM: ['key', 'value', 'updatedAt'] as string[],
  RESTAURANT_IMAGE: ['id', 'restaurant_id', 'image_order', 'image_url', 'cloudinary_public_id'] as string[],
  MARKETPLACE: ['id', 'name', 'title', 'vendor_name', 'category', 'status', 'price', 'location'] as string[],
  SYNAGOGUE: ['id', 'name', 'city', 'state', 'address', 'phone', 'affiliation'] as string[],
  ADMIN_ROLE: ['id', 'userId', 'role', 'assignedAt', 'expiresAt', 'isActive'] as string[],
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
    whitelistFields?: string[];
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
      whitelistFields = [],
    } = options;

    // Sanitize sensitive data with optional whitelist
    const sanitizedOldData = truncateForAudit(sanitizeDataWithWhitelist(oldData, whitelistFields));
    const sanitizedNewData = truncateForAudit(sanitizeDataWithWhitelist(newData, whitelistFields));
    const sanitizedMetadata = truncateForAudit(sanitizeData(metadata));

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        entityType,
        entityId,
        oldData: sanitizedOldData ? JSON.stringify(sanitizedOldData) : null,
        newData: sanitizedNewData ? JSON.stringify(sanitizedNewData) : null,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        sessionId,
        correlationId,
        auditLevel,
        metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
      },
    });

    // Log to console for development/debugging
    console.log(`[AUDIT] ${action} by ${user.email} on ${entityType}${entityId ? ` (${entityId})` : ''}`);
  } catch (error) {
    // Don't fail the operation if audit logging fails
    console.error('[AUDIT] Failed to log admin action:', error);
  }
}

/**
 * Sanitize sensitive data for audit logs with optional whitelist
 */
export function sanitizeDataWithWhitelist(data: any, whitelistFields: string[] = []): any {
  if (!data) {return data;}

  const sensitiveFields = [
    'password', 'token', 'refresh_token', 'access_token', 'secret',
    'api_key', 'private_key', 'credit_card', 'ssn', 'social_security',
    // Common PII fields (extendable)
    'email', 'user_email', 'owner_email', 'business_email', 'phone', 'owner_phone', 'phone_number'
  ];

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = { ...data };
    
    // If whitelist is provided, only include those fields and redact the rest
    if (whitelistFields.length > 0) {
      const whitelistedData: Record<string, any> = {};
      for (const field of whitelistFields) {
        if (sanitized[field] !== undefined) {
          whitelistedData[field] = sanitized[field];
        }
      }
      return whitelistedData;
    }
    
    // Otherwise, redact known sensitive fields at the top level
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    // Do not include nested objects/arrays in audit payloads to avoid leaking data
    Object.keys(sanitized).forEach((k) => {
      const v = sanitized[k];
      if (v && typeof v === 'object') {
        sanitized[k] = '[REDACTED_OBJECT]';
      }
    });
    return sanitized;
  }

  return data;
}

/**
 * Sanitize sensitive data for audit logs (legacy function)
 */
export function sanitizeData(data: any): any {
  if (!data) {return data;}

  const sensitiveFields = [
    'password', 'token', 'refresh_token', 'access_token', 'secret',
    'api_key', 'private_key', 'credit_card', 'ssn', 'social_security',
    // Common PII fields (extendable)
    'email', 'user_email', 'owner_email', 'business_email', 'phone', 'owner_phone', 'phone_number'
  ];

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = { ...data };
    // Redact known sensitive fields at the top level
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    // Do not include nested objects/arrays in audit payloads to avoid leaking data
    Object.keys(sanitized).forEach((k) => {
      const v = sanitized[k];
      if (v && typeof v === 'object') {
        sanitized[k] = '[REDACTED_OBJECT]';
      }
    });
    return sanitized;
  }

  return data;
}

/**
 * Query audit logs with filtering and pagination
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
  const {
    userId,
    action,
    entityType,
    entityId,
    auditLevel,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
    correlationId,
  } = options;

  // Build where clause
  const where: any = {};
  
  if (userId) {where.userId = userId;}
  if (action) {where.action = action;}
  if (entityType) {where.entityType = entityType;}
  if (entityId) {where.entityId = entityId;}
  if (auditLevel) {where.auditLevel = auditLevel;}
  if (correlationId) {where.correlationId = correlationId;}
  
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {where.timestamp.gte = startDate;}
    if (endDate) {where.timestamp.lte = endDate;}
  }

  // Get total count
  const total = await prisma.auditLog.count({ where });

  // Get paginated results
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  return {
    logs: logs.map(log => ({
      ...log,
      entityId: log.entityId || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      sessionId: log.sessionId || undefined,
      correlationId: log.correlationId || undefined,
      auditLevel: log.auditLevel as 'info' | 'warning' | 'critical',
      user: log.user ? {
        email: log.user.email,
        name: log.user.name || undefined,
      } : undefined,
      oldData: log.oldData ? JSON.parse(log.oldData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Get audit log statistics
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
  const { startDate, endDate, userId } = options;

  // Build where clause
  const where: any = {};
  if (userId) {where.userId = userId;}
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {where.timestamp.gte = startDate;}
    if (endDate) {where.timestamp.lte = endDate;}
  }

  // Get total count
  const totalLogs = await prisma.auditLog.count({ where });

  // Get logs by level
  const logsByLevel = await prisma.auditLog.groupBy({
    by: ['auditLevel'],
    where,
    _count: { auditLevel: true },
  });

  // Get logs by action
  const logsByAction = await prisma.auditLog.groupBy({
    by: ['action'],
    where,
    _count: { action: true },
  });

  // Get logs by user
  const logsByUser = await prisma.auditLog.groupBy({
    by: ['userId'],
    where,
    _count: { userId: true },
  });

  // Get recent activity
  const recentActivity = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  return {
    totalLogs,
    logsByLevel: Object.fromEntries(
      logsByLevel.map(item => [item.auditLevel, item._count.auditLevel])
    ),
    logsByAction: Object.fromEntries(
      logsByAction.map(item => [item.action, item._count.action])
    ),
    logsByUser: Object.fromEntries(
      logsByUser.map(item => [item.userId, item._count.userId])
    ),
    recentActivity: recentActivity.map(log => ({
      ...log,
      entityId: log.entityId || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      sessionId: log.sessionId || undefined,
      correlationId: log.correlationId || undefined,
      auditLevel: log.auditLevel as 'info' | 'warning' | 'critical',
      user: log.user ? {
        email: log.user.email,
        name: log.user.name || undefined,
      } : undefined,
      oldData: log.oldData ? JSON.parse(log.oldData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    })),
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
 * Export audit logs to CSV with streaming support
 */
export async function exportAuditLogs(options: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  entityType?: string;
} = {}): Promise<{ csvContent: string; stream?: ReadableStream }> {
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

  // For large datasets, return a stream with backpressure control
  if (logs.length > 1000) {
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(csvHeaders.map(field => `"${field}"`).join(',') + '\n');
        
        const CHUNK_SIZE = 100; // Process 100 rows at a time
        let processed = 0;
        
        for (const log of logs) {
          const row = [
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
          ].map(field => `"${field}"`).join(',');
          
          controller.enqueue(row + '\n');
          processed++;
          
          // Add backpressure control every CHUNK_SIZE rows
          if (processed % CHUNK_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        controller.close();
      },
    });
    
    return { csvContent, stream };
  }

  return { csvContent };
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


export function truncateForAudit(obj: any, maxLen = 4000): any {
  try {
    if (!obj) {return obj;}
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (str.length <= maxLen) {return obj;}
    if (typeof obj === 'string') {return `${str.slice(0, maxLen)  }...`;}
    return { truncated: true, preview: str.slice(0, maxLen) };
  } catch {
    return obj;
  }
}
