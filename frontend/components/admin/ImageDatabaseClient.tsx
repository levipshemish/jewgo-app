'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Image as ImageIcon, Building2, Edit, Trash2, Eye, ExternalLink, Hash } from 'lucide-react';

interface RestaurantImage {
  id: number;
  restaurant_id?: number;
  image_url?: string;
  image_order?: number;
  cloudinary_public_id?: string;
  created_at?: string;
  updated_at?: string;
  restaurant?: {
    id: number;
    name: string;
    city: string;
    state: string;
  };
}

interface Props {
  initialData: RestaurantImage[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export default function ImageDatabaseClient({ initialData, initialPagination, initialSearch = '', initialSortBy = '', initialSortOrder = 'desc' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [images, setImages] = useState<RestaurantImage[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.get('restaurantId')) params.set('restaurantId', searchParams.get('restaurantId')!);
      if (sortKey) params.set('sortBy', sortKey);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/images?${params.toString()}`, {
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      setImages(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/images?${params.toString()}`);
  };
  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/images?${params.toString()}`);
  };
  const handleSearchQueryChange = (query: string) => setSearchQuery(query);
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('search', query); else params.delete('search');
    params.set('page', '1');
    router.push(`/admin/database/images?${params.toString()}`);
  };
  const handleSortChange = (key: string, order: 'asc' | 'desc') => { setSortKey(key); setSortOrder(order); };
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/images?${params.toString()}`);
  };
  const handleExport = async () => {
    try {
      const payload: any = {};
      if (searchQuery) payload.search = searchQuery;
      if (searchParams.get('restaurantId')) payload.restaurantId = searchParams.get('restaurantId');
      if (sortKey) payload.sortBy = sortKey;
      if (sortOrder) payload.sortOrder = sortOrder;
      const response = await fetch(`/api/admin/images/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restaurant_images_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns: Column<RestaurantImage>[] = [
    {
      key: 'image_url',
      title: 'Image',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {value ? (
            <img src={value} alt={`Restaurant image ${row.id}`} className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }} />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">Image #{row.id}</div>
            {row.cloudinary_public_id && (
              <div className="text-xs text-gray-500">Cloudinary ID: {row.cloudinary_public_id}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'restaurant',
      title: 'Restaurant',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{value?.name || `Restaurant ${row.restaurant_id}`}</div>
            <div className="text-sm text-gray-500">{value?.city}, {value?.state}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'image_order',
      title: 'Order',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Hash className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900">{value || 'N/A'}</span>
        </div>
      ),
    },
    { key: 'created_at', title: 'Uploaded', sortable: true },
    { key: 'updated_at', title: 'Updated', sortable: true },
  ];

  return (
          <DataTable
        data={images}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onSort={handleSort}
      onSearch={handleSearch}
      onExport={handleExport}
      exportHint="Exports up to 10,000 rows"
      searchPlaceholder="Search images by restaurant or Cloudinary ID..."
      selectable={true}
      searchQuery={searchQuery}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSearchQueryChange={handleSearchQueryChange}
      onSortChange={handleSortChange}
    />
  );
}
