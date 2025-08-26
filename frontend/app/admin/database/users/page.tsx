'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { User, Mail, Calendar, Shield, Edit, Trash2, Eye, Activity } from 'lucide-react';

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

export default function UserDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Initialize controlled state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortKey, setSortKey] = useState(searchParams.get('sortBy') || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (searchParams.get('provider')) {
        params.set('provider', searchParams.get('provider')!);
      }
      if (sortKey) {
        params.set('sortBy', sortKey);
      }
      if (sortOrder) {
        params.set('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'x-csrf-token': window.__CSRF_TOKEN__ || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

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
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  // Handle pagination
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

  // Handle search query change (controlled)
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle search (debounced)
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/database/users?${params.toString()}`);
  };

  // Handle sort change (controlled)
  const handleSortChange = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  // Handle sort (immediate)
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/users?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (searchParams.get('provider')) {
        params.set('provider', searchParams.get('provider')!);
      }
      if (searchParams.get('sortBy')) {
        params.set('sortBy', searchParams.get('sortBy')!);
      }
      if (searchParams.get('sortOrder')) {
        params.set('sortOrder', searchParams.get('sortOrder')!);
      }

      const response = await fetch(`/api/admin/users/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'x-csrf-token': window.__CSRF_TOKEN__ || '',
        },
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

  // Handle bulk actions
  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone.`)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': window.__CSRF_TOKEN__ || '',
          },
          body: JSON.stringify({
            operation: 'delete',
            entityType: 'user',
            data: selectedIds.map((id) => ({ id })),
          }),
        });

        if (response.ok) {
          fetchUsers();
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  // Table columns
  const columns: Column<UserData>[] = [
    {
      key: 'name',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {row.image ? (
            <img
              src={row.image}
              alt={value || row.email}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {value || 'No Name'}
            </div>
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
          <span className="text-sm font-medium text-gray-900 capitalize">
            {value || 'Unknown'}
          </span>
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
          <span className="text-sm text-gray-500">
            {new Date(value).toLocaleDateString()}
          </span>
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
          <span className="text-sm text-gray-500">
            {new Date(value).toLocaleDateString()}
          </span>
        </div>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row: UserData) => {
        // Navigate to user detail page
        console.log('View user:', row.id);
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: UserData) => {
        // Open edit modal or navigate to edit page
        console.log('Edit user:', row.id);
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row: UserData) => {
        if (confirm(`Are you sure you want to delete user ${row.email}? This action cannot be undone.`)) {
          // Handle delete
          console.log('Delete user:', row.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">User Database</h1>
        <p className="text-gray-600">
          Manage user accounts with privacy compliance and comprehensive account administration.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search users by name or email..."
        loading={loading}
        selectable={true}
        actions={actions}
        // Controlled props
        searchQuery={searchQuery}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSearchQueryChange={handleSearchQueryChange}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
