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

export default function KosherPlaceDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [kosherPlaces, setKosherPlaces] = useState<KosherPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch kosher places
  const fetchKosherPlaces = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchParams.get('search')) {
        params.set('search', searchParams.get('search')!);
      }
      if (searchParams.get('category')) {
        params.set('category', searchParams.get('category')!);
      }
      if (searchParams.get('status')) {
        params.set('status', searchParams.get('status')!);
      }
      if (searchParams.get('sortBy')) {
        params.set('sortBy', searchParams.get('sortBy')!);
      }
      if (searchParams.get('sortOrder')) {
        params.set('sortOrder', searchParams.get('sortOrder')!);
      }

      const response = await fetch(`/api/admin/kosher-places?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch kosher places');
      }

      const data = await response.json();
      setKosherPlaces(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching kosher places:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKosherPlaces();
  }, [pagination.page, pagination.pageSize, searchParams]);

  // Handle pagination
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

  // Handle search
  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };

  // Handle sort
  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortOrder', order);
    router.push(`/admin/database/kosher-places?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/kosher-places/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: searchParams.get('search'),
          filters: {
            category: searchParams.get('category'),
            status: searchParams.get('status'),
          },
        }),
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

  // Handle bulk actions
  const handleBulkAction = async (action: string, selectedIds: string[]) => {
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedIds.length} kosher places?`)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/kosher-places/bulk', {
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
          fetchKosherPlaces();
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  // Table columns
  const columns: Column<KosherPlace>[] = [
    {
      key: 'name',
      title: 'Kosher Place',
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          {row.photo ? (
            <img
              src={row.photo}
              alt={value || 'Kosher place'}
              className="h-8 w-8 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png';
              }}
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {value || 'Unnamed Place'}
            </div>
            {row.short_description && (
              <div className="text-sm text-gray-500 line-clamp-1">
                {row.short_description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 capitalize">
            {value || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'Location',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm text-gray-900">
              {value || 'No address'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'kosher_type',
      title: 'Kosher Type',
      render: (value, row) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-900">
              {value || 'Standard'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {row.is_cholov_yisroel && (
              <span className="bg-blue-100 text-blue-800 px-1 rounded">Cholov Yisroel</span>
            )}
            {row.is_pas_yisroel && (
              <span className="bg-orange-100 text-orange-800 px-1 rounded">Pas Yisroel</span>
            )}
          </div>
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
      title: 'Links',
      render: (value, row) => (
        <div className="space-y-1">
          {value && (
            <div className="flex items-center space-x-1">
              <Globe className="h-3 w-3 text-gray-400" />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Website
              </a>
            </div>
          )}
          {row.kosher_cert_link && (
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <a
                href={row.kosher_cert_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:text-green-800"
              >
                Certification
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-red-100 text-red-800',
          pending: 'bg-yellow-100 text-yellow-800',
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

  // Table actions
  const actions = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row: KosherPlace) => {
        // Navigate to kosher place detail page
        console.log('View kosher place:', row.id);
      },
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: KosherPlace) => {
        // Open edit modal or navigate to edit page
        console.log('Edit kosher place:', row.id);
      },
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row: KosherPlace) => {
        if (confirm(`Are you sure you want to delete ${row.name || 'this kosher place'}?`)) {
          // Handle delete
          console.log('Delete kosher place:', row.id);
        }
      },
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Kosher Places</h1>
        <p className="text-gray-600">
          Manage kosher establishments with certification compliance and comprehensive kosher-specific features.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        data={kosherPlaces}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onSearch={handleSearch}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        searchPlaceholder="Search kosher places by name, category, or location..."
        loading={loading}
        selectable={true}
        actions={actions}
      />
    </div>
  );
}
