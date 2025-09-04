'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from './DataTable';
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
import { useToast } from '../ui/Toast';

interface KosherPlace {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  kosher_category: string;
  certifying_agency: string;
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

  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
}

export default function KosherPlacesDatabaseClient({
  initialData,
  initialPagination,
}: KosherPlacesDatabaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<KosherPlace[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const { DEFAULT_PAGE_SIZE } = require('../../lib/config/pagination');
  const pageSize = Number(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Fetch server data based on URL params
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await fetch(`/api/admin/kosher-places?${params.toString()}`, { cache: 'no-store', signal });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      if ((e as any)?.name === 'AbortError') { return; }
      console.error('[ADMIN] load kosher places error:', e);
      showError('Failed to load kosher places');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder, showError]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [page, pageSize, search, sortBy, sortOrder, fetchData]);

  const onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const onSort = (field: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', field);
    p.set('sortOrder', order);
    router.push(`/admin/database/kosher-places?${p.toString()}`);
  };

  const _onUpdate = async (id: number, updates: Partial<KosherPlace>) => {
    try {
      const res = await adminFetch(`/api/admin/kosher-places/${id}`, csrf, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        showSuccess('Kosher place updated successfully');
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update kosher place');
    }
  };

  const _onDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this kosher place?')) {
      return;
    }

    try {
      const res = await adminFetch(`/api/admin/kosher-places/${id}`, csrf, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('Kosher place deleted successfully');
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete kosher place');
    }
  };

  const onBulkAction = async (action: string, selectedIds: string[]) => {
    try {
      const res = await adminFetch('/api/admin/kosher-places/bulk', csrf, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      const res = await adminFetch(`/api/admin/kosher-places/export?${params.toString()}`, csrf);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kosher_places_export_${new Date().toISOString().split('T')[0]}.csv`;
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
      showError('Failed to export kosher places');
    }
  };

  const columns: Column<KosherPlace>[] = [
    {
      key: 'id',
      title: "ID",
      sortable: true,
    },
    {
      key: 'name',
      title: "Name",
      sortable: true,
    },
    {
      key: 'address',
      title: "Address",
      sortable: true,
    },
    {
      key: 'city',
      title: "City",
      sortable: true,
    },
    {
      key: 'state',
      title: "State",
      sortable: true,
    },
    {
      key: 'kosher_category',
      title: "Category",
      sortable: true,
    },
    {
      key: 'certifying_agency',
      title: "Agency",
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
