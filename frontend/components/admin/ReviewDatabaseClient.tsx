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

interface Props {
  initialData: Review[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export default function ReviewDatabaseClient({ initialData, initialPagination, initialSearch = '', initialSortBy = '', initialSortOrder = 'desc' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
      if (searchParams.get('rating')) params.set('rating', searchParams.get('rating')!);
      if (searchParams.get('restaurantId')) params.set('restaurantId', searchParams.get('restaurantId')!);
      if (sortKey) params.set('sortBy', sortKey);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (!response.ok) throw new Error('Failed to fetch reviews');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

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

  const handleSearchQueryChange = (query: string) => setSearchQuery(query);
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('search', query); else params.delete('search');
    params.set('page', '1');
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  const handleSortChange = (key: string, order: 'asc' | 'desc') => { setSortKey(key); setSortOrder(order); };
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/reviews?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      const payload: any = {};
      if (searchParams.get('search')) payload.search = searchParams.get('search');
      if (searchParams.get('status')) payload.status = searchParams.get('status');
      if (searchParams.get('rating')) payload.rating = searchParams.get('rating');
      if (searchParams.get('restaurantId')) payload.restaurantId = searchParams.get('restaurantId');
      if (searchParams.get('sortBy')) payload.sortBy = searchParams.get('sortBy');
      if (searchParams.get('sortOrder')) payload.sortOrder = searchParams.get('sortOrder');
      const response = await fetch(`/api/admin/reviews/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
        body: JSON.stringify(payload),
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
            <div className="font-medium text-gray-900">{row.restaurant?.name || row.restaurant_id}</div>
            <div className="text-sm text-gray-500">{row.restaurant?.city}, {row.restaurant?.state}</div>
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
    { key: 'status', title: 'Status' },
    { key: 'created_at', title: 'Created', sortable: true },
  ];

  return (
          <DataTable
        data={reviews}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchQueryChange}
      onSearch={handleSearch}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
              onSort={handleSort}
        onExport={handleExport}
    />
  );
}

