'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Activity, 
  Users, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Crown
} from 'lucide-react';
import { AdminUser } from '@/lib/admin/types';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { useAdminCsrf } from '@/lib/admin/hooks';

interface SystemStats {
  totalUsers: number;
  totalRestaurants: number;
  totalReviews: number;
  totalSynagogues: number;
  totalKosherPlaces: number;
  pendingApprovals: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
  uptime: string;
  activeSessions: number;
}

interface SystemConfig {
  maintenanceMode: boolean;
  debugMode: boolean;
  emailNotifications: boolean;
  auditLogging: boolean;
  rateLimiting: boolean;
  backupFrequency: string;
  sessionTimeout: number;
  maxFileSize: number;
}

interface AdminRole {
  id: number;
  user_id: string;
  role: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
  user: {
    id: string;
    email: string;
    name?: string;
    issuperadmin: boolean;
  };
  assignedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

interface AdminRolesData {
  data: AdminRole[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function SystemSettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [adminRoles, setAdminRoles] = useState<AdminRolesData | null>(null);
  const [roleEdits, setRoleEdits] = useState<Record<number, { is_active?: boolean; expires_at?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const { showSuccess, showError } = useToast();
  const { token: csrf } = useAdminCsrf();

  // Fetch system data
  const fetchSystemData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current admin user
      const userResponse = await fetch('/api/admin/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setAdminUser(userData);
      }

      // Fetch system stats
      const statsResponse = await fetch('/api/admin/system/stats', {
        headers: { 'x-csrf-token': csrf || '' },
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || statsData);
      } else {
        // Graceful fallback
        setStats({
          totalUsers: 0,
          totalRestaurants: 0,
          totalReviews: 0,
          totalSynagogues: 0,
          totalKosherPlaces: 0,
          pendingApprovals: 0,
          systemHealth: 'warning',
          lastBackup: 'unknown',
          uptime: 'unknown',
          activeSessions: 0,
        });
      }

      // Fetch system config
      const configResponse = await fetch('/api/admin/system/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      } else {
        // Default configuration fallback
        setConfig({
          maintenanceMode: false,
          debugMode: false,
          emailNotifications: true,
          auditLogging: true,
          rateLimiting: true,
          backupFrequency: 'daily',
          sessionTimeout: 60,
          maxFileSize: 10,
        });
      }

      // Fetch admin roles (only if user has permission)
      if (adminUser?.isSuperAdmin) {
        const rolesResponse = await fetch('/api/admin/roles');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setAdminRoles(rolesData);
        }
      }
    } catch (error) {
      console.error('Error fetching system data:', error);
      // Always set fallback values in error case to ensure UI state
      setStats({
        totalUsers: 0,
        totalRestaurants: 0,
        totalReviews: 0,
        totalSynagogues: 0,
        totalKosherPlaces: 0,
        pendingApprovals: 0,
        systemHealth: 'warning',
        lastBackup: 'unknown',
        uptime: 'unknown',
        activeSessions: 0,
      });
      setConfig({
        maintenanceMode: false,
        debugMode: false,
        emailNotifications: true,
        auditLogging: true,
        rateLimiting: true,
        backupFrequency: 'daily',
        sessionTimeout: 60,
        maxFileSize: 10,
      });
    } finally {
      setLoading(false);
    }
  }, [csrf, adminUser?.isSuperAdmin]);

  useEffect(() => {
    fetchSystemData();
  }, [adminUser?.isSuperAdmin, fetchSystemData]);

  // Save system configuration
  const saveConfig = async () => {
    if (!config) {return;}

    try {
      setSaving(true);
      const response = await fetch('/api/admin/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showSuccess('Configuration saved successfully');
      } else {
        showError('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  // Role assignment UI omitted; API available via Roles tab actions

  // Handle role removal
  const removeRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/roles?userId=${userId}&role=${role}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrf || '',
        },
      });

      if (response.ok) {
        // Refresh admin roles
        const rolesResponse = await fetch('/api/admin/roles');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setAdminRoles(rolesData);
        }
        showSuccess('Role removed successfully');
      } else {
        showError('Failed to remove role');
      }
    } catch (error) {
      console.error('Error removing role:', error);
      showError('An error occurred while removing role');
    }
  };

  // Update a role inline (active/expiry)
  const updateRole = async (id: number) => {
    try {
      const edits = roleEdits[id];
      if (!edits) {return;}
      const payload: any = { id };
      if (typeof edits.is_active === 'boolean') {payload.isActive = edits.is_active;}
      if (edits.expires_at) {payload.expiresAt = edits.expires_at;}
      const response = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf || '',
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        // Refresh roles
        const rolesResponse = await fetch('/api/admin/roles');
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          setAdminRoles(rolesData);
          // Clear edits for this row
          setRoleEdits((prev) => ({ ...prev, [id]: {} }));
        }
        showSuccess('Role updated successfully');
      } else {
        showError('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showError('An error occurred while updating role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">
          Manage system configuration, monitor performance, and administer user roles.
        </p>
      </div>

      {/* Current User Role Info */}
      {adminUser && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">Your Role Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {adminUser.adminRole || 'Admin'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Permissions</p>
              <p className="text-lg font-semibold text-gray-900">
                {adminUser.permissions.length} permissions
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Super Admin</p>
              <p className="text-lg font-semibold text-gray-900">
                {adminUser.isSuperAdmin ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuration
            </button>
            {adminUser?.isSuperAdmin && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Role Management
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">Restaurants</p>
                      <p className="text-2xl font-bold text-green-900">{stats.totalRestaurants.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-600">Reviews</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.totalReviews.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600">Pending</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.pendingApprovals.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                  <div className="flex items-center space-x-2">
                    {stats.systemHealth === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {stats.systemHealth === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                    {stats.systemHealth === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="text-sm font-medium text-gray-900 capitalize">{stats.systemHealth}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && config && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                    <input
                      type="checkbox"
                      checked={config.maintenanceMode}
                      onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                    <input
                      type="checkbox"
                      checked={config.debugMode}
                      onChange={(e) => setConfig({ ...config, debugMode: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                    <input
                      type="checkbox"
                      checked={config.emailNotifications}
                      onChange={(e) => setConfig({ ...config, emailNotifications: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Audit Logging</label>
                    <input
                      type="checkbox"
                      checked={config.auditLogging}
                      onChange={(e) => setConfig({ ...config, auditLogging: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Rate Limiting</label>
                    <input
                      type="checkbox"
                      checked={config.rateLimiting}
                      onChange={(e) => setConfig({ ...config, rateLimiting: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={config.sessionTimeout}
                      onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Management Tab */}
          {activeTab === 'roles' && adminUser?.isSuperAdmin && adminRoles && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Admin Role Management</h3>
                <button
                  onClick={() => fetchSystemData()}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminRoles.data.map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {role.user.name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">{role.user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {role.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {role.assignedBy.name || role.assignedBy.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(role.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="date"
                            value={
                              roleEdits[role.id]?.expires_at !== undefined
                                ? (roleEdits[role.id]?.expires_at || '')
                                : (role.expires_at ? new Date(role.expires_at).toISOString().slice(0,10) : '')
                            }
                            onChange={(e) => setRoleEdits((prev) => ({
                              ...prev,
                              [role.id]: { ...prev[role.id], expires_at: e.target.value }
                            }))}
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={
                                roleEdits[role.id]?.is_active !== undefined
                                  ? !!roleEdits[role.id]?.is_active
                                  : !!role.is_active
                              }
                              onChange={(e) => setRoleEdits((prev) => ({
                                ...prev,
                                [role.id]: { ...prev[role.id], is_active: e.target.checked }
                              }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">Active</span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button
                            onClick={() => updateRole(role.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => removeRole(role.user_id, role.role)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
