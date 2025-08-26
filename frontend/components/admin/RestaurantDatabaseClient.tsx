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

interface Props {
  initialData: Restaurant[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export default function RestaurantDatabaseClient({ initialData, initialPagination, initialSearch = '', initialSortBy = '', initialSortOrder = 'desc' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (searchQuery) {params.set('search', searchQuery);}
      if (searchParams.get('status')) {params.set('status', searchParams.get('status')!);}
      if (searchParams.get('city')) {params.set('city', searchParams.get('city')!);}
      if (searchParams.get('state')) {params.set('state', searchParams.get('state')!);}
      if (sortKey) {params.set('sortBy', sortKey);}
      if (sortOrder) {params.set('sortOrder', sortOrder);}

      const response = await fetch(`/api/admin/restaurants?${params.toString()}`, {
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (!response.ok) {throw new Error('Failed to fetch restaurants');}
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
    // Fetch on client interactions/URL changes
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  const handleSearchQueryChange = (query: string) => setSearchQuery(query);

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {params.set('search', query);} else {params.delete('search');}
    params.set('page', '1');
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  const handleSortChange = (key: string, order: 'asc' | 'desc') => { setSortKey(key); setSortOrder(order); };
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/restaurants?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      const payload: any = {};
      if (searchQuery) {payload.search = searchQuery;}
      if (searchParams.get('status')) {payload.status = searchParams.get('status');}
      if (searchParams.get('city')) {payload.city = searchParams.get('city');}
      if (searchParams.get('state')) {payload.state = searchParams.get('state');}
      if (sortKey) {payload.sortBy = sortKey;}
      if (sortOrder) {payload.sortOrder = sortOrder;}
      const response = await fetch(`/api/admin/restaurants/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
        body: JSON.stringify(payload),
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

  const columns: Column<Restaurant>[] = [
    {
      key: 'name',
      title: 'Restaurant',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.address}</div>
          </div>
        </div>
      ),
    },
    { key: 'city', title: 'City', render: (v) => (<div className="flex items-center space-x-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{v}</span></div>) },
    { key: 'state', title: 'State' },
    { key: 'phone_number', title: 'Phone', render: (v) => (<div className="flex items-center space-x-2"><Phone className="h-4 w-4 text-gray-400" /><span>{v}</span></div>) },
    { key: 'kosher_category', title: 'Kosher' },
    { key: 'certifying_agency', title: 'Agency' },
    { key: 'status', title: 'Status', sortable: true },
    { key: 'created_at', title: 'Created', sortable: true },
    { key: 'updated_at', title: 'Updated', sortable: true },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={restaurants}
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
    </div>
  );
}
