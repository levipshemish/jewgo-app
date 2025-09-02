import { Metadata } from 'next';
import { requireAdminUser } from '@/lib/server/admin-auth';
import RoleManagementTable from '@/components/admin/RoleManagementTable';

// Force dynamic rendering for admin routes to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'User Role Management - Admin Dashboard',
  description: 'Manage user admin roles and permissions',
};

export default async function RoleManagementPage() {
  // Ensure only authenticated admins can access
  const admin = await requireAdminUser();
  
  // Only super_admin users can access role management
  if (admin.adminRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need super_admin permissions to access role management.
            </p>
            <div className="mt-6">
              <a
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Return to Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch initial user data with current role assignments
  let initialData = { users: [], total: 0, page: 1, limit: 50, has_more: false };
  
  try {
    // Best-effort server fetch; relies on server-side auth context available to Next API route
    const response = await fetch('/api/admin/roles?limit=50', { cache: 'no-store' });
    
    if (response.ok) {
      const data = await response.json();
      initialData = data.data || initialData;
    } else {
      console.warn('Failed to fetch initial role data:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching initial role data:', error);
    // Continue with empty data - the client component will handle loading states
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-4">
                    <li>
                      <div>
                        <a href="/admin" className="text-gray-400 hover:text-gray-500">
                          Admin
                        </a>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center">
                        <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <a href="/admin/security" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                          Security
                        </a>
                      </div>
                    </li>
                    <li>
                      <div className="flex items-center">
                        <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-4 text-sm font-medium text-gray-900">Role Management</span>
                      </div>
                    </li>
                  </ol>
                </nav>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">User Role Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Assign and manage admin roles for users. Only super admins can access this page.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <RoleManagementTable initialData={initialData} />
          </div>
        </div>
      </div>
    </div>
  );
}
