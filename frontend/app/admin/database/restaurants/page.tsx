// Force dynamic rendering for admin routes to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import RestaurantDatabaseClient from '@/components/admin/RestaurantDatabaseClient';
// import { AdminDatabaseService } from '@/lib/admin/database';
// import { prisma } from '@/lib/db/prisma';

export default async function RestaurantDatabasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = 'createdAt'; // AdminDatabaseService.getDefaultSortField('restaurant');
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  
  // Build filters
  const filters: any = {};
  if (params.status) { filters.status = String(params.status); }
  if (params.city) { filters.city = String(params.city); }
  if (params.state) { filters.state = String(params.state); }

  // Skip database access during build time
  const initialData: any[] = [];
  const initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  
  // TODO: Re-enable database access when build issues are resolved
  /*
  if (process.env.SKIP_DB_ACCESS !== 'true') {
    try {
      const result = await AdminDatabaseService.getPaginatedData(
        prisma.restaurant,
        'restaurant',
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
  */

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Database</h1>
        <p className="text-gray-600">Manage all restaurants in the database with comprehensive CRUD operations.</p>
      </div>
      <RestaurantDatabaseClient
        initialData={initialData}
        initialPagination={initialPagination}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder as 'asc' | 'desc'}
      />
    </div>
  );
}
