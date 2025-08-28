import { generateSignedCSRFToken } from '@/lib/admin/csrf';
import { getAdminUser } from '@/lib/admin/auth';
import { sanitizeHtml } from '@/utils/htmlSanitizer';

export default async function AdminHead() {
  // Get admin user for CSRF token generation
  let signedToken = '';
  try {
    const adminUser = await getAdminUser();
    if (adminUser) {
      signedToken = generateSignedCSRFToken(adminUser.id);
    }
  } catch (e) {
    // Silent failure - UI will handle missing token
    console.error('[ADMIN] CSRF token generation failed:', e);
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
