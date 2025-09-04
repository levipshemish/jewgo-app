'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Download, 
  Plus, 
  TrendingUp,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import UserDatabaseClient from './UserDatabaseClient';
import UserActivityDashboard from './UserActivityDashboard';

interface User {
  id: string;
  email: string;
  name?: string;
  isSuperAdmin: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
  provider?: string;
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
  lastLogin?: string;
}

interface AdvancedUserManagementProps {
  initialData: User[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
}

const QuickStatsCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-4 w-4 ${change < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

// TODO: Implement UserActionsMenu component when needed
// This component was defined but not used - removed to fix lint warning

const AdvancedFilters: React.FC<{
  onFilterChange: (filters: Record<string, any>) => void;
  onExport: () => void;
  onAddUser: () => void;
}> = ({ onFilterChange, onExport, onAddUser }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

  const handleFilterChange = (key: string, value: string) => {
    const filters = {
      status: statusFilter,
      role: roleFilter,
      provider: providerFilter,
      dateRange: dateFilter,
      emailVerified: verificationFilter,
    };
    
    filters[key as keyof typeof filters] = value;
    onFilterChange(filters);

    // Update local state
    switch (key) {
      case 'status': setStatusFilter(value); break;
      case 'role': setRoleFilter(value); break;
      case 'provider': setProviderFilter(value); break;
      case 'dateRange': setDateFilter(value); break;
      case 'emailVerified': setVerificationFilter(value); break;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddUser}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="pending_verification">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={providerFilter}
            onChange={(e) => handleFilterChange('provider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Providers</option>
            <option value="email">Email</option>
            <option value="google">Google</option>
            <option value="apple">Apple</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration</label>
          <select
            value={dateFilter}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
          <select
            value={verificationFilter}
            onChange={(e) => handleFilterChange('emailVerified', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default function AdvancedUserManagement({
  initialData,
  initialPagination,
  initialSortBy,
  initialSortOrder
}: AdvancedUserManagementProps) {
  const [activeView, setActiveView] = useState<'table' | 'activity'>('table');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Mock statistics
  const quickStats = [
    {
      title: 'Total Users',
      value: initialPagination.total.toLocaleString(),
      change: 12.5,
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Active Users',
      value: Math.floor(initialPagination.total * 0.85).toLocaleString(),
      change: 8.2,
      icon: UserCheck,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Suspended',
      value: Math.floor(initialPagination.total * 0.05),
      change: -15.3,
      icon: UserX,
      color: 'bg-red-100 text-red-600'
    },
    {
      title: 'Pending',
      value: Math.floor(initialPagination.total * 0.1),
      change: 25.7,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600'
    }
  ];

  // TODO: Implement user action handlers when UserActionsMenu is implemented
  // These handlers were defined but not used - removed to fix lint warning

  const handleAddUser = () => {
    // Handle adding new user - would open user creation modal in real implementation
    // TODO: Implement user creation modal
    alert('User creation modal would open');
  };

  const handleExport = () => {
    // Handle data export - would generate and download CSV in real implementation
    // TODO: Implement data export functionality
    alert(`Export would include filters: ${JSON.stringify(filters)}`);
  };

  // TODO: Implement enhanced table columns for future DataTable component
  // These columns were defined but not used - removed to fix lint warning

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced User Management</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive user administration with activity tracking and security controls.
          </p>
        </div>
        
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'table', label: 'Users', icon: Users },
            { key: 'activity', label: 'Activity', icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeView === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <QuickStatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Content based on active view */}
      {activeView === 'table' && (
        <>
          <AdvancedFilters
            onFilterChange={setFilters}
            onExport={handleExport}
            onAddUser={handleAddUser}
          />
          <UserDatabaseClient
            initialData={initialData}
            initialPagination={initialPagination}
            initialSortBy={initialSortBy}
            initialSortOrder={initialSortOrder}
          />
        </>
      )}

      {activeView === 'activity' && (
        <UserActivityDashboard />
      )}

      {/* TODO: Implement profile view when user selection is implemented */}
      {/* Profile view removed to fix lint warning - no way to set selectedUserId */}
    </div>
  );
}
