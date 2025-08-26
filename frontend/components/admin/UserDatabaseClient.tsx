'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { User as UserIcon, Mail, Calendar, Shield, Edit, Trash2, Eye, Activity } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  isSuperAdmin: boolean;
}

interface Props {
  initialData: UserData[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export default function UserDatabaseClient({ initialData, initialPagination, initialSearch = '', initialSortBy = '', initialSortOrder = 'desc' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.get('provider')) params.set('provider', searchParams.get('provider')!);
      if (sortKey) params.set('sortBy', sortKey);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/users?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/users?${params.toString()}`);
  };

  const handleSearchQueryChange = (query: string) => setSearchQuery(query);
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('search', query); else params.delete('search');
    params.set('page', '1');
    router.push(`/admin/database/users?${params.toString()}`);
  };

  const handleSortChange = (key: string, order: 'asc' | 'desc') => { setSortKey(key); setSortOrder(order); };
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/users?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      const payload: any = {};
      if (searchQuery) payload.search = searchQuery;
      if (searchParams.get('provider')) payload.provider = searchParams.get('provider');
      if (sortKey) payload.sortBy = sortKey;
      if (sortOrder) payload.sortOrder = sortOrder;
      const response = await fetch(`/api/admin/users/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns: Column<UserData>[] = [
    {
      key: 'name',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {row.image ? (
            <img src={row.image} alt={value || row.email} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{value || 'No Name'}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      title: 'Provider',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 capitalize">{value || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Joined',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">{new Date(value).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Last Active',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">{new Date(value).toLocaleDateString()}</span>
        </div>
      ),
    },
  ];

  return (
          <DataTable
        data={users}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onSort={handleSort}
      onSearch={handleSearch}
      onExport={handleExport}
      exportHint="Exports up to 10,000 rows"
      searchPlaceholder="Search users by name or email..."
      selectable={true}
      searchQuery={searchQuery}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSearchQueryChange={handleSearchQueryChange}
      onSortChange={handleSortChange}
    />
  );
}
