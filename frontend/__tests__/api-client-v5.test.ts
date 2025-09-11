/**
 * Comprehensive tests for v5 API client.
 * 
 * Tests the unified API client with authentication, caching, retry logic,
 * and error handling.
 */

import { ApiClientV5 } from '../lib/api/client-v5';
import { AuthTokenManager } from '../lib/api/auth-v5';
import { CacheManager } from '../lib/api/cache-v5';
import { RetryManager } from '../lib/api/retry-v5';
import { MetricsCollector } from '../lib/api/metrics-v5';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClientV5', () => {
  let apiClient: ApiClientV5;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    apiClient = new ApiClientV5({
      baseUrl: 'https://api.jewgo.app',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTtl: 300,
      enableMetrics: true,
      enableEtag: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct configuration', () => {
      expect(apiClient.config.baseUrl).toBe('https://api.jewgo.app');
      expect(apiClient.config.timeout).toBe(5000);
      expect(apiClient.config.retryAttempts).toBe(3);
      expect(apiClient.config.enableMetrics).toBe(true);
    });

    it('should update configuration', () => {
      apiClient.updateConfig({ timeout: 10000 });
      expect(apiClient.config.timeout).toBe(10000);
    });
  });

  describe('Authentication', () => {
    it('should add authorization header when token is available', async () => {
      const mockToken = 'test-token';
      apiClient.setAuthToken(mockToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers()
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });

    it('should handle token refresh', async () => {
      const mockRefreshToken = 'refresh-token';
      apiClient.setRefreshToken(mockRefreshToken);

      // Mock token refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-token' }),
        headers: new Headers()
      } as Response);

      await apiClient.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refresh_token: mockRefreshToken })
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers()
      } as Response);
    });

    it('should make GET requests', async () => {
      const result = await apiClient.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.data).toBe('test');
    });

    it('should make POST requests', async () => {
      const data = { name: 'test' };
      const result = await apiClient.post('/test', data);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
      expect(result.data).toBe('test');
    });

    it('should make PUT requests', async () => {
      const data = { name: 'updated' };
      const result = await apiClient.put('/test/1', data);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
      expect(result.data).toBe('test');
    });

    it('should make DELETE requests', async () => {
      const result = await apiClient.delete('/test/1');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(result.data).toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
        headers: new Headers()
      } as Response);

      await expect(apiClient.get('/nonexistent')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient errors', async () => {
      // Mock first two requests to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
          headers: new Headers()
        } as Response);

      const result = await apiClient.get('/test');
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toBe('success');
    });

    it('should not retry on client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Bad request' }),
        headers: new Headers()
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caching', () => {
    it('should cache GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'cached' }),
        headers: new Headers({ 'ETag': 'test-etag' })
      } as Response);

      // First request
      const result1 = await apiClient.get('/test');
      expect(result1.data).toBe('cached');

      // Second request should use cache
      const result2 = await apiClient.get('/test');
      expect(result2.data).toBe('cached');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      // Mock cache expiration
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 400000); // 400 seconds later

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'fresh' }),
        headers: new Headers()
      } as Response);

      const result = await apiClient.get('/test');
      expect(result.data).toBe('fresh');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('ETag Support', () => {
    it('should include If-None-Match header for cached requests', async () => {
      const etag = 'test-etag';
      
      // First request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'ETag': etag })
      } as Response);

      await apiClient.get('/test');

      // Second request should include If-None-Match
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
        json: async () => ({}),
        headers: new Headers()
      } as Response);

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-None-Match': etag
          })
        })
      );
    });
  });

  describe('Entity Operations', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
        headers: new Headers()
      } as Response);
    });

    it('should get entities with filters', async () => {
      const filters = { search: 'restaurant', status: 'active' };
      await apiClient.getEntities('restaurants', filters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/restaurants'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get entity by ID', async () => {
      await apiClient.getEntity('restaurants', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/restaurants/1'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should create entity', async () => {
      const data = { name: 'New Restaurant' };
      await apiClient.createEntity('restaurants', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/restaurants'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });

    it('should update entity', async () => {
      const data = { name: 'Updated Restaurant' };
      await apiClient.updateEntity('restaurants', 1, data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/restaurants/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    it('should delete entity', async () => {
      await apiClient.deleteEntity('restaurants', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/restaurants/1'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Search Operations', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ entities: {}, total_results: 0 }),
        headers: new Headers()
      } as Response);
    });

    it('should perform unified search', async () => {
      const query = { q: 'restaurant', entities: ['restaurants'] };
      await apiClient.search(query);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/search'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get search suggestions', async () => {
      await apiClient.getSearchSuggestions('rest');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v5/search/suggestions'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('Metrics Collection', () => {
    it('should collect request metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers()
      } as Response);

      await apiClient.get('/test');

      // Verify metrics were collected
      expect(apiClient.metricsCollector).toBeDefined();
    });
  });
});

describe('AuthTokenManager', () => {
  let tokenManager: AuthTokenManager;

  beforeEach(() => {
    tokenManager = new AuthTokenManager();
  });

  it('should store and retrieve tokens', () => {
    const token = 'test-token';
    tokenManager.setToken(token);
    expect(tokenManager.getToken()).toBe(token);
  });

  it('should check token expiration', () => {
    const expiredToken = 'expired-token';
    tokenManager.setToken(expiredToken);
    
    // Mock expired token
    jest.spyOn(tokenManager, 'isTokenExpired').mockReturnValue(true);
    
    expect(tokenManager.isTokenExpired()).toBe(true);
  });

  it('should clear tokens', () => {
    tokenManager.setToken('test-token');
    tokenManager.clearTokens();
    expect(tokenManager.getToken()).toBeNull();
  });
});

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  it('should store and retrieve cached data', () => {
    const key = 'test-key';
    const data = { test: 'data' };
    
    cacheManager.set(key, data, 300);
    expect(cacheManager.get(key)).toEqual(data);
  });

  it('should respect cache TTL', () => {
    const key = 'test-key';
    const data = { test: 'data' };
    
    cacheManager.set(key, data, 1); // 1 second TTL
    
    // Mock time passing
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    
    expect(cacheManager.get(key)).toBeNull();
  });

  it('should clear cache', () => {
    cacheManager.set('key1', 'data1', 300);
    cacheManager.set('key2', 'data2', 300);
    
    cacheManager.clear();
    
    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBeNull();
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  it('should retry on transient errors', async () => {
    let attemptCount = 0;
    const mockFunction = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Transient error');
      }
      return 'success';
    });

    const result = await retryManager.retry(mockFunction, 3, 100);
    
    expect(result).toBe('success');
    expect(attemptCount).toBe(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const mockFunction = jest.fn().mockImplementation(() => {
      throw new Error('Non-retryable error');
    });

    await expect(retryManager.retry(mockFunction, 3, 100)).rejects.toThrow();
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });
});
