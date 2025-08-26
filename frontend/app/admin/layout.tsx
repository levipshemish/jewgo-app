import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/admin/auth';
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
    adminUser = await requireAdminUser();
  } catch {
    redirect('/auth/signin?redirectTo=/admin&message=admin_access_required');
  }

  // CSRF token provisioning with safe fallback to avoid SSR crash on missing secret
  let signedToken = '';
  if (adminUser) {
    try {
      signedToken = generateSignedCSRFToken(adminUser.id);
    } catch (e) {
      // In production missing CSRF_SECRET should not crash SSR; show warning in UI
      console.error('[ADMIN] CSRF token generation failed:', e);
      signedToken = '';
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
            {/* Expose CSRF token for client (sent in x-csrf-token header) */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.__CSRF_TOKEN__ = ${JSON.stringify(signedToken)};`,
              }}
            />
            {!signedToken && (
              <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">
                CSRF token unavailable. Client actions may be limited.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
