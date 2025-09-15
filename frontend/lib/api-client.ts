/**
 * Centralized API client with proper credentials handling
 * Ensures all requests include cookies and proper error handling
 */

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 10000;
  }

  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // Always include credentials so HttpOnly cookies are sent
      credentials: 'include',
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(
          `Rate limit exceeded. Try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`
        );
      }

      // Handle 401 responses
      if (response.status === 401) {
        throw new Error('Unauthorized - please log in again');
      }

      // Handle 413 responses with user-friendly guidance
      if (response.status === 413) {
        throw new Error(
          'Request headers too large. This often happens when too many or oversized cookies are sent. Try clearing cookies for api.jewgo.app, then retry.'
        );
      }

      // Handle 403 responses by clearing CSRF cookies and local session state
      if (response.status === 403) {
        throw new Error('Forbidden - CSRF token invalid or expired');
      }

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      
      throw error;
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
// Use relative URLs to leverage Next.js proxy in development
const isDevelopment = process.env.NODE_ENV === 'development';
const backendUrl = isDevelopment ? '' : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app');
export const apiClient = new ApiClient({ baseUrl: backendUrl });

// Export the class for testing
export { ApiClient };
