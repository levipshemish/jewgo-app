import ImageDatabaseClient from '@/components/admin/ImageDatabaseClient';

export default async function ImageDatabasePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || '';
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';
  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('pageSize', String(pageSize));
  if (search) {urlParams.set('search', search);}
  if (params.restaurantId) {urlParams.set('restaurantId', String(params.restaurantId));}
  if (sortBy) {urlParams.set('sortBy', sortBy);}
  if (sortOrder) {urlParams.set('sortOrder', sortOrder);}

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false };
  try {
    const res = await fetch(`/api/admin/images?${urlParams.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      initialData = json.data || [];
      initialPagination = json.pagination || initialPagination;
    }
  } catch {}

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
