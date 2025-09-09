/**
 * URL Sync Tests
 * 
 * Tests the URL synchronization functionality.
 */

import { getURLState } from '@/services/urlSync';

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000/live-map',
  pathname: '/live-map',
  search: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('URL Sync', () => {
  beforeEach(() => {
    // Reset location
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/live-map';
  });

  describe('getURLState', () => {
    it('should parse empty URL correctly', () => {
      const state = getURLState();
      
      expect(state.filters).toEqual({});
      expect(state.map.center).toBeNull();
      expect(state.map.zoom).toBeNull();
    });

    it('should parse query parameter', () => {
      mockLocation.search = '?q=burger';
      
      const state = getURLState();
      
      expect(state.filters.query).toBe('burger');
    });

    it('should parse kosher parameter', () => {
      mockLocation.search = '?k=MEAT,DAIRY';
      
      const state = getURLState();
      
      expect(state.filters.kosher).toEqual(['MEAT', 'DAIRY']);
    });

    it('should parse agencies parameter', () => {
      mockLocation.search = '?a=OU,Kof-K';
      
      const state = getURLState();
      
      expect(state.filters.agencies).toEqual(['OU', 'Kof-K']);
    });

    it('should parse minRating parameter', () => {
      mockLocation.search = '?r=4.5';
      
      const state = getURLState();
      
      expect(state.filters.minRating).toBe(4.5);
    });

    it('should parse maxDistanceMi parameter', () => {
      mockLocation.search = '?d=5';
      
      const state = getURLState();
      
      expect(state.filters.maxDistanceMi).toBe(5);
    });

    it('should parse center parameter', () => {
      mockLocation.search = '?c=25.7617,-80.1918';
      
      const state = getURLState();
      
      expect(state.map.center).toEqual({ lat: 25.7617, lng: -80.1918 });
    });

    it('should parse zoom parameter', () => {
      mockLocation.search = '?z=15';
      
      const state = getURLState();
      
      expect(state.map.zoom).toBe(15);
    });

    it('should parse multiple parameters', () => {
      mockLocation.search = '?q=burger&k=MEAT&r=4.0&c=25.7617,-80.1918&z=15';
      
      const state = getURLState();
      
      expect(state.filters.query).toBe('burger');
      expect(state.filters.kosher).toEqual(['MEAT']);
      expect(state.filters.minRating).toBe(4.0);
      expect(state.map.center).toEqual({ lat: 25.7617, lng: -80.1918 });
      expect(state.map.zoom).toBe(15);
    });

    it('should handle invalid parameters gracefully', () => {
      mockLocation.search = '?r=invalid&c=invalid,invalid&z=invalid';
      
      const state = getURLState();
      
      expect(state.filters.minRating).toBeUndefined();
      expect(state.map.center).toBeNull();
      expect(state.map.zoom).toBeNull();
    });

    it('should filter out invalid kosher types', () => {
      mockLocation.search = '?k=MEAT,INVALID,DAIRY';
      
      const state = getURLState();
      
      expect(state.filters.kosher).toEqual(['MEAT', 'DAIRY']);
    });
  });
});
