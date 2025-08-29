import { getAdminUser } from '@/lib/server/admin-auth';
import { sanitizeHtml } from '@/utils/htmlSanitizer';

// Force dynamic rendering for admin routes to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminHead() {
  let signedToken = '';
  
  try {
    const adminUser = await getAdminUser();
    if (adminUser) {
      // Generate a simple CSRF token for admin pages
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2);
      signedToken = `admin_${timestamp}_${random}`;
    }
  } catch (e) {
    console.error('[ADMIN] Error generating CSRF token:', e);
  }

  return (
    <>
      <meta name="csrf-token" content={signedToken} />
      {!signedToken && process.env.NODE_ENV === 'production' && (
        <script
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(`
              console.warn('CSRF token missing. Admin actions may be limited.');
              // Show banner in production
              if (typeof window !== 'undefined') {
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fef3c7;border-bottom:1px solid #f59e0b;padding:8px;text-align:center;z-index:9999;font-size:14px;';
                banner.innerHTML = '⚠️ CSRF token unavailable. <a href="/docs/admin/troubleshooting" style="color:#92400e;text-decoration:underline;">View documentation</a>';
                document.body.appendChild(banner);
              }
            `, { allowScripts: true })
          }}
        />
      )}
    </>
  );
}
