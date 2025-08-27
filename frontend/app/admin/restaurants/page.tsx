'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { useAdminCsrf } from '@/lib/admin/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/ui/toast';
import { CheckCircle, XCircle } from 'lucide-react';

interface SubmissionRow {
  id: number;
  name: string;
  city: string;
  state: string;
  submission_status: string;
  submission_date?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token: csrf, error: csrfError, loading: csrfLoading } = useAdminCsrf();
  const { showSuccess, showError } = useToast();

  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [error, setError] = useState<string | null>(null);

  // Controlled state derived from URL params
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';
  const sortBy = (searchParams.get('sortBy') || 'submission_date');
  const sortOrder = ((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');
  const status = searchParams.get('status') || 'pending_approval';

  // Fetch server data based on URL params
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (status && status !== 'all') { params.set('status', status); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      const res = await fetch(`/api/admin/restaurants?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load data: ${res.status}`);
      }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load data';
      setError(errorMessage);
      console.error('[ADMIN] load submissions error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sortBy, sortOrder, status]);

  const onPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(nextPage));
    router.push(`/admin/restaurants?${p.toString()}`);
  };
  const onPageSizeChange = (nextSize: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(nextSize));
    p.set('page', '1');
    router.push(`/admin/restaurants?${p.toString()}`);
  };
  const onSearch = (query: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (query) { p.set('search', query); } else { p.delete('search'); }
    p.set('page', '1');
    router.push(`/admin/restaurants?${p.toString()}`);
  };
  const onSort = (key: string, order: 'asc' | 'desc') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('sortBy', key);
    p.set('sortOrder', order);
    router.push(`/admin/restaurants?${p.toString()}`);
  };

  const approveOne = async (id: number, retryCount = 0): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/approve`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '' 
        }
      });
      
      if (res.status === 403 && retryCount < 1) {
        // CSRF token expired, refresh and retry once
        const newToken = await fetch('/api/admin/csrf').then(r => r.json()).then(d => d.token);
        if (newToken) {
          return await approveOne(id, retryCount + 1);
        }
      }
      
      return res.ok;
    } catch (error) {
      console.error('Approve error:', error);
      return false;
    }
  };

  const rejectOne = async (id: number, retryCount = 0): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/reject`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'x-csrf-token': csrf || '' 
        }, 
        body: JSON.stringify({ 
          reason: 'Rejected by admin'
        })
      });
      
      if (res.status === 403 && retryCount < 1) {
        // CSRF token expired, refresh and retry once
        const newToken = await fetch('/api/admin/csrf').then(r => r.json()).then(d => d.token);
        if (newToken) {
          return await rejectOne(id, retryCount + 1);
        }
      }
      
      return res.ok;
    } catch (error) {
      console.error('Reject error:', error);
      return false;
    }
  };

  const onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) { return; }
    
    setLoading(true);
    let successCount = 0;
    let failureCount = 0;
    
    try {
      if (action === 'approve') {
        const results = await Promise.all(ids.map((id) => approveOne(Number(id))));
        successCount = results.filter(Boolean).length;
        failureCount = results.length - successCount;
      } else if (action === 'reject') {
        const results = await Promise.all(ids.map((id) => rejectOne(Number(id))));
        successCount = results.filter(Boolean).length;
        failureCount = results.length - successCount;
      }
      
      // Show feedback based on results
      if (successCount > 0 && failureCount === 0) {
        showSuccess(`${action === 'approve' ? 'Approved' : 'Rejected'} ${successCount} restaurants successfully`);
      } else if (successCount > 0 && failureCount > 0) {
        showError(`Partially completed: ${successCount} succeeded, ${failureCount} failed`);
      } else if (failureCount > 0) {
        showError(`Failed to ${action} ${failureCount} restaurants`);
      }
      
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} restaurants`);
    } finally {
      setLoading(false);
    }
  };

  const bulkActions = useMemo(() => ([
    { key: 'approve', title: 'Approve Selected', variant: 'success' as const },
    { key: 'reject', title: 'Reject Selected', variant: 'destructive' as const },
  ]), []);

  const columns: Column<SubmissionRow>[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'city', title: 'City', sortable: true },
    { key: 'state', title: 'State', sortable: true },
    { key: 'submission_status', title: 'Status', sortable: true },
    { key: 'submission_date', title: 'Submitted', sortable: true },
  ];

  // Show error banner if CSRF token is missing
  if (csrfError) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">CSRF Token Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{csrfError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while CSRF token is being fetched
  if (csrfLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              const p = new URLSearchParams(searchParams.toString());
              p.set('status', e.target.value);
              p.set('page', '1');
              router.push(`/admin/restaurants?${p.toString()}`);
            }}
            className="border border-gray-300 rounded-md px-2 py-2 text-sm"
          >
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        searchQuery={search}
        onSearch={onSearch}
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        selectable
        actions={[
          { title: 'Approve', icon: CheckCircle, onClick: (row) => approveOne(row.id) },
          { title: 'Reject', icon: XCircle, onClick: (row) => rejectOne(row.id), variant: 'destructive' },
        ]}
        onBulkAction={onBulkAction}
        bulkActions={bulkActions}
      />
    </div>
  );
}
