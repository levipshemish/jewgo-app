// Jest is already globally available, no imports needed
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/restaurants-with-images/route';

// Mock the fetch function
global.fetch = jest.fn();

describe('/api/restaurants-with-images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.jewgo.app';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should filter out restaurants without images', async () => {
    const mockBackendResponse = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Restaurant with Image',
          image_url: 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg'
        },
        {
          id: 2,
          name: 'Restaurant without Image',
          image_url: null
        },
        {
          id: 3,
          name: 'Restaurant with Default Image',
          image_url: '/images/default-restaurant.webp'
        },
        {
          id: 4,
          name: 'Restaurant with Empty Image',
          image_url: ''
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images?page=1&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe(1);
    expect(data.data[0].image_url).toContain('f_auto,q_auto');
    expect(data.message).toBe('Restaurants with images only');
  });

  it('should preserve Cloudinary URLs with file extensions', async () => {
    const mockBackendResponse = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Restaurant',
          image_url: 'https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_1.jpg'
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].image_url).toContain('image_1.jpg');
    expect(data.data[0].image_url).not.toMatch(/image_1$/); // Should not strip extension
  });

  it('should handle sample data by including all restaurants', async () => {
    const mockBackendResponse = {
      success: true,
      message: 'Using sample data',
      data: [
        {
          id: 1,
          name: 'Sample Restaurant 1',
          image_url: '/images/default-restaurant.webp'
        },
        {
          id: 2,
          name: 'Sample Restaurant 2',
          image_url: '/images/default-restaurant.webp'
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(2); // Should include all sample restaurants
  });

  it('should handle pagination parameters', async () => {
    const mockBackendResponse = {
      success: true,
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Restaurant ${i + 1}`,
        image_url: `https://res.cloudinary.com/djgtbhjim/image/upload/v1684850695/jewgo/restaurants/image_${i + 1}.jpg`
      }))
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images?page=2&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(10);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.offset).toBe(10);
  });

  it('should handle backend errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toContain('Using sample data');
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('should handle 5xx backend errors by returning sample data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toContain('Using sample data');
  });

  it('should validate page and limit parameters', async () => {
    const mockBackendResponse = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Restaurant',
          image_url: 'https://res.cloudinary.com/test.jpg'
        }
      ]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBackendResponse
    });

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images?page=-1&limit=1000');
    const response = await GET(request);
    const data = await response.json();

    // Should use default values for invalid parameters
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(100); // Max limit
  });

  it('should handle timeout errors', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    (global.fetch as any).mockRejectedValueOnce(abortError);

    const request = new NextRequest('http://localhost:3000/api/restaurants-with-images');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toContain('Using sample data');
  });
});