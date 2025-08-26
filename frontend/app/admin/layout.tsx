import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/auth';
import { setAdminCSRFToken } from './actions';
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

  // CSRF token provisioning:
  // We request a signed CSRF token from the server route. Note that because this
  // fetch runs server-side during SSR, any cookie set by that route will NOT be
  // persisted to the user's browser. The admin UI relies on the injected
  // window.__CSRF_TOKEN__ value below for mutating requests via the x-csrf-token header.
  const csrfRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/csrf`, { cache: 'no-store' }).catch(() => null);
  const csrfJson = csrfRes && csrfRes.ok ? await csrfRes.json() : { token: '' };
  const signedToken = csrfJson.token || '';

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
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
