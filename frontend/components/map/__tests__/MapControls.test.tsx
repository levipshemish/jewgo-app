import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import MapControls from '../MapControls';

// Mock the user location
const mockUserLocation = {
  latitude: 25.7617,
  longitude: -80.1918,
  accuracy: 10
};

// Mock props
const defaultProps = {
  userLocation: null,
  showDistanceCircles: false,
  setShowDistanceCircles: jest.fn(),
  showDirections: false,
  setShowDirections: jest.fn(),
  enableClustering: true,
  setEnableClustering: jest.fn(),
  markersCount: 5,
  onLocationClick: jest.fn(),
  onClearDirections: jest.fn(),
};

describe('MapControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders location button when no user location', () => {
    render(<MapControls {...defaultProps} />);
    
    const locationButton = screen.getByRole('button', { name: /get your current location/i });
    expect(locationButton).toBeInTheDocument();
  });

  it('renders location button with "My Location" text when user location exists', () => {
    render(<MapControls {...defaultProps} userLocation={mockUserLocation} />);
    
    const locationButton = screen.getByRole('button', { name: /center map on your location/i });
    expect(locationButton).toBeInTheDocument();
  });

  it('calls onLocationClick when location button is clicked', () => {
    render(<MapControls {...defaultProps} />);
    
    const locationButton = screen.getByRole('button', { name: /get your current location/i });
    fireEvent.click(locationButton);
    
    expect(defaultProps.onLocationClick).toHaveBeenCalledTimes(1);
  });

  it('renders clear directions button when showDirections is true', () => {
    render(<MapControls {...defaultProps} userLocation={mockUserLocation} showDirections={true} />);
    
    const clearButton = screen.getByRole('button', { name: /clear directions/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('calls onClearDirections when clear directions button is clicked', () => {
    render(<MapControls {...defaultProps} userLocation={mockUserLocation} showDirections={true} />);
    
    const clearButton = screen.getByRole('button', { name: /clear directions/i });
    fireEvent.click(clearButton);
    
    expect(defaultProps.onClearDirections).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<MapControls {...defaultProps} userLocation={mockUserLocation} />);
    
    const locationButton = screen.getByRole('button', { name: /center map on your location/i });
    expect(locationButton).toHaveAttribute('aria-describedby', 'location-button-description');
    expect(locationButton).toHaveAttribute('title', 'Back to your location');
  });

  it('has proper mobile-friendly touch targets', () => {
    render(<MapControls {...defaultProps} userLocation={mockUserLocation} />);
    
    const locationButton = screen.getByRole('button', { name: /center map on your location/i });
    expect(locationButton).toHaveClass('min-h-[44px]', 'min-w-[44px]', 'touch-manipulation');
  });
});
