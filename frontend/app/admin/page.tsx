import { getAdminUser } from '@/lib/server/admin-auth';
import { redirect } from 'next/navigation';

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
    if (!adminUser.adminRole || !['moderator', 'data_admin', 'system_admin', 'super_admin'].includes(adminUser.adminRole)) {
      redirect('/?error=not_authorized&message=insufficient_admin_permissions');
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {adminUser.name || adminUser.email}. Here&apos;s an overview of your system.
          </p>
        </div>

        {/* Placeholder for dashboard content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
          <p className="text-gray-600">
            Dashboard components are being loaded. Please check the components directory for the full implementation.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[ADMIN] Error rendering admin dashboard:', error);
    redirect('/auth/signin?redirectTo=/admin&message=admin_access_required');
  }
}
