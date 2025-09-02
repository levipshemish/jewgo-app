'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';

// Local type definitions to match admin system
type AdminRole = 'moderator' | 'data_admin' | 'store_admin' | 'system_admin' | 'super_admin';

type AdminUser = {
  id: string;
  email: string | undefined;
  name: string | null;
  username: string | undefined;
  provider: string;
  avatar_url: string | null;
  providerInfo: any;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: string;
  permissions: string[];
  subscriptionTier: string;
  adminRole: AdminRole | null;
  roleLevel: number;
  isSuperAdmin: boolean;
  token?: string;
};

interface DashboardMetrics {
  totalUsers: number;
  totalRestaurants: number;
  totalReviews: number;
  pendingSubmissions: number;
  userGrowth: number;
  restaurantGrowth: number;
  reviewGrowth: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    responseTime: number;
    errorRate: number;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  href?: string;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

interface DashboardOverviewProps {
  adminUser: AdminUser;
}

function MetricCard({ title, value, change, icon: Icon, color, bgColor, href }: MetricCardProps) {
  const content = (
    <div className={`${bgColor} rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow`}>
      <div className="flex items-center">
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : change < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              ) : null}
              <span className={`text-xs font-medium ${
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {change > 0 ? '+' : ''}{change}% from last month
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function QuickAction({ title, description, icon: Icon, href, color }: QuickActionProps) {
  return (
    <a
      href={href}
      className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex items-start space-x-3">
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </a>
  );
}

function SystemHealthIndicator({ health }: { health: DashboardMetrics['systemHealth'] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Clock;
    }
  };

  const StatusIcon = getStatusIcon(health.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Uptime</span>
          <span className="text-sm font-medium text-gray-900">{health.uptime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Response Time</span>
          <span className="text-sm font-medium text-gray-900">{health.responseTime}ms</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Error Rate</span>
          <span className="text-sm font-medium text-gray-900">{health.errorRate}%</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview({ adminUser }: DashboardOverviewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; action: string; entityType: string; timestamp: string }>>([]);

  useEffect(() => {
    fetchMetrics();
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Live recent activity for system admins and above (SSE with polling fallback)
  useEffect(() => {
    if (adminUser.roleLevel < 3) return;
    let cleanup: (() => void) | null = null;

    try {
      const es = new EventSource('/api/admin/audit/stream?limit=5');
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const logs = (data || []).map((l: any) => ({
            id: String(l.id),
            action: l.action,
            entityType: l.entityType,
            timestamp: l.timestamp,
          }));
          setRecent(logs);
        } catch {}
      };
      es.onerror = () => {
        es.close();
      };
      cleanup = () => es.close();
    } catch {
      // no-op; fallback below
    }

    // Fallback polling every 30s
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/audit?page=1&pageSize=5');
        if (!res.ok) return;
        const data = await res.json();
        const logs = (data.logs || []).map((l: any) => ({
          id: String(l.id),
          action: l.action,
          entityType: l.entityType,
          timestamp: l.timestamp,
        }));
        setRecent(logs);
      } catch {}
    }, 30_000);

    return () => {
      if (cleanup) cleanup();
      clearInterval(interval);
    };
  }, [adminUser.roleLevel]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/metrics');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      setError('Failed to load dashboard metrics');
      
      // Fallback mock data for development
      setMetrics({
        totalUsers: 1247,
        totalRestaurants: 89,
        totalReviews: 543,
        pendingSubmissions: 12,
        userGrowth: 12.5,
        restaurantGrowth: 8.3,
        reviewGrowth: 15.7,
        systemHealth: {
          status: 'healthy',
          uptime: '99.8%',
          responseTime: 245,
          errorRate: 0.02
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    const baseActions = [
      {
        title: 'Review Submissions',
        description: 'Approve or reject restaurant submissions',
        icon: Building2,
        href: '/admin/restaurants',
        color: 'bg-blue-500'
      },
      {
        title: 'Moderate Reviews',
        description: 'Review flagged user reviews',
        icon: MessageSquare,
        href: '/admin/database/reviews?status=pending',
        color: 'bg-green-500'
      }
    ];

    if (adminUser.roleLevel >= 2) { // data_admin or higher
      baseActions.push({
        title: 'View Analytics',
        description: 'System metrics and reports',
        icon: BarChart3,
        href: '/admin/analytics',
        color: 'bg-purple-500'
      });
    }

    if (adminUser.roleLevel >= 3) { // system_admin or higher
      baseActions.push({
        title: 'System Settings',
        description: 'Configure system preferences',
        icon: Settings,
        href: '/admin/settings',
        color: 'bg-orange-500'
      });
    }

    if (adminUser.isSuperAdmin) {
      baseActions.push({
        title: 'Manage Roles',
        description: 'Assign user admin roles',
        icon: Shield,
        href: '/admin/security/roles',
        color: 'bg-red-500'
      });
    }

    return baseActions;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          {adminUser.roleLevel === 4 ? 'Super Admin Dashboard' : 
           adminUser.roleLevel === 3 ? 'System Admin Dashboard' :
           adminUser.roleLevel === 2 ? 'Data Admin Dashboard' : 'Admin Dashboard'}
        </h1>
        <p className="text-gray-600">
          Welcome back, {adminUser.name || adminUser.email}. Here&apos;s an overview of your system.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers?.toLocaleString() || '0'}
          change={metrics?.userGrowth}
          icon={Users}
          color="bg-blue-500"
          bgColor="bg-blue-50"
          href="/admin/database/users"
        />
        <MetricCard
          title="Restaurants"
          value={metrics?.totalRestaurants?.toLocaleString() || '0'}
          change={metrics?.restaurantGrowth}
          icon={Building2}
          color="bg-green-500"
          bgColor="bg-green-50"
          href="/admin/database/restaurants"
        />
        <MetricCard
          title="Reviews"
          value={metrics?.totalReviews?.toLocaleString() || '0'}
          change={metrics?.reviewGrowth}
          icon={MessageSquare}
          color="bg-yellow-500"
          bgColor="bg-yellow-50"
          href="/admin/database/reviews"
        />
        <MetricCard
          title="Pending"
          value={metrics?.pendingSubmissions?.toLocaleString() || '0'}
          icon={Clock}
          color="bg-red-500"
          bgColor="bg-red-50"
          href="/admin/restaurants"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>

        {/* System Health */}
        {metrics?.systemHealth && (
          <div>
            <SystemHealthIndicator health={metrics.systemHealth} />
          </div>
        )}
      </div>

      {/* Recent Activity (live, polled) */}
      {adminUser.roleLevel >= 3 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-gray-600">{item.action.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <a href="/admin/audit" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View all activity →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
