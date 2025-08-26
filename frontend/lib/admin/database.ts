import { prisma } from '@/lib/db/prisma';
import { AdminUser } from './auth';
import { logAdminAction } from './audit';

// Pagination interface
export interface PaginationOptions {
  page: number;
  pageSize: number;
  cursor?: string;
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
    cursor?: string;
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
    softDelete: true,
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
    softDelete: true,
    softDeleteField: 'deleted_at',
    defaultSortBy: 'created_at',
    searchFields: ['image_url', 'cloudinary_public_id'],
  },
} as const;

// Generic CRUD operations
export class AdminDatabaseService {
  /**
   * Get search fields for a model
   */
  static getSearchFields(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage'): string[] {
    return [...ENTITY_CONFIG[modelKey].searchFields];
  }

  /**
   * Get default sort field for a model
   */
  static getDefaultSortField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage'): string {
    return ENTITY_CONFIG[modelKey].defaultSortBy;
  }

  /**
   * Get valid sort fields for a model
   */
  static getValidSortFields(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage'): string[] {
    const validFields: Record<string, string[]> = {
      restaurant: ['id', 'name', 'address', 'city', 'state', 'created_at', 'updated_at', 'status'],
      review: ['id', 'rating', 'created_at', 'updated_at', 'status', 'helpful_count'],
      user: ['id', 'email', 'name', 'createdat', 'updatedat', 'issuperadmin'],
      restaurantImage: ['id', 'image_order', 'created_at', 'updated_at'],
    };
    return validFields[modelKey] || [];
  }

  /**
   * Validate sort field for a model
   */
  static validateSortField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage', sortBy: string): boolean {
    const validFields = this.getValidSortFields(modelKey);
    return validFields.includes(sortBy);
  }

  /**
   * Check if model supports soft delete
   */
  static supportsSoftDelete(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage'): boolean {
    return ENTITY_CONFIG[modelKey].softDelete;
  }

  /**
   * Get soft delete field for a model
   */
  static getSoftDeleteField(modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage'): string | null {
    const config = ENTITY_CONFIG[modelKey];
    return config.softDelete ? config.softDeleteField : null;
  }

  /**
   * Get paginated data with search and filtering
   */
  static async getPaginatedData<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
    options: PaginationOptions & SearchOptions,
    include?: any
  ): Promise<PaginatedResult<T>> {
    const { page, pageSize, search, filters, sortBy, sortOrder, cursor } = options;

    // Build where clause
    const where: any = {};
    
    if (filters) {
      Object.assign(where, filters);
    }

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
    const data = await delegate.findMany({
      where,
      orderBy,
      skip: cursor ? undefined : (page - 1) * pageSize,
      take: pageSize,
      cursor: cursor ? { id: cursor } : undefined,
      include,
    });

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
        cursor: data.length > 0 ? data[data.length - 1].id : undefined,
      },
    };
  }

  /**
   * Create a new record
   */
  static async createRecord<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
    data: any,
    user: AdminUser,
    entityType: string
  ): Promise<T> {
    try {
      const result = await delegate.create({
        data,
      });

      // Log the action
      await logAdminAction(user, 'create', entityType, {
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
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
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
      await logAdminAction(user, 'update', entityType, {
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
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
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
      await logAdminAction(user, 'delete', entityType, {
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
  static async bulkOperation<T>(
    operation: 'create' | 'update' | 'delete',
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
    data: any[],
    user: AdminUser,
    entityType: string,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
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
      await logAdminAction(user, 'bulk_operation', entityType, {
        auditLevel: 'info',
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
  static async exportToCSV<T>(
    delegate: any,
    modelKey: 'restaurant' | 'review' | 'user' | 'restaurantImage',
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
    const data = await delegate.findMany({
      where,
      orderBy,
      take,
    });

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
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    totalRestaurants: number;
    totalReviews: number;
    totalUsers: number;
    totalImages: number;
    pendingSubmissions: number;
  }> {
    const [
      totalRestaurants,
      totalReviews,
      totalUsers,
      totalImages,
      pendingSubmissions,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.review.count(),
      prisma.user.count(),
      prisma.restaurantImage.count(),
      prisma.restaurant.count({ where: { status: 'pending_approval' } }),
    ]);

    return {
      totalRestaurants,
      totalReviews,
      totalUsers,
      totalImages,
      pendingSubmissions,
    };
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
   * Get table sizes for performance monitoring
   */
  static async getTableSizes(): Promise<Record<string, number>> {
    try {
      const result = await prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
        SELECT 
          schemaname,
          tablename as table_name,
          n_tup_ins + n_tup_upd + n_tup_del as row_count
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
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
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  // Only use in-memory rate limiting in development
  if (process.env.NODE_ENV !== 'development') {
    // In production, rate limiting is handled by middleware-security.ts
    return true;
  }

  const devRateLimitStore = new Map<string, { count: number; resetTime: number }>();
  const now = Date.now();
  const rateLimit = devRateLimitStore.get(key);
  
  if (rateLimit && now < rateLimit.resetTime) {
    if (rateLimit.count >= limit) {
      return false;
    }
    rateLimit.count++;
  } else {
    devRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
  }
  
  return true;
}
