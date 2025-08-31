export async function adminFetch(
  url: string,
  csrfToken: string,
  options?: RequestInit
) {
  const headers = new Headers(options?.headers || {});
  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }
  return fetch(url, { ...options, headers, credentials: 'include' });
}
