import { render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import MapLegend from '../MapLegend';

describe('MapLegend', () => {
  it('renders legend with rating bubbles when showRatingBubbles is true', () => {
    render(<MapLegend showRatingBubbles={true} />);
    
    expect(screen.getByText('Kosher Types:')).toBeInTheDocument();
    expect(screen.getByText('Meat')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Pareve')).toBeInTheDocument();
  });

  it('renders legend without rating bubbles when showRatingBubbles is false', () => {
    render(<MapLegend showRatingBubbles={false} />);
    
    expect(screen.getByText('Kosher Types:')).toBeInTheDocument();
    expect(screen.getByText('Meat')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Pareve')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<MapLegend showRatingBubbles={true} />);
    
    const legend = screen.getByRole('region');
    expect(legend).toHaveAttribute('aria-label', 'Map legend showing kosher restaurant types');
  });

  it('has proper responsive classes', () => {
    render(<MapLegend showRatingBubbles={true} />);
    
    const legend = screen.getByRole('region');
    expect(legend).toHaveClass('max-w-[100px]', 'sm:max-w-[120px]', 'md:max-w-none');
  });

  it('renders all kosher categories', () => {
    render(<MapLegend showRatingBubbles={true} />);
    
    const categories = ['Meat', 'Dairy', 'Pareve'];
    categories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  it('has proper z-index for overlay positioning', () => {
    render(<MapLegend showRatingBubbles={true} />);
    
    const legend = screen.getByRole('region');
    expect(legend).toHaveClass('z-10');
  });
});
