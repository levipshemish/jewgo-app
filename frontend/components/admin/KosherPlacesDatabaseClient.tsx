'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { _useAdminCsrf} from '@/lib/admin/hooks';
import { _useRouter, _useSearchParams} from 'next/navigation';
import { _useToast} from '@/lib/ui/toast';

interface KosherPlace {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface KosherPlacesDatabaseClientProps {
  initialData: KosherPlace[];
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

export default function KosherPlacesDatabaseClient({
  initialData,
  initialPagination,
  initialSearch,
  initialSortBy,
  initialSortOrder,
}: KosherPlacesDatabaseClientProps) {
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<KosherPlace[]>(initialData);
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
      
      const _res = await fetch(`/api/admin/kosher-places?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const _json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (_e) {
      console.error('[ADMIN] load kosher places error:', e);
      showError('Failed to load kosher places');
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
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const _onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const _onSearch = (_query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const _onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const _onEdit = async (id: number, data: Partial<KosherPlace>) => {
    try {
      const res = await fetch(`/api/admin/kosher-places`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (res.ok) {
        showSuccess('Kosher place updated successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to update kosher place');
      }
    } catch (_error) {
      console.error('Update error:', error);
      showError('Failed to update kosher place');
    }
  };

  const _onDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this kosher place?')) {
      return;
    }
    
    try {
      const _res = await fetch(`/api/admin/kosher-places?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        showSuccess('Kosher place deleted successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to delete kosher place');
      }
    } catch (_error) {
      console.error('Delete error:', error);
      showError('Failed to delete kosher place');
    }
  };

  const _onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const _res = await fetch('/api/admin/kosher-places/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify({ action, ids }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${ids.length} kosher places`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} kosher places`);
      }
    } catch (_error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} kosher places`);
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
      
      const _res = await fetch(`/api/admin/kosher-places/export?${params.toString()}`, {
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
      if (res.ok) {
        const _blob = await res.blob();
        const _url = window.URL.createObjectURL(blob);
        const _a = document.createElement('a');
        a.href = url;
        a.download = `kosher_places_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        showError('Failed to export kosher places');
      }
    } catch (_error) {
      console.error('Export error:', error);
      showError('Failed to export kosher places');
    }
  };

  const columns: Column<KosherPlace>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'city', title: 'City', sortable: true },
    { key: 'state', title: 'State', sortable: true },
    { key: 'phone', title: 'Phone', sortable: false },
    { key: 'category', title: 'Category', sortable: true },
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
      searchPlaceholder="Search kosher places..."
      bulkActions={[
        { title: 'Delete Selected', key: 'delete' },
        { title: 'Approve Selected', key: 'approve' },
        { title: 'Reject Selected', key: 'reject' },
      ]}
    />
  );
}

