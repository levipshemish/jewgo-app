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

  // CSRF token provisioning with error handling:
  // We request a signed CSRF token from the server route. Note that because this
  // fetch runs server-side during SSR, any cookie set by that route will NOT be
  // persisted to the user's browser. The admin UI relies on the injected
  // window.__CSRF_TOKEN__ value below for mutating requests via the x-csrf-token header.
  let signedToken = '';
  try {
    const headersList = await headers();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://jewgo-app.vercel.app';
    const csrfRes = await fetch(`${baseUrl}/api/admin/csrf`, { 
      cache: 'no-store',
      headers: {
        'Cookie': headersList.get('cookie') || '',
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
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
