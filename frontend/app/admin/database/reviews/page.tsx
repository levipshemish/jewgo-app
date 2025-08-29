import ReviewDatabaseClient from '@/components/admin/ReviewDatabaseClient';
import { AdminDatabaseService } from '@/lib/admin/database';
import { prisma } from '@/lib/db/prisma';

export default async function ReviewDatabasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || AdminDatabaseService.getDefaultSortField('review');
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  
  // Build filters
  const filters: any = {};
  if (params.status) { filters.status = String(params.status); }
  if (params.rating) { filters.rating = parseInt(String(params.rating)); }
  if (params.restaurantId) { filters.restaurant_id = parseInt(String(params.restaurantId)); }

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  
  // Skip database access during build time
  if (process.env.NODE_ENV !== 'production' || process.env.SKIP_DB_ACCESS === 'true') {
    // Use empty data during build
  } else {
    try {
      const result = await AdminDatabaseService.getPaginatedData(
        prisma.review,
        'review',
        {
          page,
          pageSize,
          search,
          filters,
          sortBy,
          sortOrder,
        }
      );
      initialData = result.data || [];
      initialPagination = result.pagination || initialPagination;
    } catch {
      // ignore; client-side will fetch
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Review Database</h1>
        <p className="text-gray-600">Manage and moderate all user reviews with comprehensive filtering and bulk operations.</p>
      </div>
      <ReviewDatabaseClient
        initialData={initialData}
        initialPagination={initialPagination}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder as 'asc' | 'desc'}
      />
    </div>
  );
}
