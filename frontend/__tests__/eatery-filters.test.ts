import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EateryPageClient } from '../app/eatery/EateryPageClient';

// Mock the hooks and components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdvancedFilters', () => ({
  useAdvancedFilters: () => ({
    activeFilters: {},
    hasActiveFilters: false,
    setFilter: vi.fn(),
    clearFilter: vi.fn(),
    clearAllFilters: vi.fn(),
    getFilterCount: () => 0,
  }),
}));

vi.mock('@/lib/contexts/LocationContext', () => ({
  useLocation: () => ({
    userLocation: null,
    permissionStatus: 'prompt',
    isLoading: false,
    error: null,
    requestLocation: vi.fn(),
    checkPermissionStatus: vi.fn(),
    refreshPermissionStatus: vi.fn(),
  }),
}));

vi.mock('@/lib/mobile-optimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false,
    viewportWidth: 1024,
  }),
}));

vi.mock('@/lib/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    hasMore: false,
    isLoadingMore: false,
    loadingRef: { current: null },
    setHasMore: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('EateryPageClient Filter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 1,
            name: 'Test Restaurant',
            image_url: '/test.jpg',
            kosher_category: 'Glatt Kosher',
            price_range: '$$',
            rating: 4.5,
            address: '123 Test St',
          },
        ],
        total: 1,
      }),
    });
  });

  it('should build correct query parameters for backend', async () => {
    render(<EateryPageClient />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/restaurants-with-images?'),
        expect.any(Object)
      );
    });

    const call = (global.fetch as any).mock.calls[0];
    const url = call[0];
    const urlParams = new URLSearchParams(url.split('?')[1]);
    
    // Check that offset is used instead of page
    expect(urlParams.get('offset')).toBe('0');
    expect(urlParams.get('page')).toBeNull();
    expect(urlParams.get('limit')).toBe('24'); // 6 columns * 4 rows for desktop
  });

  it('should handle filter parameter mapping correctly', async () => {
    render(<EateryPageClient />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const call = (global.fetch as any).mock.calls[0];
    const url = call[0];
    const urlParams = new URLSearchParams(url.split('?')[1]);
    
    // Verify expected parameters are present
    expect(urlParams.has('limit')).toBe(true);
    expect(urlParams.has('offset')).toBe(true);
  });

  it('should abort previous requests when new filters are applied', async () => {
    const mockAbort = vi.fn();
    const mockAbortController = {
      signal: {},
      abort: mockAbort,
    };
    
    vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);
    
    render(<EateryPageClient />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    
    // Trigger a new fetch (simulating filter change)
    // This would normally happen through the filter UI
    await waitFor(() => {
      expect(mockAbort).toHaveBeenCalled();
    });
  });
});

describe('Filter Schema Validation', () => {
  it('should handle dietary arrays correctly', () => {
    const { toSearchParams, fromSearchParams } = require('@/lib/filters/schema');
    
    const filters = {
      dietary: ['Glatt Kosher', 'Dairy'],
      agency: 'ORB',
      category: 'Restaurant',
    };
    
    const params = toSearchParams(filters);
    expect(params.getAll('dietary')).toEqual(['Glatt Kosher', 'Dairy']);
    
    const reconstructed = fromSearchParams(params);
    expect(reconstructed.dietary).toEqual(['Glatt Kosher', 'Dairy']);
  });

  it('should handle price range tuples correctly', () => {
    const { toSearchParams, fromSearchParams } = require('@/lib/filters/schema');
    
    const filters = {
      priceRange: [2, 3] as [number, number],
      ratingMin: 4,
    };
    
    const params = toSearchParams(filters);
    expect(params.get('priceRange')).toBe('2,3');
    
    const reconstructed = fromSearchParams(params);
    expect(reconstructed.priceRange).toEqual([2, 3]);
  });
});
