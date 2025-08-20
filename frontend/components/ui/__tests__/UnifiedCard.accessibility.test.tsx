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
jest.mock('@/lib/utils/imageUrlValidator', () => ({
  getSafeImageUrl: jest.fn((url: string) => url || '/images/default-restaurant.webp'),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

describe('EnhancedProductCard Accessibility', () => {
  const mockCardData = {
    id: '1',
    imageUrl: 'https://example.com/image.jpg',
    imageTag: 'Popular',
    title: 'Test Restaurant',
    badge: '4.5',
    subtitle: '$15-25',
    additionalText: 'Italian',
    showHeart: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockUseFavorites.isFavorite.mockReturnValue(false);
  });

  describe('Role attributes', () => {
    test('should have role="button" and tabIndex=0 when onCardClick is provided', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    test('should have role="article" and tabIndex=-1 when onCardClick is not provided', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '-1');
    });

    test('should not have cursor-pointer class when onCardClick is not provided', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    test('should have cursor-pointer class when onCardClick is provided', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Live region announcements', () => {
    test('should have persistent live region for announcements', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });

    test('should announce when item is added to favorites', async () => {
      const mockOnLikeToggle = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('Added to favorites');
      });

      // Announcement should clear after timeout
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('');
      }, { timeout: 1500 });
    });

    test('should announce when item is removed from favorites', async () => {
      const mockOnLikeToggle = jest.fn();
      
      // Mock favorites hook to return true initially
      mockUseFavorites.isFavorite.mockReturnValue(true);
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /remove from favorites/i });
      fireEvent.click(heartButton);

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('Removed from favorites');
      });
    });

    test('should not create dynamic DOM elements for announcements', () => {
      const mockOnLikeToggle = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const initialDivCount = document.querySelectorAll('div').length;
      
      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      // Should not create additional DOM elements
      const finalDivCount = document.querySelectorAll('div').length;
      expect(finalDivCount).toBe(initialDivCount);
    });
  });

  describe('Keyboard navigation', () => {
    test('should handle Enter key when card has onCardClick', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnCardClick).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        title: 'Test Restaurant',
      }));
    });

    test('should handle Space key when card has onCardClick', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });

      expect(mockOnCardClick).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        title: 'Test Restaurant',
      }));
    });

    test('should not respond to keyboard when card has no onCardClick', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });

      // No assertions needed - just ensuring no errors occur
    });
  });

  describe('ARIA labels and descriptions', () => {
    test('should have proper aria-label for the card', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Product card for Test Restaurant');
    });

    test('should have proper aria labels for heart button states', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      expect(heartButton).toHaveAttribute('aria-label', 'Add to favorites');
      expect(heartButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('should update aria-pressed when heart button is clicked', async () => {
      const mockOnLikeToggle = jest.fn();
      
      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      await waitFor(() => {
        expect(heartButton).toHaveAttribute('aria-pressed', 'true');
        expect(heartButton).toHaveAttribute('aria-label', 'Remove from favorites');
      });
    });
  });
});
