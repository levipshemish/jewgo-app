'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { useAdminCsrf } from '@/lib/admin/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/ui/toast';

interface User {
  id: string;
  email: string;
  name: string;
  issuperadmin: boolean;
  emailverified: string;
  createdat: string;
  updatedat: string;
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
  initialSearch: string;
  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
}

export default function UserDatabaseClient({
  initialData,
  initialPagination,
  initialSearch,
  initialSortBy,
  initialSortOrder,
}: UserDatabaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<User[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState(initialPagination);

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdat';
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
      
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error('[ADMIN] load users error:', e);
      showError('Failed to load users');
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
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/database/users?${p.toString()}`);
  };

  const _onEdit = async (id: string, data: Partial<User>) => {
    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
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
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrf || '',
        },
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
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
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
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      
      const res = await fetch(`/api/admin/users/export?${params.toString()}`, {
        headers: {
          'x-csrf-token': csrf || '',
        },
      });
      
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
    { key: 'issuperadmin', title: 'Super Admin', sortable: true },
    { key: 'emailverified', title: 'Email Verified', sortable: true },
    { key: 'createdat', title: 'Created', sortable: true },
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
      searchPlaceholder="Search users..."
      bulkActions={[
        { title: 'Delete Selected', key: 'delete' },
        { title: 'Make Super Admin', key: 'make_super_admin' },
        { title: 'Remove Super Admin', key: 'remove_super_admin' },
      ]}
    />
  );
}
