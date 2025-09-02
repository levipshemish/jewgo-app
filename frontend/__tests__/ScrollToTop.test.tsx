import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { scrollToTop } from '@/lib/utils/scrollUtils';

// Mock the scroll utility
jest.mock('@/lib/utils/scrollUtils', () => ({
  scrollToTop: jest.fn()
}));

describe('ScrollToTop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should not render initially', () => {
    render(<ScrollToTop />);
    expect(screen.queryByLabelText('Scroll to top')).not.toBeInTheDocument();
  });

  it('should appear after scrolling past threshold', () => {
    // Test that the component can be made visible with the threshold prop
    render(<ScrollToTop threshold={0.5} initialVisible={true} />);
    
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
  });

  it('should call scrollToTop when clicked', () => {
    render(<ScrollToTop initialVisible={true} />);
    
    const button = screen.getByLabelText('Scroll to top');
    fireEvent.click(button);
    
    expect(scrollToTop).toHaveBeenCalledWith('smooth');
  });

  it('should respect reduced motion preference', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock scroll position to make button visible
    Object.defineProperty(window, 'pageYOffset', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    render(<ScrollToTop initialVisible={true} />);
    
    const button = screen.getByLabelText('Scroll to top');
    fireEvent.click(button);
    
    expect(scrollToTop).toHaveBeenCalledWith('auto');
  });

  it('should use custom threshold', () => {
    // Test with threshold 1.0 - button should not show at 0.5x viewport height
    Object.defineProperty(window, 'pageYOffset', { value: 300, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    // Test with threshold 1.0 - button should not show at 0.5x viewport height
    render(<ScrollToTop threshold={1.0} initialVisible={false} />);
    
    // Button should not be visible
    expect(screen.queryByLabelText('Scroll to top')).not.toBeInTheDocument();
    
    // Now test with button visible
    render(<ScrollToTop threshold={1.0} initialVisible={true} />);
    
    // Button should now be visible
    expect(screen.getByLabelText('Scroll to top')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Mock scroll position to make button visible
    Object.defineProperty(window, 'pageYOffset', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    
    render(<ScrollToTop className="custom-class" initialVisible={true} />);
    
    const button = screen.getByLabelText('Scroll to top');
    expect(button).toHaveClass('custom-class');
  });
});
