'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Building2, Edit, Trash2, Eye, Star, MapPin, Phone } from 'lucide-react';

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
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export default function RestaurantDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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

  // Fetch restaurants
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (searchParams.get('status')) {
        params.set('status', searchParams.get('status')!);
      }
      if (searchParams.get('city')) {
        params.set('city', searchParams.get('city')!);
      }
      if (searchParams.get('state')) {
        params.set('state', searchParams.get('state')!);
      }
      if (sortKey) {
        params.set('sortBy', sortKey);
      }
      if (sortOrder) {
        params.set('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/admin/restaurants?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }

      const data = await response.json();
      setRestaurants(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/database/restaurants?${params.toString()}`);
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
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/database/restaurants?${params.toString()}`);
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
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/restaurants/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: searchQuery,
          filters: {
            status: searchParams.get('status'),
            city: searchParams.get('city'),
            state: searchParams.get('state'),
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restaurants_${new Date().toISOString().split('T')[0]}.csv`;
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
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} restaurants?`)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/restaurants/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            ids: selectedIds,
          }),
        });

        if (response.ok) {
          fetchRestaurants(); // Refresh the list
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  // Table columns
  const columns: Column<Restaurant>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.city}, {row.state}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone_number',
      title: 'Phone',
      render: (value) => (
        <div className="flex items-center space-x-1">
          <Phone className="h-3 w-3 text-gray-400" />
          <span>{value || '-'}</span>
        </div>
      ),
    },
    {
      key: 'kosher_category',
      title: 'Kosher Category',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
    {
      key: 'certifying_agency',
      title: 'Certifying Agency',
      render: (value) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      key: 'rating',
      title: 'Rating',
      align: 'center',
      render: (value, row) => (
        <div className="flex items-center justify-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="font-medium">{value || 0}</span>
          <span className="text-sm text-gray-500">({row.review_count || 0})</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          pending_approval: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          rejected: 'bg-red-100 text-red-800',
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
          }`}>
            {value?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row: Restaurant) => {
        // Navigate to restaurant detail page
        window.open(`/eatery/${row.id}`, '_blank');
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Restaurant) => {
        // Open edit modal or navigate to edit page
        console.log('Edit restaurant:', row.id);
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row: Restaurant) => {
        if (confirm(`Are you sure you want to delete ${row.name}?`)) {
          // Handle delete
          console.log('Delete restaurant:', row.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Database</h1>
        <p className="text-gray-600">
          Manage all restaurants in the database with comprehensive CRUD operations.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={restaurants}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search restaurants by name, city, or state..."
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
