import ImageDatabaseClient from '@/components/admin/ImageDatabaseClient';
import { AdminDatabaseService} from '@/lib/admin/database';
import { prisma} from '@/lib/db/prisma';

export default async function ImageDatabasePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || 'created_at';
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  
  // Build filters
  const filters: any = {};
  if (params.restaurantId) { filters.restaurant_id = parseInt(String(params.restaurantId)); }

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  try {
    const result = await AdminDatabaseService.getPaginatedData(
      prisma.restaurantImage,
      'restaurantImage',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Images</h1>
        <p className="text-gray-600">Manage restaurant images with optimization, ordering, and media handling capabilities.</p>
      </div>
      <ImageDatabaseClient
        initialData={initialData}
        initialPagination={initialPagination}
        initialSearch={search}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder as 'asc' | 'desc'}
      />
    </div>
  );
}
