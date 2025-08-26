'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/DataTable';
import { Activity, User, Calendar, Filter, Download } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  auditLevel: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
  user?: {
    email: string;
    name?: string;
  };
}

export default function AuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '50'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      
      if (searchParams.get('userId')) {
        params.set('userId', searchParams.get('userId')!);
      }
      if (searchParams.get('action')) {
        params.set('action', searchParams.get('action')!);
      }
      if (searchParams.get('entityType')) {
        params.set('entityType', searchParams.get('entityType')!);
      }
      if (searchParams.get('auditLevel')) {
        params.set('auditLevel', searchParams.get('auditLevel')!);
      }
      if (searchParams.get('startDate')) {
        params.set('startDate', searchParams.get('startDate')!);
      }
      if (searchParams.get('endDate')) {
        params.set('endDate', searchParams.get('endDate')!);
      }

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, pagination.pageSize, searchParams]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', pageSize.toString());
    params.set('page', '1');
    router.push(`/admin/audit?${params.toString()}`);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: searchParams.get('userId'),
          action: searchParams.get('action'),
          entityType: searchParams.get('entityType'),
          startDate: searchParams.get('startDate'),
          endDate: searchParams.get('endDate'),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Table columns
  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      title: 'Timestamp',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">
            {new Date(value).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      title: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {value?.name || value?.email || row.userId}
            </div>
            {value?.email && value.email !== row.userId && (
              <div className="text-sm text-gray-500">{value.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'entityType',
      title: 'Entity Type',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900 capitalize">
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'entityId',
      title: 'Entity ID',
      render: (value) => (
        <span className="text-sm text-gray-600 font-mono">
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'auditLevel',
      title: 'Level',
      render: (value) => {
        const levelColors = {
          info: 'bg-blue-100 text-blue-800',
          warning: 'bg-yellow-100 text-yellow-800',
          critical: 'bg-red-100 text-red-800',
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            levelColors[value as keyof typeof levelColors] || 'bg-gray-100 text-gray-800'
          }`}>
            {value.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: 'ipAddress',
      title: 'IP Address',
      render: (value) => (
        <span className="text-sm text-gray-600 font-mono">
          {value || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600">
          Monitor all admin activity and system changes for transparency and compliance.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={searchParams.get('startDate') || ''}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) {
                    params.set('startDate', e.target.value);
                  } else {
                    params.delete('startDate');
                  }
                  router.push(`/admin/audit?${params.toString()}`);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={searchParams.get('endDate') || ''}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) {
                    params.set('endDate', e.target.value);
                  } else {
                    params.delete('endDate');
                  }
                  router.push(`/admin/audit?${params.toString()}`);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={searchParams.get('action') || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) {
                  params.set('action', e.target.value);
                } else {
                  params.delete('action');
                }
                router.push(`/admin/audit?${params.toString()}`);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
            <select
              value={searchParams.get('auditLevel') || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) {
                  params.set('auditLevel', e.target.value);
                } else {
                  params.delete('auditLevel');
                }
                router.push(`/admin/audit?${params.toString()}`);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={auditLogs}
        columns={columns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onExport={handleExport}
        searchPlaceholder="Search audit logs..."
        loading={loading}
        selectable={false}
      />
    </div>
  );
}
