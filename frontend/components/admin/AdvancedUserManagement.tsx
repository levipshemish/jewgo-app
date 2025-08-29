'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Download, 
  Plus, 
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Shield,
  Mail
} from 'lucide-react';
import UserDatabaseClient from './UserDatabaseClient';
import UserActivityDashboard from './UserActivityDashboard';
import UserProfileManager from './UserProfileManager';

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

const UserActionsMenu: React.FC<{
  user: User;
  onView: (userId: string) => void;
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => void;
  onSendEmail: (userId: string) => void;
}> = ({ user, onView, onEdit, onDelete, onSendEmail }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Eye, label: 'View Profile', onClick: () => onView(user.id), color: 'text-blue-600' },
    { icon: Edit, label: 'Edit User', onClick: () => onEdit(user.id), color: 'text-green-600' },
    { icon: Mail, label: 'Send Email', onClick: () => onSendEmail(user.id), color: 'text-purple-600' },
    { icon: Trash2, label: 'Delete User', onClick: () => onDelete(user.id), color: 'text-red-600' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 ${action.color}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

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
  const [activeView, setActiveView] = useState<'table' | 'activity' | 'profile'>('table');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setActiveView('profile');
  };

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setActiveView('profile');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      // Handle user deletion - would call API in real implementation
      // TODO: Implement user deletion API call
      alert(`User ${userId} would be deleted`);
    }
  };

  const handleSendEmail = (userId: string) => {
    // Handle sending email to user - would open email modal in real implementation
    // TODO: Implement email composition modal
    alert(`Email would be sent to user ${userId}`);
  };

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

  const enhancedColumns = [
    { key: 'id', title: 'ID', sortable: true, width: 'sm' },
    { 
      key: 'name', 
      title: 'User', 
      sortable: true,
      render: (value: any, row: User) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {row.avatarUrl ? (
              <img src={row.avatarUrl} alt={row.name || row.email} className="w-full h-full object-cover" />
            ) : (
              <Users className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name || 'Unnamed User'}</p>
            <p className="text-sm text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Status', 
      sortable: true,
      render: (value: User['status']) => {
        const statusConfig = {
          active: { color: 'bg-green-100 text-green-800', label: 'Active' },
          suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspended' },
          banned: { color: 'bg-red-100 text-red-800', label: 'Banned' },
          pending_verification: { color: 'bg-blue-100 text-blue-800', label: 'Pending' }
        };
        const config = statusConfig[value] || statusConfig.active;
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    { 
      key: 'isSuperAdmin', 
      title: 'Role', 
      sortable: true,
      render: (value: boolean, row: User) => (
        <div className="flex items-center space-x-1">
          {value && <Shield className="h-4 w-4 text-purple-500" />}
          <span className={`text-sm ${value ? 'text-purple-800 font-medium' : 'text-gray-600'}`}>
            {value ? 'Super Admin' : 'User'}
          </span>
        </div>
      )
    },
    { 
      key: 'emailVerified', 
      title: 'Verified', 
      sortable: true,
      render: (value: boolean) => (
        <div className="flex items-center">
          {value ? (
            <UserCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      )
    },
    { key: 'createdAt', title: 'Created', sortable: true, width: 'md' },
    {
      key: 'actions',
      title: 'Actions',
      width: 'sm',
      render: (value: any, row: User) => (
        <UserActionsMenu
          user={row}
          onView={handleViewUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onSendEmail={handleSendEmail}
        />
      )
    }
  ];

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
        {quickStats.map((stat, index) => (
          <QuickStatsCard key={index} {...stat} />
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

      {activeView === 'profile' && selectedUserId && (
        <UserProfileManager
          userId={selectedUserId}
          onClose={() => setActiveView('table')}
          onUserUpdated={(_user) => {
            // Refresh user data if needed - would trigger data refetch in real implementation
            // TODO: Implement user data refresh after update
          }}
        />
      )}
    </div>
  );
}