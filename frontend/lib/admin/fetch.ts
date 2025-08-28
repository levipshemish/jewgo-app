import { useAdminCsrf } from './hooks';

/**
 * Centralized admin fetch utility that automatically includes CSRF headers
 * for state-changing requests (POST, PUT, PATCH, DELETE)
 */
export const createAdminFetch = (csrfToken: string | null) => {
  return async (url: string, options: RequestInit = {}) => {
    const { method = 'GET', headers = {}, ...restOptions } = options;
    
    // Add CSRF token for state-changing requests
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    
    const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers,
      ...(isStateChanging && csrfToken ? { 'x-csrf-token': csrfToken } : {})
    };

    return fetch(url, {
      method,
      headers: finalHeaders,
      ...restOptions
    });
  };
};

/**
 * Hook that provides an admin fetch function with CSRF token
 */
export const useAdminFetch = () => {
  const { token: csrfToken } = useAdminCsrf();
  return createAdminFetch(csrfToken);
};
