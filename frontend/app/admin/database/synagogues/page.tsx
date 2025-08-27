'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Building2, MapPin, Phone, Mail, Globe, Eye, Star } from 'lucide-react';
import { useAdminCsrf } from '@/lib/admin/hooks';

interface FloridaSynagogue {
  id: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rabbi?: string;
  affiliation?: string;
  phone?: string;
  email?: string;
  website?: string;
  social_media?: string;
  shacharit?: string;
  mincha?: string;
  maariv?: string;
  shabbat?: string;
  sunday?: string;
  weekday?: string;
  kosher_info?: string;
  parking?: string;
  accessibility?: string;
  additional_info?: string;
  url?: string;
  data_quality_score?: number;
  is_chabad?: boolean;
  is_young_israel?: boolean;
  is_sephardic?: boolean;
  has_address?: boolean;
  has_zip?: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export default function SynagogueDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [synagogues, setSynagogues] = useState<FloridaSynagogue[]>([]);
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
  const csrfToken = useAdminCsrf();

  // Fetch synagogues
  const fetchSynagogues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (searchParams.get('city')) {
        params.set('city', searchParams.get('city')!);
      }
      if (searchParams.get('state')) {
        params.set('state', searchParams.get('state')!);
      }
      if (searchParams.get('affiliation')) {
        params.set('affiliation', searchParams.get('affiliation')!);
      }
      if (sortKey) {
        params.set('sortBy', sortKey);
      }
      if (sortOrder) {
        params.set('sortOrder', sortOrder);
      }

      const response = await fetch(`/api/admin/synagogues?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch synagogues');
      }

      const data = await response.json();
      setSynagogues(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching synagogues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSynagogues();
  }, [pagination.page, pagination.pageSize, searchQuery, sortKey, sortOrder, searchParams]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/database/synagogues?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/database/synagogues?${params.toString()}`);
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
    router.push(`/admin/database/synagogues?${params.toString()}`);
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
    router.push(`/admin/database/synagogues?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/synagogues/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({
          search: searchParams.get('search'),
          filters: {
            city: searchParams.get('city'),
            state: searchParams.get('state'),
            affiliation: searchParams.get('affiliation'),
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `florida_synagogues_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle bulk actions (read-only - disabled)
  const handleBulkAction = async (_action: string, _selectedIds: string[]) => {
    // Synagogues are read-only; bulk actions intentionally disabled.
    return;
  };

  // Table columns
  const columns: Column<FloridaSynagogue>[] = [
    {
      key: 'name',
      title: 'Synagogue',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {value || 'Unnamed Synagogue'}
            </div>
            {row.rabbi && (
              <div className="text-sm text-gray-500">Rabbi: {row.rabbi}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'Location',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm text-gray-900">
              {value || 'No address'}
            </div>
            <div className="text-xs text-gray-500">
              {row.city && row.state ? `${row.city}, ${row.state}` : 'Location unknown'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'affiliation',
      title: 'Affiliation',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 capitalize">
            {value || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      title: 'Contact',
      render: (value, row) => (
        <div className="space-y-1">
          {value && (
            <div className="flex items-center space-x-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center space-x-1">
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-900">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'website',
      title: 'Website',
      render: (value) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <>
              <Globe className="h-4 w-4 text-gray-400" />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Visit Site
              </a>
            </>
          ) : (
            <span className="text-sm text-gray-500">No website</span>
          )}
        </div>
      ),
    },
    {
      key: 'data_quality_score',
      title: 'Quality',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="font-medium text-gray-900">
            {value || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'Added',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  // Table actions (read-only)
  const actions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (_row: FloridaSynagogue) => { /* no-op */ },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Florida Synagogues</h1>
        <p className="text-gray-600">
          View synagogue data with comprehensive religious institution information and community details.
          <span className="text-orange-600 font-medium"> (Read-only due to database schema constraints)</span>
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={synagogues}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search synagogues by name, rabbi, or location..."
        loading={loading}
        selectable={false}
        actions={actions}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
