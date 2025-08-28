import KosherPlacesDatabaseClient from '@/components/admin/KosherPlacesDatabaseClient';
import { AdminDatabaseService} from '@/lib/admin/database';
import { prisma} from '@/lib/db/prisma';

export default async function KosherPlaceDatabasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || 'created_at';
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  
  // Build filters
  const filters: any = {};
  if (params.category) { filters.category = String(params.category); }
  if (params.status) { filters.status = String(params.status); }

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  try {
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.marketplace,
      'marketplace',
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
      } catch (e) {
    // ignore; client-side will fetch
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Kosher Places</h1>
        <p className="text-gray-600">Manage marketplace listings representing kosher shops/services. Bulk operations supported.</p>
      </div>
      <KosherPlacesDatabaseClient
        initialData={initialData}
        initialPagination={initialPagination}
        initialSearch={search}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder as 'asc' | 'desc'}
      />
    </div>
  );
}
