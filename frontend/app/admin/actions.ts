'use server';

export async function setAdminCSRFToken(userId: string) {
  try {
    // Generate CSRF token without setting cookies (cookies will be set in layout)
    const { generateSignedCSRFToken } = await import('@/lib/admin/csrf');
    const signedToken = generateSignedCSRFToken(userId);
    
    return { success: true, token: signedToken };
  } catch (error) {
    console.error('[ADMIN] Error generating CSRF token:', error);
    return { success: false, error: 'Failed to generate CSRF token' };
  }
}
