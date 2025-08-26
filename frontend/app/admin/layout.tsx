import { redirect } from 'next/navigation';
import { getAdminUser, generateCSRFToken } from '@/lib/admin/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side authentication check
  const adminUser = await getAdminUser();
  
  if (!adminUser) {
    redirect('/auth/signin?redirectTo=/admin');
  }

  // Generate CSRF token
  const csrfToken = generateCSRFToken();

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
            {/* CSRF Token for client-side use */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.__CSRF_TOKEN__ = "${csrfToken}";`,
              }}
            />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
