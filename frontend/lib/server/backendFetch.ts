/**
 * Centralized backend fetch utility with automatic admin token attachment
 * Use this instead of direct fetch calls in admin routes
 */

export async function backendFetch(input: string, init: RequestInit & { requireAdmin?: boolean } = {}) {
  const headers = new Headers(init.headers || {});
  
  if (init.requireAdmin) {
    // PostgreSQL auth - get admin token from environment or request
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) {
      throw new Error('Admin token not configured');
    }
    headers.set('Authorization', `Bearer ${adminToken}`);
  }
  
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  
  return fetch(input, { ...init, headers });
}
