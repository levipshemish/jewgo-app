import RestaurantDatabaseClient from '@/components/admin/RestaurantDatabaseClient';

export default async function RestaurantDatabasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || '';
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('pageSize', String(pageSize));
  if (search) urlParams.set('search', search);
  if (params.status) urlParams.set('status', String(params.status));
  if (params.city) urlParams.set('city', String(params.city));
  if (params.state) urlParams.set('state', String(params.state));
  if (sortBy) urlParams.set('sortBy', sortBy);
  if (sortOrder) urlParams.set('sortOrder', sortOrder);

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  try {
    const res = await fetch(`/api/admin/restaurants?${urlParams.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      initialData = json.data || [];
      initialPagination = json.pagination || initialPagination;
    }
  } catch (e) {
    // ignore; client-side will fetch
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Database</h1>
        <p className="text-gray-600">Manage all restaurants in the database with comprehensive CRUD operations.</p>
      </div>
      <RestaurantDatabaseClient
        initialData={initialData}
        initialPagination={initialPagination}
        initialSearch={search}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder as 'asc' | 'desc'}
      />
    </div>
  );
}
