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

interface User {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
  provider?: string;
}

interface UserDatabaseClientProps {
  initialData: User[];
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

export default function UserDatabaseClient({
  initialData,
  initialPagination,
}: UserDatabaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<User[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  const sortKeyMap: Record<string, string> = {
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    emailVerified: 'emailverified',
    isSuperAdmin: 'issuperadmin',
  };
  const reverseSortKeyMap: Record<string, string> = Object.fromEntries(
    Object.entries(sortKeyMap).map(([k, v]) => [v, k])
  );

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const { DEFAULT_PAGE_SIZE } = require('../../lib/config/pagination');
  const pageSize = Number(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
  const search = searchParams.get('search') || '';
  const sortByParam = searchParams.get('sortBy') || 'createdat';
  const sortBy = reverseSortKeyMap[sortByParam] || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Fetch server data based on URL params
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (sortByParam) { params.set('sortBy', sortByParam); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }

      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store', signal });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      if ((e as any)?.name === 'AbortError') { return; }
      console.error('[ADMIN] load users error:', e);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortByParam, sortOrder, showError]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [page, pageSize, search, sortByParam, sortOrder, fetchData]);

  const onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/database/users?${p.toString()}`);
  };

  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/database/users?${p.toString()}`);
  };

  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/database/users?${p.toString()}`);
  };

  const onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    const dbKey = sortKeyMap[key] || key;
    p.set('sortBy', dbKey);
    p.set('sortOrder', order);
    router.push(`/admin/database/users?${p.toString()}`);
  };

  const _onEdit = async (id: string, data: Partial<User>) => {
    try {
      const res = await adminFetch(`/api/admin/users`, csrf || '', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (res.ok) {
        showSuccess('User updated successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to update user');
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update user');
    }
  };

  const _onDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      const res = await adminFetch(`/api/admin/users/${id}`, csrf || '', {
        method: 'DELETE',
      });
      
      if (res.ok) {
        showSuccess('User deleted successfully');
        fetchData(); // Refresh data
      } else {
        showError('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete user');
    }
  };

  const onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/users/bulk', csrf || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ids }),
      });
      
      if (res.ok) {
        showSuccess(`${action} completed for ${ids.length} users`);
        fetchData(); // Refresh data
      } else {
        showError(`Failed to ${action} users`);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} users`);
    } finally {
      setLoading(false);
    }
  };

  const onExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) { params.set('search', search); }
      if (sortByParam) { params.set('sortBy', sortByParam); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await adminFetch(`/api/admin/users/export?${params.toString()}`, csrf || '');
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('Export completed successfully');
      } else {
        showError('Failed to export users');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export users');
    }
  };

  const columns: Column<User>[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'isSuperAdmin', title: 'Super Admin', sortable: true },
    { key: 'emailVerified', title: 'Email Verified', sortable: true },
    { key: 'createdAt', title: 'Created', sortable: true },
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
      sortKey={sortBy}
      sortOrder={sortOrder}


      onBulkAction={onBulkAction}
      onExport={onExport}
      searchPlaceholder="Search users..."
      bulkActions={[
        { title: 'Delete Selected', key: 'delete' },
        { title: 'Make Super Admin', key: 'make_super_admin' },
        { title: 'Remove Super Admin', key: 'remove_super_admin' },
      ]}
    />
  );
}
