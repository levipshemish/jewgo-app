'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  MessageSquare, 
  Star,
  Activity,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface AnalyticsData {
  growthMetrics: {
    usersGrowth: { current: number; previous: number; percentage: number };
    restaurantsGrowth: { current: number; previous: number; percentage: number };
    reviewsGrowth: { current: number; previous: number; percentage: number };
  };
  activityStats: {
    dailySignups: { date: string; count: number }[];
    reviewsPerDay: { date: string; count: number }[];
    popularCities: { city: string; count: number }[];
    topRatedRestaurants: { name: string; rating: number; reviewCount: number }[];
  };
  systemHealth: {
    apiLatency: number;
    errorRate: number;
    uptime: number;
    activeConnections: number;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, change, icon: Icon, color, bgColor }: MetricCardProps) {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-2">
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

interface SimpleChartProps {
  data: { date: string; count: number }[];
  title: string;
  color: string;
}

function SimpleLineChart({ data, title, color }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.count));
  const height = 100;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative" style={{ height: `${height}px` }}>
        <svg width="100%" height={height} className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.3" />
              <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={height * ratio}
              x2="100%"
              y2={height * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Line path */}
          <path
            d={`M ${data.map((point, index) => 
              `${(index / (data.length - 1)) * 100}% ${height - (point.count / maxValue) * height}`
            ).join(' L ')}`}
            fill="none"
            stroke={`rgb(${color})`}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Fill area */}
          <path
            d={`M 0% ${height} L ${data.map((point, index) => 
              `${(index / (data.length - 1)) * 100}% ${height - (point.count / maxValue) * height}`
            ).join(' L ')} L 100% ${height} Z`}
            fill={`url(#gradient-${color})`}
          />
          
          {/* Data points */}
          {data.map((point, index) => (
            <circle
              key={index}
              cx={`${(index / (data.length - 1)) * 100}%`}
              cy={height - (point.count / maxValue) * height}
              r="3"
              fill={`rgb(${color})`}
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

interface TopListProps {
  title: string;
  items: { name: string; rating?: number; count: number }[];
  showRating?: boolean;
}

function TopList({ title, items, showRating = false }: TopListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">{index + 1}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                {showRating && item.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-gray-500">{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {showRating ? `${item.count} reviews` : item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  // Generate sample data for demonstration
  const generateSampleData = useCallback((): AnalyticsData => {
    const today = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 50) + 10
      };
    });

    return {
      growthMetrics: {
        usersGrowth: { current: 1247, previous: 1180, percentage: 5.7 },
        restaurantsGrowth: { current: 342, previous: 320, percentage: 6.9 },
        reviewsGrowth: { current: 2834, previous: 2654, percentage: 6.8 },
      },
      activityStats: {
        dailySignups: dailyData,
        reviewsPerDay: dailyData.map(d => ({ ...d, count: Math.floor(Math.random() * 30) + 5 })),
        popularCities: [
          { city: 'New York', count: 156 },
          { city: 'Los Angeles', count: 134 },
          { city: 'Chicago', count: 98 },
          { city: 'Miami', count: 87 },
          { city: 'Boston', count: 76 }
        ],
        topRatedRestaurants: [
          { name: 'Kosher Deluxe', rating: 4.8, reviewCount: 127 },
          { name: 'Jerusalem Grill', rating: 4.7, reviewCount: 89 },
          { name: 'Shalom Kitchen', rating: 4.6, reviewCount: 156 },
          { name: 'Tov Pizza', rating: 4.5, reviewCount: 203 },
          { name: 'Bagel World', rating: 4.4, reviewCount: 91 }
        ]
      },
      systemHealth: {
        apiLatency: 125,
        errorRate: 0.02,
        uptime: 99.9,
        activeConnections: 247
      }
    };
  }, [timeRange]);

  useEffect(() => {
    // In a real app, fetch analytics data from API
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalyticsData(generateSampleData());
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setAnalyticsData(generateSampleData()); // Fallback to sample data
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange, generateSampleData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {return null;}

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor your platform&apos;s performance and growth</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Users"
          value={analyticsData.growthMetrics.usersGrowth.current.toLocaleString()}
          change={analyticsData.growthMetrics.usersGrowth.percentage}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Total Restaurants"
          value={analyticsData.growthMetrics.restaurantsGrowth.current.toLocaleString()}
          change={analyticsData.growthMetrics.restaurantsGrowth.percentage}
          icon={Building2}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Total Reviews"
          value={analyticsData.growthMetrics.reviewsGrowth.current.toLocaleString()}
          change={analyticsData.growthMetrics.reviewsGrowth.percentage}
          icon={MessageSquare}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart
          data={analyticsData.activityStats.dailySignups}
          title="Daily User Signups"
          color="59, 130, 246" // blue-500
        />
        <SimpleLineChart
          data={analyticsData.activityStats.reviewsPerDay}
          title="Daily Reviews"
          color="16, 185, 129" // green-500
        />
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopList
          title="Popular Cities"
          items={analyticsData.activityStats.popularCities.map(c => ({ name: c.city, count: c.count }))}
        />
        <TopList
          title="Top Rated Restaurants"
          items={analyticsData.activityStats.topRatedRestaurants.map(r => ({ 
            name: r.name, 
            rating: r.rating, 
            count: r.reviewCount 
          }))}
          showRating
        />
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.systemHealth.apiLatency}ms</p>
            <p className="text-sm text-gray-600">API Latency</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.systemHealth.uptime}%</p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.systemHealth.errorRate}%</p>
            <p className="text-sm text-gray-600">Error Rate</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analyticsData.systemHealth.activeConnections}</p>
            <p className="text-sm text-gray-600">Active Connections</p>
          </div>
        </div>
      </div>
    </div>
  );
}