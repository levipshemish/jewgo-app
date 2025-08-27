'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { _useAdminCsrf} from '@/lib/admin/hooks';
import { _useRouter, _useSearchParams} from 'next/navigation';
import { _useToast} from '@/lib/ui/toast';

interface RestaurantImage {
  id: number;
  restaurant_id: number;
  image_url: string;
  image_order: number;
  cloudinary_public_id: string;
  created_at: string;
  updated_at: string;
}

interface ImageDatabaseClientProps {
  initialData: RestaurantImage[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  initialSearch: string;
  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
}

export default function ImageDatabaseClient({
  initialData,
  initialPagination,
  initialSearch,
  initialSortBy,
  initialSortOrder,
}: ImageDatabaseClientProps) {
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<RestaurantImage[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  // Controlled state derived from URL params
  const _page = Number(searchParams.get('page') || '1');
  const _pageSize = Number(searchParams.get('pageSize') || '20');
  const _search = searchParams.get('search') || '';
  const _sortBy = searchParams.get('sortBy') || 'created_at';
  const _sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Fetch server data based on URL params
  const _fetchData = async () => {
    setLoading(true);
    try {
      const _params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const _res = await fetch(`/api/admin/images?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const _json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (_e) {
      console.error('[ADMIN] load images error:', e);
      showError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, sortBy, sortOrder]);

  const _onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const _onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const _onSearch = (_query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const _onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const _onEdit = async (id: number, data: Partial<RestaurantImage>) => {
    try {
      const res = await fetch(`/api/admin/images`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (res.ok) {
        showSuccess('Image updated successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to update image');
      }
    } catch (_error) {
      console.error('Update error:', error);
      showError('Failed to update image');
    }
  };

  const _onDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
    try {
      const _res = await fetch(`/api/admin/images?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        showSuccess('Image deleted successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to delete image');
      }
    } catch (_error) {
      console.error('Delete error:', error);
      showError('Failed to delete image');
    }
  };

  const _onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const _res = await fetch('/api/admin/images/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ action, ids }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${ids.length} images`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} images`);
      }
    } catch (_error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} images`);
    } finally {
      setLoading(false);
    }
  };

  const _onExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const _res = await fetch(`/api/admin/images/export?${params.toString()}`, {
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        const _blob = await res.blob();
        const _url = window.URL.createObjectURL(blob);
        const _a = document.createElement('a');
        a.href = url;
        a.download = `images_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        showError('Failed to export images');
      }
    } catch (_error) {
      console.error('Export error:', error);
      showError('Failed to export images');
    }
  };

  const columns: Column<RestaurantImage>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'restaurant_id', title: 'Restaurant ID', sortable: true },
    { key: 'image_url', title: 'Image URL', sortable: false },
    { key: 'image_order', title: 'Order', sortable: true },
    { key: 'cloudinary_public_id', title: 'Cloudinary ID', sortable: false },
    { key: 'created_at', title: 'Created', sortable: true },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      pagination={pagination}
      loading={loading}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onSearch={onSearch}
      onSort={onSort}


      onBulkAction={onBulkAction}
      onExport={onExport}
      searchPlaceholder="Search images..."
      bulkActions={[
        { title: 'Delete Selected', key: 'delete' },
        { title: 'Reorder Selected', key: 'reorder' },
      ]}
    />
  );
}
