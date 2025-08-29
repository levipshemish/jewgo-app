'use client';

import React, { useState, useEffect } from 'react';
import { appLogger } from '@/lib/utils/logger';

interface StoreOverviewProps {
  storeData: any;
  onRefresh: () => void;
}

interface AnalyticsData {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageRating: number;
  reviewCount: number;
  recentOrders: any[];
  recentMessages: any[];
  topProducts: any[];
  monthlyRevenue: { month: string; revenue: number }[];
  // Community-specific metrics
  communityStats: {
    gemachItems: number;
    kosherVerifiedItems: number;
    communityEndorsements: number;
    rabbiRecommendations: number;
    shabbosOrders: number;
    holidayOrders: number;
  };
  communityTrustScore: number;
  kosherComplianceRate: number;
}

export default function StoreOverview({ storeData }: StoreOverviewProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y

  useEffect(() => {
    loadAnalytics();
  }, [storeData.store_id, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/shtel/store/${storeData.store_id}/analytics?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      appLogger.error('Error loading store analytics:', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
        <p className="text-gray-600">Start selling to see your store analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Store Overview</h2>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalProducts)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalOrders)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalCustomers)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Community Trust Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Standing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
              <span className="text-xl">🏛️</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{analytics.communityStats?.communityEndorsements || 0}</div>
            <div className="text-sm text-gray-600">Community Endorsements</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
              <span className="text-xl">✅</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{analytics.kosherComplianceRate || 95}%</div>
            <div className="text-sm text-gray-600">Kosher Compliance</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
              <span className="text-xl">📜</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{analytics.communityStats?.rabbiRecommendations || 0}</div>
            <div className="text-sm text-gray-600">Rabbi Recommendations</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
              <span className="text-xl">🤝</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{analytics.communityStats?.gemachItems || 0}</div>
            <div className="text-sm text-gray-600">Gemach Contributions</div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Community Trust Score</span>
            <span className="text-sm font-medium text-gray-900">{analytics.communityTrustScore || 85}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${analytics.communityTrustScore || 85}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on community feedback, kosher compliance, and service quality
          </div>
        </div>
      </div>

      {/* Jewish Calendar Integration */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Jewish Calendar Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">🕯️ Shabbos Orders</span>
              <span className="text-lg font-bold text-blue-600">{analytics.communityStats?.shabbosOrders || 0}</span>
            </div>
            <div className="text-xs text-blue-600">Orders for Shabbos pickup/delivery</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">🎪 Holiday Orders</span>
              <span className="text-lg font-bold text-purple-600">{analytics.communityStats?.holidayOrders || 0}</span>
            </div>
            <div className="text-xs text-purple-600">Orders for Jewish holidays</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">✅ Kosher Items</span>
              <span className="text-lg font-bold text-green-600">{analytics.communityStats?.kosherVerifiedItems || 0}</span>
            </div>
            <div className="text-xs text-green-600">Kosher verified products</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <span className="text-yellow-600 text-sm mr-2">💡</span>
            <span className="text-sm text-yellow-800">
              <strong>Tip:</strong> Enable Shabbos ordering to allow customers to place orders for post-Shabbos pickup
            </span>
          </div>
        </div>
      </div>

      {/* Rating and Reviews */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Rating</h3>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{analytics.averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center mt-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-xl ${i < Math.floor(analytics.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Based on {formatNumber(analytics.reviewCount)} reviews
            </p>
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">5★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <span className="text-sm text-gray-600">70%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <button 
              onClick={() => window.location.href = '/shtel/dashboard?tab=orders'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {analytics.recentOrders.length > 0 ? (
              analytics.recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.order_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#{order.order_id.slice(-8)}</p>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
            <button 
              onClick={() => window.location.href = '/shtel/dashboard?tab=messages'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {analytics.recentMessages.length > 0 ? (
              analytics.recentMessages.slice(0, 5).map((message: any) => (
                <div key={message.message_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{message.sender_name}</p>
                    <p className="text-sm text-gray-600 truncate">{message.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(message.created_at).toLocaleDateString()}</p>
                    {!message.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent messages</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <div className="space-y-3">
          {analytics.topProducts.length > 0 ? (
            analytics.topProducts.slice(0, 5).map((product: any) => (
              <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(product.total_revenue)}</p>
                  <p className="text-sm text-gray-600">{product.sales_count} sales</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No products yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.href = '/shtel/dashboard?tab=products'}
            className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-3">➕</span>
            <span className="font-medium text-blue-700">Add Product</span>
          </button>
          <button 
            onClick={() => window.location.href = '/shtel/dashboard?tab=orders'}
            className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-3">📋</span>
            <span className="font-medium text-green-700">View Orders</span>
          </button>
          <button 
            onClick={() => window.location.href = '/shtel/dashboard?tab=settings'}
            className="flex items-center justify-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mr-3">⚙️</span>
            <span className="font-medium text-purple-700">Store Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
