'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Shield, 
  Activity, 
  Users, 
  Bell, 
  Globe, 
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

export default function SystemSettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch system data
  const fetchSystemData = async () => {
    try {
      setLoading(true);
      
      // Fetch system stats
      const statsResponse = await fetch('/api/admin/system/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch system config
      const configResponse = await fetch('/api/admin/system/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  // Save system configuration
  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        // Show success message
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle config changes
  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  // Get health status color
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get health icon
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">
          Monitor system health, configure settings, and manage administrative controls.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'configuration', label: 'Configuration', icon: Settings },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'monitoring', label: 'Monitoring', icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Health */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  {getHealthIcon(stats?.systemHealth || 'unknown')}
                  <div>
                    <p className="text-sm font-medium text-gray-900">System Status</p>
                    <p className={`text-sm capitalize ${getHealthColor(stats?.systemHealth || 'unknown')}`}>
                      {stats?.systemHealth || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Uptime</p>
                    <p className="text-sm text-gray-600">{stats?.uptime || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active Sessions</p>
                    <p className="text-sm text-gray-600">{stats?.activeSessions || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Database Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats?.totalUsers || 0}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats?.totalRestaurants || 0}</p>
                  <p className="text-sm text-gray-600">Restaurants</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{stats?.totalReviews || 0}</p>
                  <p className="text-sm text-gray-600">Reviews</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats?.totalSynagogues || 0}</p>
                  <p className="text-sm text-gray-600">Synagogues</p>
                </div>
              </div>
            </div>

            {/* Pending Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Approvals</h3>
              <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {stats?.pendingApprovals || 0} items require attention
                  </p>
                  <p className="text-sm text-gray-600">
                    Reviews, restaurants, and other content awaiting approval
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && config && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
              
              <div className="space-y-4">
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                    <p className="text-sm text-gray-600">Enable maintenance mode to restrict access</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.maintenanceMode}
                      onChange={(e) => handleConfigChange('maintenanceMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Debug Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Debug Mode</p>
                    <p className="text-sm text-gray-600">Enable detailed logging and debugging</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.debugMode}
                      onChange={(e) => handleConfigChange('debugMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Send email notifications for system events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.emailNotifications}
                      onChange={(e) => handleConfigChange('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Audit Logging */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Audit Logging</p>
                    <p className="text-sm text-gray-600">Log all administrative actions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.auditLogging}
                      onChange={(e) => handleConfigChange('auditLogging', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Rate Limiting */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rate Limiting</p>
                    <p className="text-sm text-gray-600">Enable API rate limiting</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.rateLimiting}
                      onChange={(e) => handleConfigChange('rateLimiting', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Authentication</h4>
                  <p className="text-sm text-blue-700">
                    Supabase authentication is configured and active. All admin routes are protected.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Role-Based Access Control</h4>
                  <p className="text-sm text-green-700">
                    RBAC is implemented with granular permissions for different admin roles.
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">Audit Logging</h4>
                  <p className="text-sm text-yellow-700">
                    All administrative actions are logged for security and compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Monitoring</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</h4>
                  <p className="text-sm text-gray-600">
                    Monitor system performance, response times, and resource usage.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Error Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Track and monitor application errors and exceptions.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">User Activity</h4>
                  <p className="text-sm text-gray-600">
                    Monitor user activity, login patterns, and suspicious behavior.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
