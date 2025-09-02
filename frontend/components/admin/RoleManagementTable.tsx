'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAdminRoles, useAssignRole, useRevokeRole, useAvailableRoles } from '@/hooks/useAdminRoles';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  role_level?: number;
  assigned_at?: string;
  expires_at?: string;
  notes?: string;
}

interface RoleData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

interface RoleManagementTableProps {
  initialData: RoleData;
}

export default function RoleManagementTable({ initialData }: RoleManagementTableProps) {
  const _router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showRevocationModal, setShowRevocationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [includeAll, setIncludeAll] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Custom hooks for data fetching and mutations
  const { data, isLoading, error, mutate } = useAdminRoles({
    page,
    limit: 50,
    search: searchTerm,
    role: roleFilter,
    include_all: includeAll,

  }, initialData);

  const assignRoleMutation = useAssignRole();
  const revokeRoleMutation = useRevokeRole();
  const { roles: availableRoles, isLoading: rolesLoading, error: rolesError } = useAvailableRoles();

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Check if a role is expired
  const isRoleExpired = useCallback((user: User) => {
    if (!user.expires_at) return false;
    return new Date(user.expires_at) < new Date();
  }, []);

  // Handle role assignment
  const handleAssignRole = async (userId: string, role: string, expiresAt?: string, notes?: string) => {
    try {
      await assignRoleMutation.mutateAsync({
        user_id: userId,
        role,
        expires_at: expiresAt,
        notes,
      });
      
      toast.success(`Role ${role} assigned successfully`);
      setShowAssignmentModal(false);
      setSelectedUser(null);
      setSelectedRole('');
      mutate(); // Refresh data
    } catch (error) {
      const message = (error instanceof Error && error.message) ? error.message : 'Failed to assign role';
      toast.error(message);
      // Ensure rollback revalidation for optimistic updates (Comment 6)
      mutate();
      console.error('Role assignment error:', error);
    }
  };

  // Handle role revocation
  const handleRevokeRole = async (userId: string, role: string) => {
    try {
      await revokeRoleMutation.mutateAsync({
        user_id: userId,
        role,
      });
      
      toast.success(`Role ${role} revoked successfully`);
      setShowRevocationModal(false);
      setSelectedUser(null);
      setSelectedRole('');
      mutate(); // Refresh data
    } catch (error) {
      const message = (error instanceof Error && error.message) ? error.message : 'Failed to revoke role';
      toast.error(message);
      // Ensure rollback revalidation (Comment 6)
      mutate();
      console.error('Role revocation error:', error);
    }
  };

  // Get role badge styling
  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    
    const roleStyles = {
      moderator: 'bg-blue-100 text-blue-800',
      data_admin: 'bg-green-100 text-green-800',
      system_admin: 'bg-orange-100 text-orange-800',
      super_admin: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyles[role as keyof typeof roleStyles] || 'bg-gray-100 text-gray-800'}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Get role level indicator
  const getRoleLevelIndicator = (level?: number) => {
    if (!level) return null;
    
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i <= level ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading users</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'An error occurred while loading user data'}
        </p>
        <div className="mt-6">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <label htmlFor="search-users" className="sr-only">Search users</label>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              id="search-users"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md">
            <input
              type="checkbox"
              id="include-all"
              checked={includeAll}
              onChange={(e) => setIncludeAll(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="include-all" className="text-sm text-gray-700 whitespace-nowrap">
              All users
            </label>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md">
            <input
              type="checkbox"
              id="include-expired"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="include-expired" className="text-sm text-gray-700 whitespace-nowrap">
              Include expired
            </label>
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="filter-role" className="sr-only">Filter by role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={rolesLoading}
              id="filter-role"
            >
              <option value="">All Roles</option>
              {rolesLoading ? (
                <option disabled>Loading roles...</option>
              ) : rolesError ? (
                <option disabled>Error loading roles</option>
              ) : (
                availableRoles.map((role) => (
                  <option key={role.id || role.name} value={role.name}>
                    {role.display_name || role.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <button
            onClick={() => {
              setSelectedUser(null);
              setShowAssignmentModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Assign Role
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {/* Header row with Select All */}
            <li className="px-6 py-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={data?.users?.length ? selectedUsers.length === (data?.users?.length || 0) : false}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedUsers((data?.users || []).map(u => u.id));
                    else setSelectedUsers([]);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col">
                    <label htmlFor="bulk-revoke-role" className="sr-only">Select role to revoke</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="block w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={rolesLoading || bulkLoading}
                      id="bulk-revoke-role"
                    >
                      <option value="">Select role to revoke...</option>
                      {rolesLoading ? (
                        <option disabled>Loading roles...</option>
                      ) : rolesError ? (
                        <option disabled>Error loading roles</option>
                      ) : (
                        availableRoles.map((role) => (
                          <option key={role.id || role.name} value={role.name}>
                            {role.display_name || role.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowAssignmentModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    disabled={bulkLoading}
                  >{bulkLoading ? 'Working...' : 'Assign Selected'}</button>
                  <button
                    onClick={async () => {
                      if (!selectedRole) {
                        toast.error('Select a role to revoke');
                        return;
                      }
                      
                      // Prevent bulk revocation of super_admin roles
                      if (selectedRole === 'super_admin') {
                        const hasSuperAdmin = data?.users?.some(user => 
                          selectedUsers.includes(user.id) && user.role === 'super_admin'
                        );
                        
                        if (hasSuperAdmin) {
                          const confirmed = window.confirm(
                            'Warning: You are attempting to revoke super_admin roles. This action requires individual confirmation for each user. Please use the individual revoke buttons instead.'
                          );
                          if (!confirmed) return;
                          
                          // Fall back to individual revocation for super_admin
                          const superAdminUsers = data?.users?.filter(user => 
                            selectedUsers.includes(user.id) && user.role === 'super_admin'
                          ) || [];
                          
                          if (superAdminUsers.length > 0) {
                            toast.error(`Cannot bulk revoke super_admin roles. Please revoke individually for: ${superAdminUsers.map(u => u.name || u.email).join(', ')}`);
                            return;
                          }
                        }
                      }
                      
                      setBulkLoading(true);
                      const ids = [...selectedUsers];
                      const promises = ids.map(uid => revokeRoleMutation.mutateAsync({ user_id: uid, role: selectedRole }));
                      const results = await Promise.allSettled(promises);
                      const failures = results.filter(r => r.status === 'rejected');
                      if (failures.length > 0) {
                        toast.error(`${failures.length} revocations failed`);
                      } else {
                        toast.success('Roles revoked');
                      }
                      await mutate();
                      setSelectedUsers([]);
                      setSelectedRole('');
                      setBulkLoading(false);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    disabled={bulkLoading || !selectedRole}
                  >{bulkLoading ? 'Working...' : 'Revoke Selected'}</button>
                </div>
              )}
            </li>
            {data?.users?.map((user) => (
              <li key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${user.name || user.email}`}
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        setSelectedUsers(prev => e.target.checked ? Array.from(new Set([...prev, user.id])) : prev.filter(id => id !== user.id));
                      }}
                      className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-700">
                          {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleBadge(user.role)}
                      {getRoleLevelIndicator(user.role_level)}
                      {user.role && isRoleExpired(user) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignmentModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      
                      {user.role && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole(user.role!);
                            setShowRevocationModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {data?.users?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter ? 'Try adjusting your search or filter criteria.' : 'No users with admin roles found.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} users
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); mutate(); }}
              disabled={data.page <= 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => { setPage(p => p + 1); mutate(); }}
              disabled={!data.has_more}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showAssignmentModal && (
        <RoleAssignmentModal
          user={selectedUser}
          onAssign={handleAssignRole}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedUser(null);
            setSelectedRole('');
          }}
          isLoading={assignRoleMutation.isLoading}
          availableUsers={data?.users || []}
          availableRoles={availableRoles}
          rolesLoading={rolesLoading}
          rolesError={rolesError}
        />
      )}

      {/* Role Revocation Modal */}
      {showRevocationModal && selectedUser && selectedRole && (
        <RoleRevocationModal
          user={selectedUser}
          role={selectedRole}
          onRevoke={handleRevokeRole}
          onClose={() => {
            setShowRevocationModal(false);
            setSelectedUser(null);
            setSelectedRole('');
          }}
          isLoading={revokeRoleMutation.isLoading}
        />
      )}
    </div>
  );
}

// Role Assignment Modal Component
interface RoleAssignmentModalProps {
  user: User | null;
  onAssign: (userId: string, role: string, expiresAt?: string, notes?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  availableUsers?: User[];
  availableRoles: any[];
  rolesLoading: boolean;
  rolesError: any;
}

function RoleAssignmentModal({ user, onAssign, onClose, isLoading, availableUsers = [], availableRoles, rolesLoading, rolesError }: RoleAssignmentModalProps) {
  const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
  const [role, setRole] = useState(user?.role || '');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>(availableUsers);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [superConfirm, setSuperConfirm] = useState('');
  const firstFieldRef = useCallback((node: HTMLInputElement | HTMLSelectElement | null) => {
    if (node && mounted) {
      node.focus();
    }
  }, [mounted]);
  // Focus trap
  const modalRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = node.querySelectorAll<HTMLElement>('a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { (last as HTMLElement)?.focus(); e.preventDefault(); }
      } else {
        if (document.activeElement === last) { (first as HTMLElement)?.focus(); e.preventDefault(); }
      }
    };
    node.addEventListener('keydown', handleKeyDown);
  }, []);
  // Mount flag for focus
  useEffect(() => { setMounted(true); }, []);

  // Debounced user search against /api/admin/roles?include_all=true&search=...
  const [debounceId, setDebounceId] = useState<any>(null);
  const onSearchUsers = useCallback((q: string) => {
    setUserQuery(q);
    if (debounceId) clearTimeout(debounceId);
    const id = setTimeout(async () => {
      if (!q) {
        setUserOptions(availableUsers);
        return;
      }
      setIsSearching(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({ include_all: 'true', search: q, limit: '20', page: '1' });
        const resp = await fetch(`/api/admin/roles?${params.toString()}`);
        const json = await resp.json();
        const users: User[] = json?.data?.users || [];
        setUserOptions(users);
      } catch (e) {
        setSearchError('Failed to search users');
      } finally {
        setIsSearching(false);
      }
    }, 300);
    setDebounceId(id);
  }, [availableUsers, debounceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?.id || selectedUserId;
    if (!userId || !role) return;
    if (role === 'super_admin' && superConfirm !== 'CONFIRM') return;
    
    // Convert expires_at to UTC ISO string for Supabase
    const formattedExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : undefined;
    
    await onAssign(userId, role, formattedExpiresAt, notes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" ref={modalRef}>
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {user ? `Assign Role to ${user.name}` : 'Assign Role'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User selection when no user is pre-selected */}
            {!user && (
              <div>
                <label htmlFor="select-user" className="block text-sm font-medium text-gray-700">Select User</label>
                <input
                  type="text"
                  placeholder="Type to search users..."
                  value={userQuery}
                  onChange={(e) => onSearchUsers(e.target.value)}
                  id="select-user-search"
                  ref={firstFieldRef as any}
                  className="mt-1 mb-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  id="select-user"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Choose a user</option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {isSearching && <p className="mt-1 text-xs text-gray-500">Searching...</p>}
                {searchError && <p className="mt-1 text-xs text-red-600">{searchError}</p>}
              </div>
            )}
            
            <div>
              <label htmlFor="assign-role" className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                disabled={rolesLoading}
                id="assign-role"
                ref={!user ? undefined : (firstFieldRef as any)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select a role</option>
                {rolesLoading ? (
                  <option disabled>Loading roles...</option>
                ) : rolesError ? (
                  <option disabled>Error loading roles</option>
                ) : (
                  availableRoles.map((roleOption) => (
                    <option key={roleOption.id || roleOption.name} value={roleOption.name}>
                      {roleOption.display_name || roleOption.name}
                    </option>
                  ))
                )}
              </select>
              {role === 'super_admin' && (
                <div className="mt-3 p-3 border border-red-200 rounded bg-red-50">
                  <p className="text-sm text-red-700 font-semibold">Warning: Assigning super_admin grants full system access.</p>
                  <p className="text-xs text-red-700 mt-1">Type CONFIRM to enable submission.</p>
                  <input
                    type="text"
                    value={superConfirm}
                    onChange={(e) => setSuperConfirm(e.target.value)}
                    placeholder="Type CONFIRM"
                    className="mt-2 block w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm bg-white"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="assign-expires" className="block text-sm font-medium text-gray-700">Expires At (UTC, Optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                id="assign-expires"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Please provide date/time in your local time; it will be saved as UTC.</p>
            </div>
            
            <div>
              <label htmlFor="assign-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                id="assign-notes"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Reason for role assignment..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !role || (role === 'super_admin' && superConfirm !== 'CONFIRM')}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Role Revocation Modal Component
interface RoleRevocationModalProps {
  user: User;
  role: string;
  onRevoke: (userId: string, role: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function RoleRevocationModal({ user, role, onRevoke, onClose, isLoading }: RoleRevocationModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRevoke(user.id, role);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 text-center mt-4">
            Revoke Role
          </h3>
          
          <p className="text-sm text-gray-500 text-center mt-2">
            Are you sure you want to revoke the <strong>{role.replace('_', ' ')}</strong> role from <strong>{user.name}</strong>?
          </p>
          
          <p className="text-xs text-gray-400 text-center mt-2">
            This action cannot be undone and will immediately remove all associated permissions.
          </p>
          
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Revoking...' : 'Revoke Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
