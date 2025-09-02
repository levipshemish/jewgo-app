'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Activity, 
  Clock, 
  MapPin, 
  Star, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface UserActivity {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'review_created' | 'review_updated' | 'restaurant_visited' | 'profile_updated' | 'password_changed';
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    city: string;
    country: string;
    coordinates?: [number, number];
  };
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
}

interface UserStats {
  totalUsers: number;
  activeUsers: {
    lastWeek: number;
    lastMonth: number;
    today: number;
  };
  registrations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  activityMetrics: {
    averageSessionDuration: number;
    totalSessions: number;
    bounceRate: number;
    returningUserRate: number;
  };
}

interface UserActivityDashboardProps {
  userId?: string; // If provided, shows activity for specific user
  className?: string;
}

const ActivityIcon: React.FC<{ action: UserActivity['action'] }> = ({ action }) => {
  const iconMap = {
    login: User,
    logout: User,
    review_created: MessageSquare,
    review_updated: MessageSquare,
    restaurant_visited: MapPin,
    profile_updated: User,
    password_changed: User,
  };
  
  const Icon = iconMap[action] || Activity;
  
  const colorMap = {
    login: 'text-green-500',
    logout: 'text-gray-500',
    review_created: 'text-blue-500',
    review_updated: 'text-yellow-500',
    restaurant_visited: 'text-purple-500',
    profile_updated: 'text-indigo-500',
    password_changed: 'text-red-500',
  };
  
  return <Icon className={`h-4 w-4 ${colorMap[action]}`} />;
};

const ActivityItem: React.FC<{ activity: UserActivity }> = ({ activity }) => {
  const getStatusColor = () => {
    switch (activity.status) {
      case 'success': return 'border-l-green-500';
      case 'failed': return 'border-l-red-500';
      case 'warning': return 'border-l-yellow-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className={`bg-white border-l-4 ${getStatusColor()} p-4 hover:bg-gray-50 transition-colors`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-1">
          <ActivityIcon action={activity.action} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.description}
            </p>
            <div className="flex items-center space-x-2">
              {activity.location && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{activity.location.city}, {activity.location.country}</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{new Date(activity.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {activity.metadata && (
            <div className="text-xs text-gray-600 space-y-1">
              {activity.metadata.restaurantName && (
                <div>Restaurant: {activity.metadata.restaurantName}</div>
              )}
              {activity.metadata.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400" />
                  <span>Rating: {activity.metadata.rating}/5</span>
                </div>
              )}
              {activity.ipAddress && (
                <div>IP: {activity.ipAddress}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  change?: number; 
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, change, icon: Icon, trend }) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
    </div>
  );
};

export default function UserActivityDashboard({ userId, className = '' }: UserActivityDashboardProps) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');

  // Generate mock activity data
  const generateMockActivities = useCallback((): UserActivity[] => {
    const actions: UserActivity['action'][] = [
      'login', 'logout', 'review_created', 'review_updated', 
      'restaurant_visited', 'profile_updated', 'password_changed'
    ];
    
    const statuses: UserActivity['status'][] = ['success', 'failed', 'warning'];
    const locations = [
      { city: 'New York', country: 'USA', coordinates: [40.7128, -74.0060] as [number, number] },
      { city: 'Los Angeles', country: 'USA', coordinates: [34.0522, -118.2437] as [number, number] },
      { city: 'Chicago', country: 'USA', coordinates: [41.8781, -87.6298] as [number, number] },
      { city: 'London', country: 'UK', coordinates: [51.5074, -0.1278] as [number, number] },
      { city: 'Toronto', country: 'Canada', coordinates: [43.6532, -79.3832] as [number, number] },
    ];

    const mockActivities: UserActivity[] = [];
    
    for (let i = 0; i < 50; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      const descriptions = {
        login: 'User logged in successfully',
        logout: 'User logged out',
        review_created: 'Created new restaurant review',
        review_updated: 'Updated restaurant review',
        restaurant_visited: 'Visited restaurant page',
        profile_updated: 'Updated profile information',
        password_changed: 'Changed account password',
      };

      const activity: UserActivity = {
        id: `activity-${i}`,
        userId: userId || `user-${Math.floor(Math.random() * 100)}`,
        action,
        description: descriptions[action],
        status,
        location,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: action === 'review_created' || action === 'review_updated' ? {
          restaurantName: ['Kosher Deluxe', 'Jerusalem Grill', 'Sababa Restaurant'][Math.floor(Math.random() * 3)],
          rating: Math.floor(Math.random() * 5) + 1
        } : action === 'restaurant_visited' ? {
          restaurantName: ['Kosher Deluxe', 'Jerusalem Grill', 'Sababa Restaurant'][Math.floor(Math.random() * 3)]
        } : undefined
      };

      mockActivities.push(activity);
    }

    return mockActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [userId]);

  const generateMockStats = (): UserStats => {
    return {
      totalUsers: 2847,
      activeUsers: {
        today: 156,
        lastWeek: 1024,
        lastMonth: 2341
      },
      registrations: {
        today: 12,
        thisWeek: 89,
        thisMonth: 267,
        growth: 15.3
      },
      activityMetrics: {
        averageSessionDuration: 245, // seconds
        totalSessions: 15674,
        bounceRate: 0.32,
        returningUserRate: 0.68
      }
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setActivities(generateMockActivities());
        if (!userId) {
          setStats(generateMockStats());
        }
      } catch (error) {
        console.error('Error loading user activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, timeRange]);

  const filteredActivities = activities.filter(activity => {
    if (filterAction !== 'all' && activity.action !== filterAction) {
      return false;
    }
    if (filterStatus !== 'all' && activity.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  if (loading && activities.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading activity data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview (only for global view) */}
      {!userId && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={User}
            trend="neutral"
          />
          <StatsCard
            title="Active Today"
            value={stats.activeUsers.today}
            change={12.5}
            icon={Activity}
            trend="up"
          />
          <StatsCard
            title="New Registrations"
            value={stats.registrations.thisMonth}
            change={stats.registrations.growth}
            icon={TrendingUp}
            trend="up"
          />
          <StatsCard
            title="Avg. Session"
            value={formatDuration(stats.activityMetrics.averageSessionDuration)}
            change={-2.1}
            icon={Clock}
            trend="down"
          />
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="review_created">Review Created</option>
                <option value="review_updated">Review Updated</option>
                <option value="restaurant_visited">Restaurant Visited</option>
                <option value="profile_updated">Profile Updated</option>
                <option value="password_changed">Password Changed</option>
              </select>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {userId ? 'User Activity' : 'Recent Activity'}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredActivities.length} activities found
          </span>
        </div>

        {filteredActivities.length > 0 ? (
          <div className="space-y-2">
            {filteredActivities.slice(0, 20).map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            
            {filteredActivities.length > 20 && (
              <div className="text-center py-4">
                <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50">
                  Load More Activities
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No activity found</h4>
            <p className="text-gray-500">
              No user activities match your current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}