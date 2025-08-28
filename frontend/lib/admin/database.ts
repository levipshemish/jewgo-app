import { prisma } from '@/lib/db/prisma';
import { AdminUser } from './types';
import { logAdminAction, AUDIT_ACTIONS } from './audit';

// Constants for submission status
const PENDING_STATUS = 'pending_approval';

/**
 * Helper function to translate entity type and operation to audit action
 */
function getAuditAction(entityType: string, operation: string): string {
  const entityKey = entityType.toUpperCase().replace(/[^A-Z]/g, '_');
  const operationKey = operation.toUpperCase();
  
  const actionKey = `${entityKey}_${operationKey}` as keyof typeof AUDIT_ACTIONS;
  
  if (actionKey in AUDIT_ACTIONS) {
    return AUDIT_ACTIONS[actionKey];
  }
  
  // Fallback to generic action
  return `${entityType}_${operation}`;
}

// Pagination interface
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filter options
export interface SearchOptions {
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Entity configuration
const ENTITY_CONFIG = {
  restaurant: {
    softDelete: true,
    softDeleteField: 'deleted_at',
    defaultSortBy: 'created_at',
    searchFields: ['name', 'address', 'city', 'state', 'phone_number'],
  },
  review: {
    // Reviews table does not have a deleted_at column; disable soft delete
    softDelete: false,
    softDeleteField: 'deleted_at',
    defaultSortBy: 'created_at',
    searchFields: ['content', 'title', 'user_name'],
  },
  user: {
    softDelete: true,
    softDeleteField: 'deletedAt',
    defaultSortBy: 'createdat',
    searchFields: ['email', 'name'],
  },
  restaurantImage: {
    // Restaurant images table does not have a deleted_at column; disable soft delete
    softDelete: false,
    softDeleteField: 'deleted_at',
    defaultSortBy: 'created_at',
    searchFields: ['image_url', 'cloudinary_public_id'],
  },
  marketplace: {
    softDelete: false,
    softDeleteField: 'deleted_at',
    defaultSortBy: 'created_at',
    searchFields: ['name', 'title', 'vendor_name', 'location', 'category', 'status'],
  },
} as const;

function applySoftDeleteFilter(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace', where: any) {
  const config = (ENTITY_CONFIG as any)[modelKey];
  if (config?.softDelete && config.softDeleteField) {
    where[config.softDeleteField] = null;
  }
}

// Generic CRUD operations
export class AdminDatabaseService {
  /**
   * Get search fields for a model
   */
  static getSearchFields(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace'): string[] {
    return [...ENTITY_CONFIG[modelKey].searchFields];
  }

  /**
   * Get default sort field for a model
   */
  static getDefaultSortField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace'): string {
    return ENTITY_CONFIG[modelKey].defaultSortBy;
  }

  /**
   * Get valid sort fields for a model
   */
  static getValidSortFields(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace'): string[] {
    const validFields: Record<string, string[]> = {
      restaurant: [
        'id', 'name', 'address', 'city', 'state', 'created_at', 'updated_at', 
        'status', 'submission_status', 'approval_date', 'submission_date',
        'phone_number', 'kosher_category', 'certifying_agency',
        'google_rating', 'google_review_count'
      ],
      review: [
        'id', 'rating', 'created_at', 'updated_at', 'status', 'helpful_count',
        'report_count', 'user_name', 'user_email', 'restaurant_id'
      ],
      user: [
        'id', 'email', 'name', 'createdat', 'updatedat', 'issuperadmin',
        'emailverified', 'image'
      ],
      restaurantImage: [
        'id', 'image_order', 'created_at', 'updated_at', 'restaurant_id',
        'image_url', 'cloudinary_public_id'
      ],
      marketplace: [
        'id','created_at','updated_at','name','title','price','category','location','vendor_name','city','state','zip_code','rating','review_count','status','priority'
      ],
    };
    return validFields[modelKey] || [];
  }

  /**
   * Validate sort field for a model
   */
  static validateSortField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace', sortBy: string): boolean {
    const validFields = this.getValidSortFields(modelKey);
    return validFields.includes(sortBy);
  }

  /**
   * Check if model supports soft delete
   */
  static supportsSoftDelete(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace'): boolean {
    return ENTITY_CONFIG[modelKey].softDelete;
  }

  /**
   * Get soft delete field for a model
   */
  static getSoftDeleteField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace'): string | null {
    const config = ENTITY_CONFIG[modelKey];
    return config.softDelete ? config.softDeleteField : null;
  }

  /**
   * Get paginated data with search and filtering
   */
  static async getPaginatedData<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    options: PaginationOptions & SearchOptions,
    include?: any
  ): Promise<PaginatedResult<T>> {
    const { page, pageSize, search, filters, sortBy, sortOrder } = options;

    // Build where clause
    const where: any = {};
    
    if (filters) {
      Object.assign(where, filters);
    }

    // Exclude soft-deleted rows by default
    applySoftDeleteFilter(modelKey, where);

    if (search) {
      // Add search conditions based on model
      const searchFields = this.getSearchFields(modelKey);
      if (searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
          [field]: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }));
      }
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy) {
      // Validate sort field
      if (!this.validateSortField(modelKey, sortBy)) {
        throw new Error(`Invalid sort field: ${sortBy} for model: ${modelKey}`);
      }
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      // Use default sort field based on model
      const defaultSortField = this.getDefaultSortField(modelKey);
      orderBy[defaultSortField] = 'desc';
    }

    // Get total count
    const total = await delegate.count({ where });

    // Get paginated data
    // Build options object without undefined properties (e.g. include)
    const findOptions: any = {
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
    if (typeof include !== 'undefined') {
      findOptions.include = include;
    }

    let data: T[];
    try {
      data = await delegate.findMany(findOptions);
    } catch (err: any) {
      // Prisma P2022: Column for the selected field does not exist in DB.
      // Fall back to a safe default ordering by primary key `id`.
      if (err && typeof err === 'object' && err.code === 'P2022') {
        try {
          const fallbackOptions = { ...findOptions, orderBy: { id: sortOrder || 'desc' } };
          data = await delegate.findMany(fallbackOptions);
          // eslint-disable-next-line no-console
          console.warn(
            `[ADMIN] getPaginatedData fallback to orderBy.id due to P2022 on model ${modelKey}. Original orderBy: ${JSON.stringify(orderBy)}`
          );
        } catch (fallbackErr) {
          // Re-throw fallback error if it also fails
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Create a new record
   */
  static async createRecord<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    data: any,
    user: AdminUser,
    entityType: string
  ): Promise<T> {
    try {
      const result = await delegate.create({
        data,
      });

      // Log the action
      await logAdminAction(user, getAuditAction(entityType, 'create'), entityType, {
        entityId: result.id.toString(),
        newData: result,
      });

      return result;
    } catch (error) {
      console.error(`[ADMIN] Failed to create ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Update a record
   */
  static async updateRecord<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    id: string | number,
    data: any,
    user: AdminUser,
    entityType: string
  ): Promise<T> {
    try {
      // Get old data for audit
      const oldData = await delegate.findUnique({
        where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
      });

      const result = await delegate.update({
        where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
        data,
      });

      // Log the action
      await logAdminAction(user, getAuditAction(entityType, 'update'), entityType, {
        entityId: id.toString(),
        oldData,
        newData: result,
      });

      return result;
    } catch (error) {
      console.error(`[ADMIN] Failed to update ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record (soft delete if supported)
   */
  static async deleteRecord<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    id: string | number,
    user: AdminUser,
    entityType: string,
    softDelete: boolean = true
  ): Promise<T> {
    try {
      // Get old data for audit
      const oldData = await delegate.findUnique({
        where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
      });

      let result: T;

      if (softDelete && this.supportsSoftDelete(modelKey)) {
        // Soft delete
        const softDeleteField = this.getSoftDeleteField(modelKey);
        if (softDeleteField) {
          result = await delegate.update({
            where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
            data: { [softDeleteField]: new Date() },
          });
        } else {
          // Fallback to hard delete if soft delete field not configured
          result = await delegate.delete({
            where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
          });
        }
      } else {
        // Hard delete
        result = await delegate.delete({
          where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
        });
      }

      // Log the action
      await logAdminAction(user, getAuditAction(entityType, 'delete'), entityType, {
        entityId: id.toString(),
        oldData,
        auditLevel: 'warning',
      });

      return result;
    } catch (error) {
      console.error(`[ADMIN] Failed to delete ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Bulk operations with transaction support
   */
  static async bulkOperation<T>(params: {
    operation: 'create' | 'update' | 'delete';
    delegate: any;
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace';
    data: any[];
    user: AdminUser;
    entityType: string;
    options?: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    };
    correlationId?: string;
  }): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const { operation, delegate, modelKey, data, user, entityType, options = {}, correlationId } = params;
    const { batchSize = 100, onProgress } = options;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        await prisma.$transaction(async (tx) => {
          for (const item of batch) {
            try {
              switch (operation) {
                case 'create':
                  await (tx[modelKey] as any).create({ data: item });
                  break;
                case 'update':
                  await (tx[modelKey] as any).update({
                    where: { id: item.id },
                    data: item,
                  });
                  break;
                case 'delete':
                  if (this.supportsSoftDelete(modelKey)) {
                    const softDeleteField = this.getSoftDeleteField(modelKey);
                    if (softDeleteField) {
                      await (tx[modelKey] as any).update({
                        where: { id: item.id },
                        data: { [softDeleteField]: new Date() },
                      });
                    } else {
                      await (tx[modelKey] as any).delete({
                        where: { id: item.id },
                      });
                    }
                  } else {
                    await (tx[modelKey] as any).delete({
                      where: { id: item.id },
                    });
                  }
                  break;
              }
              success++;
            } catch (error) {
              failed++;
              const errorMessage = error && typeof error === 'object' && 'message' in error 
                ? (error as any).message 
                : 'Unknown error';
              errors.push(`Item ${item.id}: ${errorMessage}`);
            }
          }
        });

        // Report progress
        if (onProgress) {
          onProgress(i + batch.length, data.length);
        }
      }

      // Log bulk operation
      await logAdminAction(user, AUDIT_ACTIONS.BULK_OPERATION, entityType, {
        auditLevel: 'info',
        correlationId,
        metadata: {
          operation,
          totalItems: data.length,
          success,
          failed,
          errors: errors.slice(0, 10), // Log first 10 errors
        },
      });

      return { success, failed, errors };
    } catch (error) {
      console.error(`[ADMIN] Bulk operation failed:`, error);
      throw error;
    }
  }

  /**
   * Export data to CSV with limits to prevent memory issues
   */
  static async exportToCSV<T extends Record<string, any>>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    options: SearchOptions = {},
    fields: string[] = [],
    maxRows: number = 10000
  ): Promise<{ csv: string; totalCount: number; exportedCount: number; limited: boolean }> {
    const { search, filters, sortBy, sortOrder } = options;

    // Build where clause
    const where: any = {};
    if (filters) {
      Object.assign(where, filters);
    }

    // Exclude soft-deleted rows by default
    applySoftDeleteFilter(modelKey, where);

    if (search) {
      const searchFields = this.getSearchFields(modelKey);
      if (searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
          [field]: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }));
      }
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      const defaultSortField = this.getDefaultSortField(modelKey);
      orderBy[defaultSortField] = 'desc';
    }

    // Get total count first
    const totalCount = await delegate.count({ where });

    // Check if we need to limit the export
    const limited = totalCount > maxRows;
    const take = limited ? maxRows : totalCount;

    // Get data with limit
    const findOptions: any = {
      where,
      orderBy,
      take,
    };
    let data: T[];
    try {
      data = await delegate.findMany(findOptions);
    } catch (err: any) {
      if (err && typeof err === 'object' && err.code === 'P2022') {
        try {
          const fallbackOptions = { ...findOptions, orderBy: { id: sortOrder || 'desc' } };
          data = await delegate.findMany(fallbackOptions);
          // eslint-disable-next-line no-console
          console.warn(
            `[ADMIN] exportToCSV fallback to orderBy.id due to P2022 on model ${modelKey}. Original orderBy: ${JSON.stringify(orderBy)}`
          );
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    // Convert to CSV
    if (data.length === 0) {
      return { csv: '', totalCount: 0, exportedCount: 0, limited: false };
    }

    const allFields = fields.length > 0 ? fields : Object.keys(data[0]);
    const csvHeaders = allFields.map(field => `"${field}"`).join(',');
    
    const csvRows = data.map((item: any) => 
      allFields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [csvHeaders, ...csvRows].join('\n');

    return {
      csv,
      totalCount,
      exportedCount: data.length,
      limited,
    };
  }

  /**
   * Stream data to CSV format (memory-efficient for large datasets)
   */
  static async streamToCSV<T extends Record<string, any>>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage' | 'marketplace',
    options: SearchOptions = {},
    fields: string[] = [],
    maxRows: number = 10000,
    batchSize: number = 1000
  ): Promise<{ stream: ReadableStream; totalCount: number; exportedCount: number; limited: boolean }> {
    const { search, filters, sortBy, sortOrder } = options;

    // Build where clause
    const where: any = {};
    if (filters) {
      Object.assign(where, filters);
    }

    // Exclude soft-deleted rows by default
    applySoftDeleteFilter(modelKey, where);

    if (search) {
      const searchFields = this.getSearchFields(modelKey);
      if (searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
          [field]: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }));
      }
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      const defaultSortField = this.getDefaultSortField(modelKey);
      orderBy[defaultSortField] = 'desc';
    }

    // Get total count first
    const totalCount = await delegate.count({ where });

    // Check if we need to limit the export
    const limited = totalCount > maxRows;
    const take = limited ? maxRows : totalCount;

    // Create a ReadableStream for streaming CSV data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Write CSV headers
          const allFields = fields.length > 0 ? fields : [];
          if (allFields.length === 0) {
            // Get first batch to determine fields
            const firstBatch = await delegate.findMany({
              where,
              orderBy,
              take: 1,
            });
            if (firstBatch.length > 0) {
              allFields.push(...Object.keys(firstBatch[0]));
            }
          }

          if (allFields.length > 0) {
            const csvHeaders = allFields.map(field => `"${field}"`).join(',');
            controller.enqueue(new TextEncoder().encode(`${csvHeaders}\n`));
          }

          // Stream data in batches
          let exportedCount = 0;
          let skip = 0;

          while (exportedCount < take) {
            const currentBatchSize = Math.min(batchSize, take - exportedCount);
            
            const batch = await delegate.findMany({
              where,
              orderBy,
              skip,
              take: currentBatchSize,
            });

            if (batch.length === 0) {
              break;
            }

            // Convert batch to CSV rows
            for (const item of batch) {
              const csvRow = allFields.map(field => {
                const value = item[field];
                if (value === null || value === undefined) {
                  return '""';
                }
                if (typeof value === 'object') {
                  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return `"${String(value).replace(/"/g, '""')}"`;
              }).join(',');
              
              controller.enqueue(new TextEncoder().encode(`${csvRow}\n`));
            }

            exportedCount += batch.length;
            skip += batch.length;

            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      totalCount,
      exportedCount: Math.min(take, totalCount),
      limited,
    };
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    totalRestaurants: number;
    totalReviews: number;
    totalUsers: number;
    totalImages: number;
    pendingSubmissions: number;
  }> {
    try {
      const [
        totalRestaurants,
        totalReviews,
        totalUsers,
        totalImages,
        pendingSubmissions,
      ] = await Promise.all([
        prisma.restaurant.count({ where: { deleted_at: null } }),
        prisma.review.count(),
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.restaurantImage.count(),
        prisma.restaurant.count({ where: { submission_status: PENDING_STATUS } }),
      ]);

      return {
        totalRestaurants,
        totalReviews,
        totalUsers,
        totalImages,
        pendingSubmissions,
      };
    } catch (error) {
      console.error('[ADMIN] Failed to get database stats:', error);
      // Return fallback object with all counts set to zero
      return {
        totalRestaurants: 0,
        totalReviews: 0,
        totalUsers: 0,
        totalImages: 0,
        pendingSubmissions: 0,
      };
    }
  }

  /**
   * Health check for database connection
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: Date;
  }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as any).message 
        : 'Unknown error';
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Alias for healthCheck method
   */
  static async getHealthStatus() {
    return this.healthCheck();
  }

  /**
   * Get table sizes for performance monitoring
   */
  static async getTableSizes(): Promise<Record<string, number>> {
    try {
      const result = await prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
        SELECT relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `;

      return Object.fromEntries(
        result.map(row => [row.table_name, Number(row.row_count)])
      );
    } catch (error) {
      console.error('[ADMIN] Failed to get table sizes:', error);
      return {};
    }
  }
}

// Rate limiting utilities - only for development
// Dev-only in-memory rate limit store persisted at module scope
const DEV_DB_RATE_LIMIT_STORE: Map<string, { count: number; resetTime: number }> = new Map();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  // Only use in-memory rate limiting in development
  if (process.env.NODE_ENV !== 'development') {
    // In production, rate limiting is handled by middleware-security.ts
    return true;
  }

  const now = Date.now();
  const rateLimit = DEV_DB_RATE_LIMIT_STORE.get(key);
  
  if (rateLimit && now < rateLimit.resetTime) {
    if (rateLimit.count >= limit) {
      return false;
    }
    rateLimit.count++;
  } else {
    DEV_DB_RATE_LIMIT_STORE.set(key, { count: 1, resetTime: now + windowMs });
  }
  
  return true;
}
