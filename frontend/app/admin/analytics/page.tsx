import { getAdminUser } from '@/lib/admin/auth';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { redirect } from 'next/navigation';

export default async function AdminAnalyticsPage() {
  try {
    const adminUser = await getAdminUser();
    
    if (!adminUser) {
      redirect('/auth/signin?redirectTo=/admin/analytics&message=admin_access_required');
    }

    // Check minimum role requirement - analytics requires data_admin or higher
    const minRole = 'data_admin';
    const roleHierarchy = ['moderator', 'data_admin', 'system_admin', 'super_admin'];
    const userRoleIndex = roleHierarchy.indexOf(adminUser.adminRole || '');
    const minRoleIndex = roleHierarchy.indexOf(minRole);
    
    if (userRoleIndex < minRoleIndex) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              Analytics access requires {minRole} role or higher.
            </p>
            <p className="text-gray-600 mb-4">
              Your current role: {adminUser.adminRole}
            </p>
            <p className="text-sm text-gray-500">
              Please contact a system administrator for access.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <AnalyticsDashboard />
      </div>
    );
  } catch (error) {
    console.error('[ADMIN] Error rendering analytics dashboard:', error);
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-red-600">
            Error loading analytics dashboard. Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }
}