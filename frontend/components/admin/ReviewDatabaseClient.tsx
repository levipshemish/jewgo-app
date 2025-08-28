'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { useAdminCsrf} from '@/lib/admin/hooks';
import { useRouter, useSearchParams} from 'next/navigation';
import { useToast} from '@/lib/ui/toast';

interface Review {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ReviewDatabaseClientProps {
  initialData: Review[];
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

export default function ReviewDatabaseClient({
  initialData,
  initialPagination,
  initialSearch,
  initialSortBy,
  initialSortOrder,
}: ReviewDatabaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<Review[]>(initialData);
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
      
      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error('[ADMIN] load reviews error:', e);
      showError('Failed to load reviews');
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
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const onEdit = async (id: string, data: Partial<Review>) => {
    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (res.ok) {
        showSuccess('Review updated successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to update review');
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update review');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        showSuccess('Review deleted successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to delete review');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete review');
    }
  };

  const onBulkAction = async (action: string, selectedIds: string[]) => {
    if (!selectedIds || selectedIds.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ action, selectedIds }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${selectedIds.length} reviews`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} reviews`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} reviews`);
    } finally {
      setLoading(false);
    }
  };

  const onExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await fetch(`/api/admin/reviews/export?${params.toString()}`, {
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reviews_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        showError('Failed to export reviews');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export reviews');
    }
  };

  const columns: Column<Review>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'user_name', title: 'User', sortable: true },
    { key: 'rating', title: 'Rating', sortable: true },
    { key: 'title', title: 'Title', sortable: true },
    { key: 'content', title: 'Content', sortable: false },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'created_at', title: 'Created', sortable: true },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      pagination={pagination}
      loading={loading}
      onPageChange={_onPageChange}
      onPageSizeChange={onPageSizeChange}
      onSearch={onSearch}
      onSort={onSort}
      
      
      onBulkAction={onBulkAction}
      onExport={onExport}
      searchPlaceholder="Search reviews..."
      bulkActions={[
        { key: 'delete', title: 'Delete Selected' },
        { key: 'approve', title: 'Approve Selected' },
        { key: 'reject', title: 'Reject Selected' },
      ]}
    />
  );
}
