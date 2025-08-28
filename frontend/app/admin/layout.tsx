import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { generateSignedCSRFToken } from '@/lib/admin/csrf';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side authentication + RBAC check
  let adminUser;
  try {
    adminUser = await getAdminUser();
  } catch (error) {
    console.error('[ADMIN] Authentication error:', error);
    redirect('/auth/signin?redirectTo=/admin&message=admin_access_required');
  }

  // Check if user exists but lacks admin role
  if (!adminUser) {
    redirect('/auth/signin?redirectTo=/admin&message=admin_access_required');
  }

  // Check if user has minimal admin role (moderator or higher)
  if (!adminUser.adminRole || !['moderator', 'data_admin', 'system_admin', 'super_admin'].includes(adminUser.adminRole)) {
    redirect('/?error=not_authorized&message=insufficient_admin_permissions');
  }

  // CSRF token provisioning with safe fallback to avoid SSR crash on missing secret
  let _signedToken = '';
  if (adminUser) {
    try {
      _signedToken = generateSignedCSRFToken(adminUser.id);
    } catch (e) {
      // In production missing CSRF_SECRET should not crash SSR; show warning in UI
      console.error('[ADMIN] CSRF token generation failed:', e);
      _signedToken = '';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar adminUser={adminUser} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <AdminHeader adminUser={adminUser} />
          
          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
