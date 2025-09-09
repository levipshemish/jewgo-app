/**
 * Loading Overlay Tests
 * 
 * Tests the loading overlay component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import LoadingOverlay from '@/components/map/LoadingOverlay';

// Mock the data manager
jest.mock('@/services/dataManager', () => ({
  getCacheStats: jest.fn(() => ({
    size: 5,
    fetchCount: 10,
    cacheHits: 7,
    hitRate: 0.7,
  })),
}));

// Mock the worker manager
jest.mock('@/services/workerManager', () => ({
  getFilterStats: jest.fn(() => ({
    filterCount: 15,
    totalFilterTime: 150.5,
    averageFilterTime: 10.0,
  })),
}));

describe('LoadingOverlay', () => {
  beforeEach(() => {
    // Reset store state
    useLivemapStore.setState({
      restaurants: [],
      filtered: [],
      selectedId: null,
      userLoc: null,
      favorites: new Set(),
      filters: {},
      loading: { restaurants: 'idle', location: 'idle' },
      error: null,
      map: { bounds: null, center: null, zoom: 12 },
    });
  });

  it('should not render when not loading and no error', () => {
    render(<LoadingOverlay />);
    
    expect(screen.queryByText('Loading restaurants...')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load restaurants')).not.toBeInTheDocument();
  });

  it('should show loading state when restaurants are loading', () => {
    useLivemapStore.setState({
      loading: { restaurants: 'pending', location: 'idle' },
    });

    render(<LoadingOverlay />);
    
    expect(screen.getByText('Loading restaurants...')).toBeInTheDocument();
    expect(screen.getByText('Fetching data for current viewport')).toBeInTheDocument();
  });

  it('should show error state when loading fails', () => {
    useLivemapStore.setState({
      loading: { restaurants: 'error', location: 'idle' },
      error: 'Network error',
    });

    render(<LoadingOverlay />);
    
    expect(screen.getByText('Failed to load restaurants')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should show retry button on error', () => {
    useLivemapStore.setState({
      loading: { restaurants: 'error', location: 'idle' },
      error: 'Network error',
    });

    render(<LoadingOverlay />);
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('should handle retry button click', () => {
    useLivemapStore.setState({
      loading: { restaurants: 'error', location: 'idle' },
      error: 'Network error',
      map: { bounds: { ne: { lat: 25.8, lng: -80.1 }, sw: { lat: 25.7, lng: -80.2 } }, center: null, zoom: 12 },
    });

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(<LoadingOverlay />);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    // Check that loading state was reset
    expect(useLivemapStore.getState().loading.restaurants).toBe('pending');
    expect(useLivemapStore.getState().error).toBeNull();
  });

  it('should show cache stats in development', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    useLivemapStore.setState({
      loading: { restaurants: 'pending', location: 'idle' },
    });

    render(<LoadingOverlay />);
    
    expect(screen.getByText(/Cache: 5 entries, 70% hit rate/)).toBeInTheDocument();
    expect(screen.getByText(/Filters: 15 operations, 10.0ms avg/)).toBeInTheDocument();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should not show cache stats in production', () => {
    // Mock NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    useLivemapStore.setState({
      loading: { restaurants: 'pending', location: 'idle' },
    });

    render(<LoadingOverlay />);
    
    expect(screen.queryByText(/Cache:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Filters:/)).not.toBeInTheDocument();

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});
