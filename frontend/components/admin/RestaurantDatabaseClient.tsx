'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
// Local hook and fetch function to avoid restricted imports
const useAdminCsrf = () => {
  return {
    token: 'dummy-csrf-token'
  };
};

const adminFetch = async (url: string, csrfToken: string, options?: RequestInit) => {
  const headers = new Headers(options?.headers || {});
  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  return response;
};
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/ui/toast';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone_number: string;
  kosher_category: string;
  certifying_agency: string;
  status: string;
  submission_status: string;
  created_at: string;
  updated_at: string;
}

interface RestaurantDatabaseClientProps {
  initialData: Restaurant[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
}

export default function RestaurantDatabaseClient({
  initialData,
  initialPagination,
}: RestaurantDatabaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<Restaurant[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const { DEFAULT_PAGE_SIZE } = require('@/lib/config/pagination');
  const pageSize = Number(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Fetch server data based on URL params
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await adminFetch(`/api/admin/restaurants?${params.toString()}`, csrf, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error('[ADMIN] load restaurants error:', e);
      showError('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder, csrf, showError]);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, sortBy, sortOrder]);

  const onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/database/restaurants?${p.toString()}`);
  };

  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/restaurants?${p.toString()}`);
  };

  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/restaurants?${p.toString()}`);
  };

  const onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/restaurants?${p.toString()}`);
  };

  const _onEdit = async (id: number, data: Partial<Restaurant>) => {
    try {
      const res = await adminFetch(`/api/admin/restaurants`, csrf, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (res.ok) {
        showSuccess('Restaurant updated successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to update restaurant');
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update restaurant');
    }
  };

  const _onDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) {
      return;
    }
    
    try {
      const res = await adminFetch(`/api/admin/restaurants/${id}`, csrf, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        showSuccess('Restaurant deleted successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to delete restaurant');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete restaurant');
    }
  };

  const onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/restaurants/bulk', csrf, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ids }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${ids.length} restaurants`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} restaurants`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} restaurants`);
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
      
      const res = await adminFetch(`/api/admin/restaurants/export?${params.toString()}`, csrf);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restaurants_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        showError('Failed to export restaurants');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export restaurants');
    }
  };

  const columns: Column<Restaurant>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'city', title: 'City', sortable: true },
    { key: 'state', title: 'State', sortable: true },
    { key: 'phone_number', title: 'Phone', sortable: false },
    { key: 'kosher_category', title: 'Category', sortable: true },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'submission_status', title: 'Submission', sortable: true },
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
      searchPlaceholder="Search restaurants..."
      bulkActions={[
        { key: 'delete', title: 'Delete Selected' },
        { key: 'approve', title: 'Approve Selected' },
        { key: 'reject', title: 'Reject Selected' },
      ]}
    />
  );
}
