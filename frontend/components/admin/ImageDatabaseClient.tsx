'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { useAdminCsrf } from '@/lib/admin/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/ui/toast';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<RestaurantImage[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Fetch server data based on URL params
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await fetch(`/api/admin/images?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error('[ADMIN] load images error:', e);
      showError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, sortBy, sortOrder]);

  const onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const onSort = (field: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', field);
    p.set('sortOrder', order);
    router.push(`/admin/database/images?${p.toString()}`);
  };

  const onUpdate = async (id: number, updates: Partial<RestaurantImage>) => {
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        showSuccess('Image updated successfully');
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update image');
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrf,
        },
      });

      if (res.ok) {
        showSuccess('Image deleted successfully');
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete image');
    }
  };

  const onBulkAction = async (action: string, selectedIds: string[]) => {
    try {
      const res = await fetch('/api/admin/images/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ action, selectedIds }),
      });

      if (res.ok) {
        showSuccess(`Bulk ${action} completed successfully`);
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to perform bulk ${action}`);
    }
  };

  const onExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await fetch(`/api/admin/images/export?${params.toString()}`, {
        headers: {
          'X-CSRF-Token': csrf,
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export images');
    }
  };

  const columns: Column<RestaurantImage>[] = [
    {
      key: 'id',
      title: "ID",
      sortable: true,
    },
    {
      key: 'restaurant_id',
      title: "Restaurant ID",
      sortable: true,
    },
    {
      key: 'image_url',
      title: "Image URL",
      render: (value) => (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          View Image
        </a>
      ),
    },
    {
      key: 'image_order',
      title: "Order",
      sortable: true,
    },
    {
      key: 'created_at',
      title: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
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
    />
  );
}
