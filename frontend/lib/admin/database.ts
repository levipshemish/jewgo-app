import { PrismaClient } from '@prisma/client';
import { AdminUser } from './auth';
import { logAdminAction } from './audit';

// Prisma client instance
const prisma = new PrismaClient();

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

// Generic CRUD operations
export class AdminDatabaseService {
  /**
   * Get paginated data with search and filtering
   */
  static async getPaginatedData<T>(
    model: any,
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
      const searchFields = this.getSearchFields(model);
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
      orderBy.created_at = 'desc';
    }

    // Get total count
    const total = await model.count({ where });

    // Get paginated data
    const data = await model.findMany({
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
   * Get search fields for a model
   */
  private static getSearchFields(model: any): string[] {
    const modelSearchFields: Record<string, string[]> = {
      Restaurant: ['name', 'address', 'city', 'state', 'phone_number'],
      Review: ['title', 'content', 'user_name', 'user_email'],
      User: ['email', 'name'],
      RestaurantImage: ['image_url'],
      FloridaSynagogue: ['name', 'address', 'city', 'state'],
      KosherPlace: ['name', 'address', 'category'],
    };

    const modelName = model.name || 'Unknown';
    return modelSearchFields[modelName] || [];
  }

  /**
   * Create a new record
   */
  static async createRecord<T>(
    model: any,
    data: any,
    user: AdminUser,
    entityType: string
  ): Promise<T> {
    try {
      const result = await model.create({
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
    model: any,
    id: string | number,
    data: any,
    user: AdminUser,
    entityType: string
  ): Promise<T> {
    try {
      // Get old data for audit
      const oldData = await model.findUnique({
        where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
      });

      const result = await model.update({
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
    model: any,
    id: string | number,
    user: AdminUser,
    entityType: string,
    softDelete: boolean = true
  ): Promise<T> {
    try {
      // Get old data for audit
      const oldData = await model.findUnique({
        where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
      });

      let result: T;

      if (softDelete && this.supportsSoftDelete(model)) {
        // Soft delete
        result = await model.update({
          where: { id: typeof id === 'string' ? id : parseInt(id.toString()) },
          data: { deletedAt: new Date() },
        });
      } else {
        // Hard delete
        result = await model.delete({
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
   * Check if model supports soft delete
   */
  private static supportsSoftDelete(model: any): boolean {
    // Check if model has deletedAt field
    const modelFields = Object.keys(model.fields || {});
    return modelFields.includes('deletedAt');
  }

  /**
   * Bulk operations with transaction support
   */
  static async bulkOperation<T>(
    operation: 'create' | 'update' | 'delete',
    model: any,
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
                  await tx[model.name.toLowerCase()].create({ data: item });
                  break;
                case 'update':
                  await tx[model.name.toLowerCase()].update({
                    where: { id: item.id },
                    data: item,
                  });
                  break;
                case 'delete':
                  if (this.supportsSoftDelete(model)) {
                    await tx[model.name.toLowerCase()].update({
                      where: { id: item.id },
                      data: { deletedAt: new Date() },
                    });
                  } else {
                    await tx[model.name.toLowerCase()].delete({
                      where: { id: item.id },
                    });
                  }
                  break;
              }
              success++;
            } catch (error) {
              failed++;
              errors.push(`Item ${item.id}: ${error.message}`);
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
   * Export data to CSV
   */
  static async exportToCSV<T>(
    model: any,
    options: SearchOptions = {},
    fields: string[] = []
  ): Promise<string> {
    const { search, filters, sortBy, sortOrder } = options;

    // Build where clause
    const where: any = {};
    if (filters) {
      Object.assign(where, filters);
    }

    if (search) {
      const searchFields = this.getSearchFields(model);
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
      orderBy.created_at = 'desc';
    }

    // Get all data
    const data = await model.findMany({
      where,
      orderBy,
    });

    // Convert to CSV
    if (data.length === 0) {
      return '';
    }

    const allFields = fields.length > 0 ? fields : Object.keys(data[0]);
    const csvHeaders = allFields.map(field => `"${field}"`).join(',');
    
    const csvRows = data.map(item => 
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

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    totalRestaurants: number;
    totalReviews: number;
    totalUsers: number;
    totalImages: number;
    totalSynagogues: number;
    totalKosherPlaces: number;
    pendingSubmissions: number;
    flaggedReviews: number;
  }> {
    const [
      totalRestaurants,
      totalReviews,
      totalUsers,
      totalImages,
      totalSynagogues,
      totalKosherPlaces,
      pendingSubmissions,
      flaggedReviews,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.review.count(),
      prisma.user.count(),
      prisma.restaurantImage.count(),
      prisma.floridaSynagogue.count(),
      prisma.kosherPlace.count(),
      prisma.restaurant.count({ where: { status: 'pending_approval' } }),
      prisma.reviewFlag.count({ where: { status: 'pending' } }),
    ]);

    return {
      totalRestaurants,
      totalReviews,
      totalUsers,
      totalImages,
      totalSynagogues,
      totalKosherPlaces,
      pendingSubmissions,
      flaggedReviews,
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
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
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

// Rate limiting utilities
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const rateLimit = rateLimitStore.get(key);
  
  if (rateLimit && now < rateLimit.resetTime) {
    if (rateLimit.count >= limit) {
      return false;
    }
    rateLimit.count++;
  } else {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
  }
  
  return true;
}

// Clean up rate limiting store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
