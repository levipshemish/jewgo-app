/**
 * Centralized backend fetch utility with automatic admin token attachment
 * Use this instead of direct fetch calls in admin routes
 */

export async function backendFetch(input: string, init: RequestInit & { requireAdmin?: boolean } = {}) {
  const headers = new Headers(init.headers || {});
  
  if (init.requireAdmin) {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Admin JWT missing');
    }
    
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  
  return fetch(input, { ...init, headers });
}
