'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Package, 
  ShoppingCart, 
  Mail,
  DollarSign,
  TrendingUp,
  Users,
  Star,
  Clock,
  AlertCircle
} from 'lucide-react';

import type { AdminUser } from '@/lib/admin/types';

interface StoreMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  pendingOrders: number;
  unreadMessages: number;
  productsGrowth: number;
  ordersGrowth: number;
  revenueGrowth: number;
}

interface StoreAdminDashboardProps {
  adminUser: AdminUser;
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

function MetricCard({ title, value, change, icon: Icon, color, bgColor, href }: MetricCardProps) {
  const content = (
    <div className={`${bgColor} rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              <TrendingUp className={`h-3 w-3 mr-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs font-medium ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function QuickAction({ title, description, icon: Icon, href, color }: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
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

export default function StoreAdminDashboard({ adminUser }: StoreAdminDashboardProps) {
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreMetrics();
    // Refresh metrics every 2 minutes for store dashboard
    const interval = setInterval(fetchStoreMetrics, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStoreMetrics = async () => {
    try {
      setLoading(true);
      // For now, use mock data since store metrics API isn't built yet
      // TODO: Replace with actual API call to /api/admin/store/metrics
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock store metrics data
      setMetrics({
        totalProducts: 45,
        totalOrders: 128,
        totalRevenue: 15420.50,
        averageRating: 4.7,
        pendingOrders: 8,
        unreadMessages: 3,
        productsGrowth: 12.5,
        ordersGrowth: 18.3,
        revenueGrowth: 22.1
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching store metrics:', error);
      setError('Failed to load store metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
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
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Add Product',
      description: 'Add new product to your store',
      icon: Package,
      href: '/shtel/dashboard?tab=products&action=add',
      color: 'bg-green-500'
    },
    {
      title: 'View Orders',
      description: 'Manage customer orders',
      icon: ShoppingCart,
      href: '/shtel/dashboard?tab=orders',
      color: 'bg-blue-500'
    },
    {
      title: 'Check Messages',
      description: 'Respond to customer messages',
      icon: Mail,
      href: '/shtel/dashboard?tab=messages',
      color: 'bg-purple-500'
    },
    {
      title: 'Store Settings',
      description: 'Update store configuration',
      icon: ShoppingBag,
      href: '/shtel/dashboard?tab=settings',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Store Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {adminUser.name || adminUser.email}. Here&apos;s your store overview.
        </p>
      </div>

      {/* Store Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Products"
          value={metrics?.totalProducts?.toLocaleString() || '0'}
          change={metrics?.productsGrowth}
          icon={Package}
          color="bg-green-500"
          bgColor="bg-green-50"
          href="/shtel/dashboard?tab=products"
        />
        <MetricCard
          title="Total Orders"
          value={metrics?.totalOrders?.toLocaleString() || '0'}
          change={metrics?.ordersGrowth}
          icon={ShoppingCart}
          color="bg-blue-500"
          bgColor="bg-blue-50"
          href="/shtel/dashboard?tab=orders"
        />
        <MetricCard
          title="Revenue"
          value={`$${metrics?.totalRevenue?.toLocaleString() || '0'}`}
          change={metrics?.revenueGrowth}
          icon={DollarSign}
          color="bg-yellow-500"
          bgColor="bg-yellow-50"
          href="/admin/store/analytics"
        />
        <MetricCard
          title="Avg Rating"
          value={`${metrics?.averageRating || '0'} ★`}
          icon={Star}
          color="bg-pink-500"
          bgColor="bg-pink-50"
        />
      </div>

      {/* Alert Cards for Attention Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics?.pendingOrders && metrics.pendingOrders > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-amber-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  {metrics.pendingOrders} Pending Orders
                </h3>
                <p className="text-xs text-amber-600 mt-1">
                  Orders waiting for your attention
                </p>
              </div>
              <a 
                href="/shtel/dashboard?tab=orders&status=pending"
                className="ml-auto text-amber-700 hover:text-amber-800 text-sm font-medium"
              >
                View →
              </a>
            </div>
          </div>
        )}
        
        {metrics?.unreadMessages && metrics.unreadMessages > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  {metrics.unreadMessages} Unread Messages
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Customer messages awaiting response
                </p>
              </div>
              <a 
                href="/shtel/dashboard?tab=messages&status=unread"
                className="ml-auto text-blue-700 hover:text-blue-800 text-sm font-medium"
              >
                View →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <QuickAction key={index} {...action} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Store Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">New order #12845 received</span>
            <span className="text-gray-400">15 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Product &quot;Kosher Cookies&quot; updated</span>
            <span className="text-gray-400">2 hours ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Customer message received</span>
            <span className="text-gray-400">4 hours ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Order #12842 shipped</span>
            <span className="text-gray-400">6 hours ago</span>
          </div>
        </div>
        <div className="mt-4">
          <a href="/shtel/dashboard?tab=activity" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all activity →
          </a>
        </div>
      </div>
    </div>
  );
}