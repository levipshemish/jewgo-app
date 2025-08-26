'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { MessageSquare, Edit, Trash2, Eye, Star, Building2, User } from 'lucide-react';

interface Review {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  user_email?: string;
  rating: number;
  title?: string;
  content: string;
  images?: string;
  status: string;
  created_at: string;
  updated_at: string;
  moderator_notes?: string;
  verified_purchase: boolean;
  helpful_count: number;
  report_count: number;
  restaurant?: {
    id: number;
    name: string;
    city: string;
    state: string;
  };
}

export default function ReviewDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchParams.get('search')) {
        params.set('search', searchParams.get('search')!);
      }
      if (searchParams.get('status')) {
        params.set('status', searchParams.get('status')!);
      }
      if (searchParams.get('rating')) {
        params.set('rating', searchParams.get('rating')!);
      }
      if (searchParams.get('restaurantId')) {
        params.set('restaurantId', searchParams.get('restaurantId')!);
      }
      if (searchParams.get('sortBy')) {
        params.set('sortBy', searchParams.get('sortBy')!);
      }
      if (searchParams.get('sortOrder')) {
        params.set('sortOrder', searchParams.get('sortOrder')!);
      }

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, pagination.pageSize, searchParams]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  // Handle search
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  // Handle sort
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/reviews/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: searchParams.get('search'),
          filters: {
            status: searchParams.get('status'),
            rating: searchParams.get('rating'),
            restaurantId: searchParams.get('restaurantId'),
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
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
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} reviews?`)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/reviews/bulk', {
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
          fetchReviews();
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  // Table columns
  const columns: Column<Review>[] = [
    {
      key: 'user_name',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            {row.user_email && (
              <div className="text-sm text-gray-500">{row.user_email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'restaurant',
      title: 'Restaurant',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {value?.name || `Restaurant ${row.restaurant_id}`}
            </div>
            <div className="text-sm text-gray-500">
              {value?.city}, {value?.state}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      title: 'Rating',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'title',
      title: 'Review',
      render: (value, row) => (
        <div>
          {value && <div className="font-medium text-gray-900">{value}</div>}
          <div className="text-sm text-gray-600 line-clamp-2">{row.content}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => {
        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          rejected: 'bg-red-100 text-red-800',
          flagged: 'bg-orange-100 text-orange-800',
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
          }`}>
            {value?.toUpperCase() || 'UNKNOWN'}
          </span>
        );
      },
    },
    {
      key: 'helpful_count',
      title: 'Helpful',
      align: 'center',
      render: (value, row) => (
        <div className="text-center">
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.report_count} reports</div>
        </div>
      ),
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
      onClick: (row: Review) => {
        // Navigate to review detail page
        window.open(`/review/${row.id}`, '_blank');
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Review) => {
        // Open edit modal or navigate to edit page
        console.log('Edit review:', row.id);
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row: Review) => {
        if (confirm(`Are you sure you want to delete this review?`)) {
          // Handle delete
          console.log('Delete review:', row.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Review Database</h1>
        <p className="text-gray-600">
          Manage and moderate all user reviews with comprehensive filtering and bulk operations.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={reviews}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search reviews by content, user, or restaurant..."
        loading={loading}
        selectable={true}
        actions={actions}
      />
    </div>
  );
}
