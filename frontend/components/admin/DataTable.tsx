'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, Download, Trash2} from 'lucide-react';

export interface Column<T> {
  key: string;
  title: string;
  render?: (key: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  title?: string;
  exportHint?: string;
  data: T[];
  columns: Column<T>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onSearch?: (query: string) => void;
  onExport?: () => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  bulkActions?: { key: string; title: string; variant?: 'default' | 'destructive' | 'success' }[];
  searchPlaceholder?: string;
  loading?: boolean;
  selectable?: boolean;
  actions?: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: (row: T) => void;
    variant?: 'default' | 'destructive';
  }[];
  // New controlled props
  searchQuery?: string;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSearchQueryChange?: (query: string) => void;
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;
}

export default function DataTable<T extends { id: string | number }>({
  title,
  exportHint,
  data,
  columns,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onExport,
  onBulkAction,
  bulkActions = [],
  searchPlaceholder = 'Search...',
  loading = false,
  selectable = false,
  actions = [],
  // New controlled props with defaults
  searchQuery: controlledSearchQuery,
  sortKey: controlledSortKey,
  sortOrder: controlledSortOrder,
  onSearchQueryChange,
  onSortChange,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  
  // Use controlled props if provided, otherwise use internal state
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSortKey, setInternalSortKey] = useState<string>('');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const searchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;
  const sortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
  const sortOrder = controlledSortOrder !== undefined ? controlledSortOrder : internalSortOrder;

  // Debounced search function
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onSearch?.(query);
      }, 300);
    };
  }, [onSearch]);

  // Handle row selection
  const handleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row.id)));
    }
  };

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    
    if (onSearchQueryChange) {
      // Controlled mode
      onSearchQueryChange(query);
    } else {
      // Uncontrolled mode
      setInternalSearchQuery(query);
    }
    
    // Always trigger debounced search
    debouncedSearch(query);
  };

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  // Handle sort
  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    
    if (onSortChange) {
      // Controlled mode
      onSortChange(key, newOrder);
    } else {
      // Uncontrolled mode
      setInternalSortKey(key);
      setInternalSortOrder(newOrder);
    }
    
    onSort?.(key, newOrder);
  };

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    const selectedIds = Array.from(selectedRows).map(id => id.toString());
    onBulkAction?.(action, selectedIds);
    setSelectedRows(new Set()); // Clear selection after action
  };

  // Get selected count
  const selectedCount = selectedRows.size;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {pagination ? `${pagination.total.toLocaleString()} items` : `${data.length} items`}
            </h3>
            
            {selectedCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedCount} selected
                </span>
                <button
                  onClick={() => setSelectedRows(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </form>

            {/* Export */}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {(title || exportHint) && (
          <div className="mt-2 flex items-center justify-between">
            {title ? (
              <div className="text-sm font-medium text-gray-900">{title}</div>
            ) : (
              <div />
            )}
            {exportHint && (
              <div className="text-xs text-gray-500">{exportHint}</div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && onBulkAction && (
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          {(Array.isArray(bulkActions) && bulkActions.length > 0) ? (
            bulkActions.map((ba, idx) => (
              <button
                key={idx}
                onClick={() => handleBulkAction(ba.key)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                  ba.variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' : ba.variant === 'success' ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {ba.key === 'delete' ? <Trash2 className="h-4 w-4" /> : null}
                <span>{ba.title}</span>
              </button>
            ))
          ) : (
            <button
              onClick={() => handleBulkAction('delete')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Selected</span>
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                const ariaSort = column.sortable ? (isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : undefined;
                return (
                  <th
                    key={column.key}
                    aria-sort={ariaSort as any}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.width ? `w-${column.width}` : ''
                    } ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {column.sortable && onSort && (
                        <button
                          onClick={() => handleSort(column.key)}
                          aria-label={`Sort by ${column.title} ${isSorted ? (sortOrder === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                        >
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          ) : (
                            <div className="flex flex-col">
                              <ChevronUp className="h-3 w-3 -mb-1" />
                              <ChevronDown className="h-3 w-3 -mt-1" />
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              
              {actions.length > 0 && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              data.map((row, _index) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${selectedRows.has(row.id) ? 'bg-blue-50' : ''}`}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.render
                        ? column.render((row as any)[column.key], row)
                        : (row as any)[column.key] || '-'}
                    </td>
                  ))}
                  
                  {actions.length > 0 && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                              action.variant === 'destructive'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <action.icon className="h-3 w-3" />
                            <span>{action.title}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total.toLocaleString()} results
              </span>
              
              <select
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange?.(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
