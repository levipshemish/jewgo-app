'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { _useAdminCsrf} from '@/lib/admin/hooks';
import { _useRouter, _useSearchParams} from 'next/navigation';
import { _useToast} from '@/lib/ui/toast';

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
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<Review[]>(initialData);
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
      
      const _res = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const _json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (_e) {
      console.error('[ADMIN] load reviews error:', e);
      showError('Failed to load reviews');
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
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const _onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const _onSearch = (_query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const _onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/reviews?${p.toString()}`);
  };

  const _onEdit = async (id: string, data: Partial<Review>) => {
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
    } catch (_error) {
      console.error('Update error:', error);
      showError('Failed to update review');
    }
  };

  const _onDelete = async (_id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }
    
    try {
      const _res = await fetch(`/api/admin/reviews?id=${id}`, {
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
    } catch (_error) {
      console.error('Delete error:', error);
      showError('Failed to delete review');
    }
  };

  const _onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const _res = await fetch('/api/admin/reviews/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ action, ids }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${ids.length} reviews`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} reviews`);
      }
    } catch (_error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} reviews`);
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
      
      const _res = await fetch(`/api/admin/reviews/export?${params.toString()}`, {
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        const _blob = await res.blob();
        const _url = window.URL.createObjectURL(blob);
        const _a = document.createElement('a');
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
    } catch (_error) {
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
      onPageChange={onPageChange}
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
