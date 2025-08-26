import { getAdminUser } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { getAuditStats } from '@/lib/admin/audit';
import { 
  Building2, 
  MessageSquare, 
  Users, 
  Image, 
  MapPin, 
  Star, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const adminUser = await getAdminUser();
  
  if (!adminUser) {
    return null; // Layout will handle redirect
  }

  // Fetch comprehensive metrics
  const [dbStats, auditStats] = await Promise.all([
    AdminDatabaseService.getDatabaseStats(),
    getAuditStats({ startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }) // Last 7 days
  ]);

  const metrics = [
    {
      title: 'Total Restaurants',
      value: dbStats.totalRestaurants.toLocaleString(),
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/admin/database/restaurants'
    },
    {
      title: 'Total Reviews',
      value: dbStats.totalReviews.toLocaleString(),
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/admin/database/reviews'
    },
    {
      title: 'Total Users',
      value: dbStats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/admin/database/users'
    },
    {
      title: 'Total Images',
      value: dbStats.totalImages.toLocaleString(),
      icon: Image,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/admin/database/images'
    },
    {
      title: 'Florida Synagogues',
      value: dbStats.totalSynagogues.toLocaleString(),
      icon: MapPin,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      link: '/admin/database/synagogues'
    },
    {
      title: 'Kosher Places',
      value: dbStats.totalKosherPlaces.toLocaleString(),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/admin/database/kosher-places'
    }
  ];

  const pendingItems = [
    {
      title: 'Pending Submissions',
      value: dbStats.pendingSubmissions,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/admin/restaurants'
    },
    {
      title: 'Flagged Reviews',
      value: dbStats.flaggedReviews,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/admin/database/reviews?status=flagged'
    }
  ];

  const quickActions = [
    {
      title: 'Review Submissions',
      description: 'Approve or reject restaurant submissions',
      icon: Building2,
      link: '/admin/restaurants',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Moderate Reviews',
      description: 'Review and moderate user reviews',
      icon: MessageSquare,
      link: '/admin/database/reviews',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'View Audit Logs',
      description: 'Monitor admin activity and changes',
      icon: Activity,
      link: '/admin/audit',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'System Settings',
      description: 'Configure system settings and features',
      icon: TrendingUp,
      link: '/admin/settings',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {adminUser.name || adminUser.email}. Here's an overview of your system.
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Link key={metric.title} href={metric.link}>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pendingItems.map((item) => (
          <Link key={item.title} href={item.link}>
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{item.title}</p>
                  <p className="text-2xl font-bold text-red-600">{item.value}</p>
                </div>
                <div className={`p-3 rounded-full ${item.bgColor}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.link}>
                <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${action.bgColor}`}>
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {auditStats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {auditStats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    <Activity className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userId || 'Unknown User'}</span>
                      {' '}performed{' '}
                      <span className="font-medium">{activity.action}</span>
                      {' '}on{' '}
                      <span className="font-medium">{activity.entityType}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="p-3 rounded-full bg-green-100 mx-auto w-12 h-12 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">Database</p>
              <p className="text-xs text-green-600">Healthy</p>
            </div>
            <div className="text-center">
              <div className="p-3 rounded-full bg-blue-100 mx-auto w-12 h-12 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">Uptime</p>
              <p className="text-xs text-blue-600">99.9%</p>
            </div>
            <div className="text-center">
              <div className="p-3 rounded-full bg-purple-100 mx-auto w-12 h-12 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">Performance</p>
              <p className="text-xs text-purple-600">Optimal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
