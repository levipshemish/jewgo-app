export async function adminFetch(
  url: string,
  csrfToken: string,
  options: RequestInit = {}
) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set('x-csrf-token', csrfToken);
  }
  return fetch(url, { ...options, headers, credentials: 'include' });
}
