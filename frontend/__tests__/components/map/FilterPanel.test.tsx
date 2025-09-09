/**
 * Filter Panel Tests
 * 
 * Tests the filter panel component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLivemapStore } from '@/lib/stores/livemap-store';
import FilterPanel from '@/components/map/FilterPanel';

// Mock the triggers
jest.mock('@/services/triggers', () => ({
  onFiltersChanged: jest.fn(),
}));

describe('FilterPanel', () => {
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

  it('should render filter panel', () => {
    render(<FilterPanel />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Kosher Type')).toBeInTheDocument();
    expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    expect(screen.getByText('Open Now')).toBeInTheDocument();
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
  });

  it('should handle kosher type changes', () => {
    render(<FilterPanel />);
    
    const meatCheckbox = screen.getByLabelText('MEAT');
    fireEvent.click(meatCheckbox);
    
    expect(meatCheckbox).toBeChecked();
  });

  it('should handle rating changes', () => {
    render(<FilterPanel />);
    
    const ratingSelect = screen.getByDisplayValue('Any Rating');
    fireEvent.change(ratingSelect, { target: { value: '4' } });
    
    expect(ratingSelect).toHaveValue('4');
  });

  it('should handle open now changes', () => {
    render(<FilterPanel />);
    
    const openNowCheckbox = screen.getByLabelText('Open Now');
    fireEvent.click(openNowCheckbox);
    
    expect(openNowCheckbox).toBeChecked();
  });

  it('should handle clear filters', () => {
    render(<FilterPanel />);
    
    const clearButton = screen.getByText('Clear All Filters');
    fireEvent.click(clearButton);
    
    // Should not throw any errors
    expect(clearButton).toBeInTheDocument();
  });
});
