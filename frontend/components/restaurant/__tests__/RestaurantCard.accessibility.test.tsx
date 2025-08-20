import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import RestaurantCard from '../RestaurantCard';
import { Restaurant } from '@/lib/types/restaurant';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock mobile touch hook
jest.mock('@/lib/hooks/useMobileTouch', () => ({
  useMobileTouch: () => ({
    handleImmediateTouch: (fn: Function) => fn,
  }),
}));

// Mock OptimizedImage component
jest.mock('@/components/ui/OptimizedImage', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

// Mock FeedbackButton component
jest.mock('@/components/feedback/FeedbackButton', () => ({
  __esModule: true,
  default: () => <div data-testid="feedback-button">Feedback</div>,
}));

// Mock utility functions
jest.mock('@/lib/utils/imageUrlValidator', () => ({
  getSafeImageUrl: jest.fn((url: string) => url || '/images/default-restaurant.webp'),
}));

jest.mock('@/lib/utils/kosherCategories', () => ({
  getKosherCategoryBadgeClasses: jest.fn(() => 'bg-blue-500 text-white'),
}));

jest.mock('@/lib/utils/reviewUtils', () => ({
  getBusinessTypeDisplayName: jest.fn(() => 'Restaurant'),
  getBusinessTypeIcon: jest.fn(() => '🍽️'),
  getBusinessTypeColor: jest.fn(() => 'bg-green-500 text-white'),
  parseReviewSnippets: jest.fn(() => []),
  getAverageRating: jest.fn(() => 4.5),
  formatReviewCount: jest.fn(() => '(10)'),
}));

describe('RestaurantCard Accessibility', () => {
  const mockRestaurant: Restaurant = {
    id: '1',
    name: 'Test Restaurant',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip_code: '12345',
    phone_number: '555-1234',
    kosher_category: 'meat',
    certifying_agency: 'Test Agency',
    listing_type: 'restaurant',
    status: 'open',
    hours: {},
    category: { name: 'Test Category' },
    image_url: 'https://example.com/image.jpg',
    price_range: '$15-25',
    rating: 4.5,
    business_types: 'restaurant',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role attributes', () => {
    test('should have role="button" and tabIndex=0 when onCardClick is provided', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <RestaurantCard
          restaurant={mockRestaurant}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    test('should have role="article" and tabIndex=-1 when onCardClick is not provided', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '-1');
    });

    test('should not have cursor-pointer class when onCardClick is not provided', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    test('should have cursor-pointer class when onCardClick is provided', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <RestaurantCard
          restaurant={mockRestaurant}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Live region announcements', () => {
    test('should have persistent live region for announcements', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });
  });

  describe('Keyboard navigation', () => {
    test('should handle Enter key when card has onCardClick', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <RestaurantCard
          restaurant={mockRestaurant}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnCardClick).toHaveBeenCalled();
    });

    test('should not respond to other keys', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <RestaurantCard
          restaurant={mockRestaurant}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Space' });
      fireEvent.keyDown(card, { key: 'Tab' });

      expect(mockOnCardClick).not.toHaveBeenCalled();
    });

    test('should navigate to restaurant page when no onCardClick and Enter is pressed', () => {
      const mockPush = jest.fn();
      const mockUseRouter = jest.requireMock('next/navigation').useRouter;
      mockUseRouter.mockReturnValue({ push: mockPush });

      render(<RestaurantCard restaurant={mockRestaurant} />);

      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockPush).toHaveBeenCalledWith('/restaurant/1');
    });
  });

  describe('Click handling', () => {
    test('should call onCardClick when provided and card is clicked', () => {
      const mockOnCardClick = jest.fn();
      
      render(
        <RestaurantCard
          restaurant={mockRestaurant}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(mockOnCardClick).toHaveBeenCalled();
    });

    test('should navigate to restaurant page when no onCardClick and card is clicked', () => {
      const mockPush = jest.fn();
      const mockUseRouter = jest.requireMock('next/navigation').useRouter;
      mockUseRouter.mockReturnValue({ push: mockPush });

      render(<RestaurantCard restaurant={mockRestaurant} />);

      const card = screen.getByRole('article');
      fireEvent.click(card);

      expect(mockPush).toHaveBeenCalledWith('/restaurant/1');
    });
  });

  describe('Content accessibility', () => {
    test('should have proper alt text for restaurant image', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const image = screen.getByAltText('Test Restaurant');
      expect(image).toBeInTheDocument();
    });

    test('should display restaurant name as heading', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const heading = screen.getByRole('heading', { name: 'Test Restaurant' });
      expect(heading).toBeInTheDocument();
    });

    test('should have accessible kosher category badge', () => {
      render(<RestaurantCard restaurant={mockRestaurant} />);

      const kosherBadge = screen.getByText('Meat');
      expect(kosherBadge).toBeInTheDocument();
    });
  });
});
