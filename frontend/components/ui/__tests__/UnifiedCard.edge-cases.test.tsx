import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import EnhancedProductCard from '../UnifiedCard';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock mobile touch hook
jest.mock('@/lib/hooks/useMobileTouch', () => ({
  useMobileTouch: () => ({
    handleImmediateTouch: (fn: Function) => fn,
  }),
}));

// Mock favorites hook
const mockUseFavorites = {
  isFavorite: jest.fn(() => false),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
};

jest.mock('@/lib/utils/favorites', () => ({
  useFavorites: () => mockUseFavorites,
}));

// Mock image URL validator
const mockGetSafeImageUrl = jest.fn((url: string) => url || '/images/default-restaurant.webp');

jest.mock('@/lib/utils/imageUrlValidator', () => ({
  getSafeImageUrl: mockGetSafeImageUrl,
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ alt, onError, onLoad, ...props }: any) {
    React.useEffect(() => {
      if (props.src && props.src.includes('error')) {
        onError?.();
      } else {
        onLoad?.();
      }
    }, [props.src, onError, onLoad]);
    
    return <img alt={alt} {...props} />;
  },
}));

// Mock console methods for error testing
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('EnhancedProductCard Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFavorites.isFavorite.mockReturnValue(false);
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Null and Undefined Data Handling', () => {
    test('should handle null values gracefully', () => {
      const nullData = {
        id: '1',
        title: 'Test',
        imageUrl: null as any,
        imageTag: null as any,
        badge: null as any,
        subtitle: null as any,
        additionalText: null as any,
      };

      render(<EnhancedProductCard data={nullData} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /tag/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/rating/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/price range/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/additional info/i)).not.toBeInTheDocument();
    });

    test('should handle undefined values gracefully', () => {
      const undefinedData = {
        id: '1',
        title: 'Test',
        imageUrl: undefined,
        imageTag: undefined,
        badge: undefined,
        subtitle: undefined,
        additionalText: undefined,
      };

      render(<EnhancedProductCard data={undefinedData} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      // Should not crash and should not render undefined elements
    });

    test('should handle empty strings', () => {
      const emptyData = {
        id: '1',
        title: 'Test',
        imageUrl: '',
        imageTag: '',
        badge: '',
        subtitle: '',
        additionalText: '',
      };

      render(<EnhancedProductCard data={emptyData} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      // Empty strings should not render elements
      expect(screen.queryByRole('button', { name: /tag/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/rating/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/price range/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/additional info/i)).not.toBeInTheDocument();
    });
  });

  describe('Special Characters and Unicode', () => {
    test('should handle special characters in text fields', () => {
      const specialCharData = {
        id: '1',
        title: 'Café & Bistro™ • 🍕',
        imageTag: '❤️ Popular',
        badge: '★4.9',
        subtitle: '€€€ • £25-50',
        additionalText: '© 2024 · ½ mile',
      };

      render(<EnhancedProductCard data={specialCharData} />);

      expect(screen.getByText('Café & Bistro™ • 🍕')).toBeInTheDocument();
      expect(screen.getByText('❤️ Popular')).toBeInTheDocument();
      expect(screen.getByText('★4.9')).toBeInTheDocument();
      expect(screen.getByText('€€€ • £25-50')).toBeInTheDocument();
      expect(screen.getByText('© 2024 · ½ mile')).toBeInTheDocument();
    });

    test('should handle RTL text', () => {
      const rtlData = {
        id: '1',
        title: 'مطعم الشرق الأوسط',
        imageTag: 'כשר',
        subtitle: '₪₪₪',
        additionalText: 'العربية',
      };

      render(<EnhancedProductCard data={rtlData} />);

      expect(screen.getByText('مطعم الشرق الأوسط')).toBeInTheDocument();
      expect(screen.getByText('כשר')).toBeInTheDocument();
      expect(screen.getByText('₪₪₪')).toBeInTheDocument();
      expect(screen.getByText('العربية')).toBeInTheDocument();
    });
  });

  describe('XSS and Security', () => {
    test('should escape HTML in text fields', () => {
      const xssData = {
        id: '1',
        title: '<script>alert("XSS")</script>Restaurant',
        imageTag: '<img src=x onerror=alert("XSS")>',
        badge: '<b>4.5</b>',
        subtitle: '<style>body{display:none}</style>',
        additionalText: '<iframe src="evil.com"></iframe>',
      };

      render(<EnhancedProductCard data={xssData} />);

      // HTML should be escaped, not executed
      expect(screen.queryByRole('img', { name: /x/i })).not.toBeInTheDocument();
      expect(document.querySelector('script')).not.toBeInTheDocument();
      expect(document.querySelector('iframe')).not.toBeInTheDocument();
      expect(document.querySelector('style')).not.toBeInTheDocument();
    });

    test('should handle malicious image URLs', () => {
      const maliciousData = {
        id: '1',
        title: 'Test',
        imageUrl: 'javascript:alert("XSS")',
      };

      render(<EnhancedProductCard data={maliciousData} />);

      const image = screen.getByAltText('Test');
      expect(image.getAttribute('src')).not.toContain('javascript:');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle rapid re-renders without memory leaks', () => {
      const { rerender } = render(
        <EnhancedProductCard data={{ id: '1', title: 'Test' }} />
      );

      // Rapid re-renders with different data
      for (let i = 0; i < 100; i++) {
        rerender(
          <EnhancedProductCard 
            data={{ 
              id: String(i), 
              title: `Test ${i}`,
              imageUrl: `https://example.com/image${i}.jpg`,
              badge: String(Math.random() * 5),
            }} 
          />
        );
      }

      // Should not crash or have memory issues
      expect(screen.getByText('Test 99')).toBeInTheDocument();
    });

    test('should handle component unmounting during async operations', async () => {
      const mockOnLikeToggle = jest.fn();
      
      const { unmount } = render(
        <EnhancedProductCard 
          data={{ id: '1', title: 'Test' }}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      // Unmount immediately after click
      unmount();

      // Should not throw errors or warnings
      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Extreme Values', () => {
    test('should handle very long strings', () => {
      const longString = 'A'.repeat(1000);
      const extremeData = {
        id: '1',
        title: longString,
        imageTag: longString,
        badge: longString,
        subtitle: longString,
        additionalText: longString,
      };

      render(<EnhancedProductCard data={extremeData} />);

      // Should truncate long strings
      const title = screen.getByLabelText(/title:/i);
      expect(title).toHaveClass('truncate');
      expect(title).toHaveStyle({ overflow: 'hidden' });
    });

    test('should handle numeric values as strings', () => {
      const numericData = {
        id: 123 as any,
        title: 456 as any,
        imageTag: 789 as any,
        badge: 0 as any,
        subtitle: -123 as any,
        additionalText: 3.14159 as any,
      };

      render(<EnhancedProductCard data={numericData} />);

      // Should convert numbers to strings
      expect(screen.getByText('456')).toBeInTheDocument();
      expect(screen.getByText('789')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('-123')).toBeInTheDocument();
      expect(screen.getByText('3.14159')).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility', () => {
    test('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const dataWithTag = {
        id: '1',
        title: 'Test',
        imageTag: 'Tag',
        imageTagLink: '/tag',
      };

      render(<EnhancedProductCard data={dataWithTag} />);

      const tagButton = screen.getByRole('button', { name: /tag/i });
      fireEvent.click(tagButton);

      // Should not crash when window is undefined
      expect(console.error).not.toHaveBeenCalled();

      global.window = originalWindow;
    });
  });

  describe('Concurrent Interactions', () => {
    test('should handle simultaneous clicks on different elements', async () => {
      const mockOnCardClick = jest.fn();
      const mockOnLikeToggle = jest.fn();

      render(
        <EnhancedProductCard
          data={{
            id: '1',
            title: 'Test',
            imageTag: 'Tag',
            showHeart: true,
          }}
          onCardClick={mockOnCardClick}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const card = screen.getByRole('button', { name: /product card/i });
      const heartButton = screen.getByRole('button', { name: /add to favorites/i });

      // Simulate rapid concurrent clicks
      fireEvent.click(heartButton);
      fireEvent.click(card);

      await waitFor(() => {
        expect(mockOnLikeToggle).toHaveBeenCalled();
        // Card click should not fire due to stopPropagation
        expect(mockOnCardClick).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Boundaries', () => {
    test('should log warning for favorites hook errors', async () => {
      mockUseFavorites.addFavorite.mockImplementation(() => {
        throw new Error('Favorites error');
      });

      render(
        <EnhancedProductCard
          data={{ id: '1', title: 'Test' }}
          onLikeToggle={jest.fn()}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('Card error:', expect.any(Error));
      });
    });
  });

  describe('Accessibility Edge Cases', () => {
    test('should maintain focus after interactions', async () => {
      render(
        <EnhancedProductCard
          data={{ id: '1', title: 'Test', showHeart: true }}
          onLikeToggle={jest.fn()}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      heartButton.focus();
      
      expect(document.activeElement).toBe(heartButton);
      
      fireEvent.click(heartButton);
      
      // Focus should remain on the button
      await waitFor(() => {
        expect(document.activeElement).toBe(heartButton);
      });
    });

    test('should handle screen reader announcements with special characters', async () => {
      render(
        <EnhancedProductCard
          data={{ id: '1', title: 'Café™ & Restaurant 🍕', showHeart: true }}
          onLikeToggle={jest.fn()}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('Added to favorites');
      });
    });
  });
});
