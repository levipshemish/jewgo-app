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
  default: function MockImage({ alt, onError, onLoad, ...props }: any) {
    // Simulate image loading behavior
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

describe('EnhancedProductCard Functional Tests', () => {
  const mockCardData = {
    id: '1',
    imageUrl: 'https://example.com/image.jpg',
    imageTag: 'Popular',
    imageTagLink: '/popular',
    title: 'Test Restaurant',
    badge: '4.5',
    subtitle: '$15-25',
    additionalText: 'Italian',
    showHeart: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFavorites.isFavorite.mockReturnValue(false);
  });

  describe('Rendering', () => {
    test('should render all card elements with provided data', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      // Image
      const image = screen.getByAltText('Test Restaurant');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');

      // Tag
      expect(screen.getByText('Popular')).toBeInTheDocument();

      // Title
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();

      // Badge
      expect(screen.getByText('4.5')).toBeInTheDocument();

      // Subtitle
      expect(screen.getByText('$15-25')).toBeInTheDocument();

      // Additional text
      expect(screen.getByText('Italian')).toBeInTheDocument();

      // Heart button
      expect(screen.getByRole('button', { name: /add to favorites/i })).toBeInTheDocument();
    });

    test('should render without optional fields', () => {
      const minimalData = {
        id: '2',
        title: 'Minimal Restaurant',
      };

      render(<EnhancedProductCard data={minimalData} />);

      expect(screen.getByText('Minimal Restaurant')).toBeInTheDocument();
      
      // Should not render optional elements
      expect(screen.queryByRole('button', { name: /popular tag/i })).not.toBeInTheDocument();
      expect(screen.queryByText('$15-25')).not.toBeInTheDocument();
      expect(screen.queryByText('Italian')).not.toBeInTheDocument();
    });

    test('should handle missing image URL with fallback', () => {
      const dataWithoutImage = {
        ...mockCardData,
        imageUrl: undefined,
      };

      render(<EnhancedProductCard data={dataWithoutImage} />);

      const image = screen.getByAltText('Minimal Restaurant');
      expect(image).toHaveAttribute('src', '/images/default-restaurant.webp');
    });

    test('should not show heart button when showHeart is false', () => {
      const dataWithoutHeart = {
        ...mockCardData,
        showHeart: false,
      };

      render(<EnhancedProductCard data={dataWithoutHeart} />);

      expect(screen.queryByRole('button', { name: /favorites/i })).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('should handle card click', () => {
      const mockOnCardClick = jest.fn();

      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
        />
      );

      const card = screen.getByRole('button', { name: /product card for test restaurant/i });
      fireEvent.click(card);

      expect(mockOnCardClick).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        title: 'Test Restaurant',
        imageTag: 'Popular',
        imageTagLink: '/popular',
        badge: '4.5',
        subtitle: '$15-25',
        additionalText: 'Italian',
        showHeart: true,
      }));
    });

    test('should handle heart button click and toggle state', async () => {
      const mockOnLikeToggle = jest.fn();

      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      
      // Initial state
      expect(heartButton).toHaveAttribute('aria-pressed', 'false');

      // Click to like
      fireEvent.click(heartButton);

      await waitFor(() => {
        expect(mockOnLikeToggle).toHaveBeenCalledWith('1', true);
        expect(mockUseFavorites.addFavorite).toHaveBeenCalled();
        expect(heartButton).toHaveAttribute('aria-pressed', 'true');
        expect(heartButton).toHaveAttribute('aria-label', 'Remove from favorites');
      });

      // Click to unlike
      fireEvent.click(heartButton);

      await waitFor(() => {
        expect(mockOnLikeToggle).toHaveBeenCalledWith('1', false);
        expect(mockUseFavorites.removeFavorite).toHaveBeenCalledWith('1');
      });
    });



    test('should prevent event propagation on heart clicks', () => {
      const mockOnCardClick = jest.fn();
      const mockOnLikeToggle = jest.fn();

      render(
        <EnhancedProductCard
          data={mockCardData}
          onCardClick={mockOnCardClick}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      // Click heart button
      const heartButton = screen.getByRole('button', { name: /add to favorites/i });
      fireEvent.click(heartButton);

      expect(mockOnLikeToggle).toHaveBeenCalled();
      expect(mockOnCardClick).not.toHaveBeenCalled();
    });
  });

  describe('Image Loading States', () => {
    test('should show loading spinner while image loads', () => {
      render(<EnhancedProductCard data={mockCardData} />);

      // Should initially show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('should handle image load error with fallback', async () => {
      const dataWithBadImage = {
        ...mockCardData,
        imageUrl: 'https://example.com/error-image.jpg',
      };

      render(<EnhancedProductCard data={dataWithBadImage} />);

      await waitFor(() => {
        const image = screen.getByAltText('Test Restaurant');
        expect(image).toHaveAttribute('src', '/images/default-restaurant.webp');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long text with truncation', () => {
      const longTextData = {
        ...mockCardData,
        title: 'This is a very long restaurant name that should be truncated',
        subtitle: 'This is also a very long subtitle that needs truncation',
        additionalText: 'Very long additional text here',
        imageTag: 'VeryLongTagName',
      };

      render(<EnhancedProductCard data={longTextData} />);

      // Check that elements have truncation styles
      const title = screen.getByLabelText(/title:/i);
      expect(title).toHaveClass('truncate');

      const subtitle = screen.getByLabelText(/price range:/i);
      expect(subtitle).toHaveStyle({ textOverflow: 'ellipsis' });

      const additionalText = screen.getByLabelText(/additional info:/i);
      expect(additionalText).toHaveStyle({ textOverflow: 'ellipsis' });
    });

    test('should handle rapid like/unlike clicks', async () => {
      const mockOnLikeToggle = jest.fn();

      render(
        <EnhancedProductCard
          data={mockCardData}
          onLikeToggle={mockOnLikeToggle}
        />
      );

      const heartButton = screen.getByRole('button', { name: /add to favorites/i });

      // Rapid clicks
      fireEvent.click(heartButton);
      fireEvent.click(heartButton);
      fireEvent.click(heartButton);

      // Should only process the first click while animating
      await waitFor(() => {
        expect(mockOnLikeToggle).toHaveBeenCalledTimes(1);
      });

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 250));

      // Now should be able to click again
      fireEvent.click(heartButton);

      await waitFor(() => {
        expect(mockOnLikeToggle).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle tag without link', () => {
      const dataWithTagNoLink = {
        ...mockCardData,
        imageTag: 'NoLinkTag',
        imageTagLink: undefined,
      };

      render(<EnhancedProductCard data={dataWithTagNoLink} />);

      const tag = screen.getByLabelText(/tag: nol/i);
      expect(tag).toBeInTheDocument();
      expect(tag.tagName).not.toBe('BUTTON'); // Should not be a button without link
    });
  });

  describe('Custom Styling', () => {
    test('should apply custom className', () => {
      render(
        <EnhancedProductCard
          data={mockCardData}
          className="custom-class bg-red-500"
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveClass('custom-class', 'bg-red-500');
    });
  });

  describe('Priority Loading', () => {
    test('should pass priority prop to image', () => {
      render(
        <EnhancedProductCard
          data={mockCardData}
          priority={true}
        />
      );

      const image = screen.getByAltText('Test Restaurant');
      expect(image).toHaveAttribute('priority', 'true');
    });
  });

  describe('Cloudinary Image Handling', () => {
    test('should add cloudinary transformations to cloudinary URLs', () => {
      const cloudinaryData = {
        ...mockCardData,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v123/test.jpg',
      };

      render(<EnhancedProductCard data={cloudinaryData} />);

      const image = screen.getByAltText('Test Restaurant');
      expect(image).toHaveAttribute('unoptimized', 'true');
    });

    test('should normalize broken image_1 variants', () => {
      const brokenImageData = {
        ...mockCardData,
        imageUrl: 'https://example.com/image_1.jpg',
      };

      render(<EnhancedProductCard data={brokenImageData} />);

      const image = screen.getByAltText('Test Restaurant');
      expect(image.getAttribute('src')).toBe('https://example.com/image_1');
    });
  });
});
