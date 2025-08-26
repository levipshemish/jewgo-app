'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Building2, MapPin, Phone, Mail, Globe, Edit, Trash2, Eye, Star, CheckCircle } from 'lucide-react';

interface KosherPlace {
  id: number;
  name?: string;
  detail_url?: string;
  category?: string;
  photo?: string;
  address?: string;
  phone?: string;
  website?: string;
  kosher_cert_link?: string;
  kosher_type?: string;
  extra_kosher_info?: string;
  created_at?: string;
  short_description?: string;
  email?: string;
  google_listing_url?: string;
  status?: string;
  is_cholov_yisroel?: boolean;
  is_pas_yisroel?: boolean;
  hours_open?: string;
  price_range?: string;
}

interface Props {
  initialData: KosherPlace[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  initialSearch?: string;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export default function KosherPlacesDatabaseClient({ initialData, initialPagination, initialSearch = '', initialSortBy = '', initialSortOrder = 'desc' }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<KosherPlace[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.get('category')) params.set('category', searchParams.get('category')!);
      if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
      if (sortKey) params.set('sortBy', sortKey);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/kosher-places?${params.toString()}`, {
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (!response.ok) throw new Error('Failed to fetch kosher places');
      const data = await response.json();
      setItems(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching kosher places:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };
  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };
  const handleSearchQueryChange = (query: string) => setSearchQuery(query);
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('search', query); else params.delete('search');
    params.set('page', '1');
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };
  const handleSortChange = (key: string, order: 'asc' | 'desc') => { setSortKey(key); setSortOrder(order); };
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (searchParams.get('category')) params.set('category', searchParams.get('category')!);
      if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
      if (sortKey) params.set('sortBy', sortKey);
      if (sortOrder) params.set('sortOrder', sortOrder);
      const response = await fetch(`/api/admin/kosher-places/export?${params.toString()}`, {
        method: 'GET',
        headers: { 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kosher_places_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} kosher places?`)) return;
      try {
        const response = await fetch('/api/admin/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': window.__CSRF_TOKEN__ || '' },
          body: JSON.stringify({
            operation: 'delete',
            entityType: 'marketplace',
            data: selectedIds.map((id) => ({ id })),
          }),
        });
        if (response.ok) fetchItems();
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  const columns: Column<KosherPlace>[] = [
    {
      key: 'name',
      title: 'Kosher Place',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {row.photo ? (
            <img src={row.photo} alt={value || 'Kosher place'} className="h-8 w-8 rounded-lg object-cover"
              onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{value || 'Unnamed Place'}</div>
            {row.short_description && (
              <div className="text-sm text-gray-500 line-clamp-1">{row.short_description}</div>
            )}
          </div>
        </div>
      ),
    },
    { key: 'category', title: 'Category' },
    { key: 'address', title: 'Location', render: (v) => (<div className="flex items-center space-x-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{v || '-'}</span></div>) },
    { key: 'phone', title: 'Phone', render: (v) => (<div className="flex items-center space-x-2"><Phone className="h-4 w-4 text-gray-400" /><span>{v || '-'}</span></div>) },
    { key: 'website', title: 'Website', render: (v) => v ? (<a href={v} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Visit</a>) : '-' },
    { key: 'status', title: 'Status' },
  ];

  return (
          <DataTable
        data={items}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onSort={handleSort}
      onSearch={handleSearch}
      onExport={handleExport}
      onBulkAction={handleBulkAction}
      searchPlaceholder="Search by name or category..."
      selectable={true}
      searchQuery={searchQuery}
      sortKey={sortKey}
      sortOrder={sortOrder}
      onSearchQueryChange={handleSearchQueryChange}
      onSortChange={handleSortChange}
    />
  );
}

