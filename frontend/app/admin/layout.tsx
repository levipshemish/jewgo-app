import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { headers } from 'next/headers';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side authentication check
  const adminUser = await getAdminUser();
  
  if (!adminUser) {
    redirect('/auth/signin?redirectTo=/admin');
  }

  // CSRF token provisioning: fetch a signed CSRF token server-side and inject it.
  let signedToken = '';
  try {
    const headersList = await headers();
    const csrfRes = await fetch('/api/admin/csrf', { 
      cache: 'no-store',
      headers: {
        Cookie: headersList.get('cookie') || '',
      }
    });
    
    if (csrfRes.ok) {
      const csrfJson = await csrfRes.json();
      signedToken = csrfJson.token || '';
    } else {
      console.warn('[ADMIN] CSRF token fetch failed:', csrfRes.status);
    }
  } catch (error) {
    console.error('[ADMIN] Error fetching CSRF token:', error);
    // Continue without CSRF token - the admin pages will handle this gracefully
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
