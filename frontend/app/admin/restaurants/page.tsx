'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DataTable, { Column } from '@/components/admin/DataTable';
import { useAdminCsrf } from '@/lib/admin/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const csrf = useAdminCsrf();

  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

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
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) { params.set('search', search); }
      if (status) { params.set('status', status); }
      if (sortBy) { params.set('sortBy', sortBy); }
      if (sortOrder) { params.set('sortOrder', sortOrder); }
      const res = await fetch(`/api/admin/submissions/restaurants?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) { throw new Error(`Failed: ${res.status}`); }
      const json = await res.json();
      setRows(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      // eslint-disable-next-line no-console
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

  const approveOne = async (id: number) => {
    await fetch(`/api/admin/restaurants/${id}/approve`, { method: 'POST', headers: { 'x-csrf-token': csrf || '' } });
  };
  const rejectOne = async (id: number) => {
    await fetch(`/api/admin/restaurants/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf || '' }, body: JSON.stringify({ reason: 'Rejected by admin' }) });
  };

  const onBulkAction = async (action: string, ids: string[]) => {
    if (!ids || ids.length === 0) { return; }
    setLoading(true);
    try {
      if (action === 'approve') {
        await Promise.all(ids.map((id) => approveOne(Number(id))));
      } else if (action === 'reject') {
        await Promise.all(ids.map((id) => rejectOne(Number(id))));
      }
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const bulkActions = useMemo(() => ([
    { key: 'approve', label: 'Approve Selected', variant: 'success' as const },
    { key: 'reject', label: 'Reject Selected', variant: 'destructive' as const },
  ]), []);

  const columns: Column<SubmissionRow>[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'city', title: 'City', sortable: true },
    { key: 'state', title: 'State', sortable: true },
    { key: 'submission_status', title: 'Status', sortable: true },
    { key: 'submission_date', title: 'Submitted', sortable: true },
  ];

  return (
    <div className="container mx-auto p-6 space-y-4">
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
          { label: 'Approve', icon: CheckCircle, onClick: (row) => approveOne(row.id) },
          { label: 'Reject', icon: XCircle, onClick: (row) => rejectOne(row.id), variant: 'destructive' },
        ]}
        onBulkAction={onBulkAction}
        bulkActions={bulkActions}
      />
    </div>
  );
}
