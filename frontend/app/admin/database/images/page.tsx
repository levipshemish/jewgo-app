'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Image, Building2, Edit, Trash2, Eye, ExternalLink, Hash } from 'lucide-react';

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

export default function ImageDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [images, setImages] = useState<RestaurantImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Initialize controlled state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortKey, setSortKey] = useState(searchParams.get('sortBy') || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Fetch images
  const fetchImages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (searchParams.get('restaurantId')) {
        params.set('restaurantId', searchParams.get('restaurantId')!);
      }
      if (sortKey) {
        params.set('sortBy', sortKey);
      }
      if (sortOrder) {
        params.set('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/admin/images?${params.toString()}`, {
        headers: {
          'x-csrf-token': window.__CSRF_TOKEN__ || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

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
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  // Handle pagination
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

  // Handle search query change (controlled)
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle search (debounced)
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/database/images?${params.toString()}`);
  };

  // Handle sort change (controlled)
  const handleSortChange = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  // Handle sort (immediate)
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/images?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchParams.get('search')) {
        params.set('search', searchParams.get('search')!);
      }
      if (searchParams.get('restaurantId')) {
        params.set('restaurantId', searchParams.get('restaurantId')!);
      }
      if (searchParams.get('sortBy')) {
        params.set('sortBy', searchParams.get('sortBy')!);
      }
      if (searchParams.get('sortOrder')) {
        params.set('sortOrder', searchParams.get('sortOrder')!);
      }

      const response = await fetch(`/api/admin/images/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'x-csrf-token': window.__CSRF_TOKEN__ || '',
        },
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

  // Handle bulk actions
  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} images?`)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': window.__CSRF_TOKEN__ || '',
          },
          body: JSON.stringify({
            operation: 'delete',
            entityType: 'restaurantImage',
            data: selectedIds.map((id) => ({ id })),
          }),
        });

        if (response.ok) {
          fetchImages();
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  // Table columns
  const columns: Column<RestaurantImage>[] = [
    {
      key: 'image_url',
      title: 'Image',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {value ? (
            <img
              src={value}
              alt={`Restaurant image ${row.id}`}
              className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png';
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <Image className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              Image #{row.id}
            </div>
            {row.cloudinary_public_id && (
              <div className="text-xs text-gray-500">
                Cloudinary ID: {row.cloudinary_public_id}
              </div>
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
            <div className="font-medium text-gray-900">
              {value?.name || `Restaurant ${row.restaurant_id}`}
            </div>
            <div className="text-sm text-gray-500">
              {value?.city}, {value?.state}
            </div>
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
          <span className="font-medium text-gray-900">
            {value || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'Uploaded',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      title: 'Updated',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row: RestaurantImage) => {
        if (row.image_url) {
          window.open(row.image_url, '_blank');
        }
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: RestaurantImage) => {
        // Open edit modal or navigate to edit page
        // console.log('Edit image:', row.id);
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row: RestaurantImage) => {
        if (confirm(`Are you sure you want to delete this image?`)) {
          // Handle delete
          // console.log('Delete image:', row.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Images</h1>
        <p className="text-gray-600">
          Manage restaurant images with optimization, ordering, and media handling capabilities.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={images}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search images by restaurant or Cloudinary ID..."
        loading={loading}
        selectable={true}
        actions={actions}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
