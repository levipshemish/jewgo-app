import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModernFilterPopup } from '../components/filters/ModernFilterPopup';

// Mock the hooks
jest.mock('@/lib/hooks/useLocalFilters', () => ({
  useLocalFilters: () => ({
    draftFilters: {},
    hasDraftFilters: false,
    draftFilterCount: 0,
    setDraftFilter: jest.fn(),
    resetDraftFilters: jest.fn(),
    clearAllDraftFilters: jest.fn(),
    applyFilters: jest.fn(),
    isApplying: false,
  }),
}));

jest.mock('@/lib/hooks/useFilterOptions', () => ({
  useFilterOptions: () => ({
    filterOptions: {
      agencies: ['ORB', 'Kosher Miami'],
      kosherCategories: ['Dairy', 'Meat', 'Pareve'],
      priceRanges: ['$', '$$', '$$$'],
    },
    loading: false,
    error: null,
  }),
}));

describe('ModernFilterPopup Dropdowns', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onApplyFilters: jest.fn(),
    initialFilters: {},
    userLocation: null,
    locationLoading: false,
  };

  it('should render all dropdown options correctly', () => {
    render(<ModernFilterPopup {...defaultProps} />);
    
    // Check that all dropdowns are present
    expect(screen.getByText('Certifying Agency')).toBeInTheDocument();
    expect(screen.getByText('Kosher Type')).toBeInTheDocument();
    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    
    // Check that "All" options are present
    expect(screen.getByText('All Agencies')).toBeInTheDocument();
    expect(screen.getByText('All Kosher Types')).toBeInTheDocument();
    expect(screen.getByText('All Price Ranges')).toBeInTheDocument();
    expect(screen.getByText('All Ratings')).toBeInTheDocument();
  });

  it('should show kosher category options', () => {
    render(<ModernFilterPopup {...defaultProps} />);
    
    const kosherSelect = screen.getByDisplayValue('All Kosher Types');
    expect(kosherSelect).toBeInTheDocument();
    
    // Check that the options are present
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Meat')).toBeInTheDocument();
    expect(screen.getByText('Pareve')).toBeInTheDocument();
  });

// --- At the top of frontend/__tests__/filter-popup.test.tsx ---

// Mock the hooks
const mockSetDraftFilter = jest.fn();
const defaultLocalFiltersState = {
  draftFilters: {},
  hasDraftFilters: false,
  draftFilterCount: 0,
  setDraftFilter: mockSetDraftFilter,
  resetDraftFilters: jest.fn(),
  clearAllDraftFilters: jest.fn(),
  applyFilters: jest.fn(),
  isApplying: false,
};
let mockLocalFiltersState = { ...defaultLocalFiltersState };

jest.mock('@/lib/hooks/useLocalFilters', () => ({
  useLocalFilters: () => mockLocalFiltersState,
}));

// --- Later in the same file ---

describe('ModernFilterPopup Dropdowns', () => {
  const defaultProps = {
    // …existing defaultProps…
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalFiltersState = { ...defaultLocalFiltersState };
  });

  it('should handle dropdown value changes', async () => {
    // Set the initial hook state for this test
    mockLocalFiltersState = {
      ...mockLocalFiltersState,
      draftFilters: { category: 'Dairy' },
      hasDraftFilters: true,
      draftFilterCount: 1,
    };

    render(<ModernFilterPopup {...defaultProps} />);

    const kosherSelect = screen.getByDisplayValue('Dairy');
    fireEvent.change(kosherSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(mockSetDraftFilter).toHaveBeenCalledWith('category', undefined);
    });
  });

  // …other tests…
});
});
