import { getAdminUser } from '@/lib/server/admin-auth';
import { redirect } from 'next/navigation';
import DashboardOverview from '@/components/admin/DashboardOverview';
import StoreAdminDashboard from '@/components/admin/StoreAdminDashboard';

// Force dynamic rendering for admin routes to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminDashboardPage() {
  try {
    const adminUser = await getAdminUser();
    
    if (!adminUser) {
      redirect('/auth/signin?redirectTo=/admin&message=admin_access_required');
    }

    // Check if user has minimal admin role (moderator or higher)
    if (!adminUser.adminRole || !['moderator', 'data_admin', 'store_admin', 'system_admin', 'super_admin'].includes(adminUser.adminRole)) {
      redirect('/?error=not_authorized&message=insufficient_admin_permissions');
    }

    // Show store admin dashboard for store_admin users
    if (adminUser.adminRole === 'store_admin') {
      return <StoreAdminDashboard adminUser={adminUser} />;
    }

    // Show general admin dashboard for all other admin roles
    return <DashboardOverview adminUser={adminUser} />;
  } catch (error) {
    console.error('[ADMIN] Error rendering admin dashboard:', error);
    
    // Don't redirect on errors - render error state instead
    // This prevents redirect loops when there are network/auth service issues
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Admin Access Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Unable to verify admin permissions. Please try again or contact support.
            </p>
            <div className="mt-4">
              <a
                href="/auth/signin?redirectTo=/admin"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Sign in again
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
