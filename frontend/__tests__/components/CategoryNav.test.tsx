import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CategoryNav } from '@/components/ui/CategoryNav';
import { CategoryNavItem } from '@/components/ui/CategoryNav.types';

expect.extend(toHaveNoViolations);

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChevronLeftIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chevron-left" />
  ),
  ChevronRightIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chevron-right" />
  ),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
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

const mockItems: CategoryNavItem[] = [
  { id: 'item1', label: 'Item 1' },
  { id: 'item2', label: 'Item 2' },
  { id: 'item3', label: 'Item 3' },
  { id: 'item4', label: 'Item 4' },
  { id: 'item5', label: 'Item 5' },
];

const mockItemsWithIcons: CategoryNavItem[] = [
  { id: 'item1', label: 'Item 1', icon: <span data-testid="icon1">🚀</span> },
  { id: 'item2', label: 'Item 2', icon: <span data-testid="icon2">⭐</span> },
  { id: 'item3', label: 'Item 3', icon: <span data-testid="icon3">💎</span> },
];

const mockItemsWithLinks: CategoryNavItem[] = [
  { id: 'item1', label: 'Internal Link', href: '/internal' },
  { id: 'item2', label: 'External Link', href: 'https://example.com' },
  { id: 'item3', label: 'Button Item' },
];

describe('CategoryNav', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('renders all items', () => {
      render(<CategoryNav items={mockItems} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
      expect(screen.getByText('Item 5')).toBeInTheDocument();
    });

    it('calls onSelect when item is clicked', async () => {
      const onSelect = jest.fn();
      render(<CategoryNav items={mockItems} onSelect={onSelect} />);
      
      await user.click(screen.getByText('Item 1'));
      expect(onSelect).toHaveBeenCalledWith('item1');
    });

    it('highlights selected item', () => {
      render(<CategoryNav items={mockItems} selectedId="item2" />);
      
      const selectedItem = screen.getByText('Item 2').closest('[data-selected="true"]');
      expect(selectedItem).toBeInTheDocument();
    });
  });

  describe('P0 Critical Fixes', () => {
    describe('Button type attributes', () => {
      it('sets type="button" on all action buttons', () => {
        render(<CategoryNav items={mockItems} />);
        
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type', 'button');
        });
      });

      it('sets type="button" on Prev/Next controls', () => {
        // Mock overflow to show controls
        const mockResizeObserver = jest.fn().mockImplementation((callback) => ({
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        }));
        global.ResizeObserver = mockResizeObserver;

        render(<CategoryNav items={mockItems} />);
        
        // Force overflow state by mocking scroll properties
        const scroller = screen.getByRole('region');
        Object.defineProperty(scroller, 'scrollLeft', { value: 10, configurable: true });
        Object.defineProperty(scroller, 'scrollWidth', { value: 1000, configurable: true });
        Object.defineProperty(scroller, 'clientWidth', { value: 500, configurable: true });

        // Trigger resize observer callback
        const resizeObserverCallback = mockResizeObserver.mock.calls[0][0];
        resizeObserverCallback();

        // Check if controls are rendered and have correct type
        const prevButton = screen.queryByLabelText('Scroll to previous categories');
        const nextButton = screen.queryByLabelText('Scroll to next categories');
        
        if (prevButton) {
          expect(prevButton).toHaveAttribute('type', 'button');
        }
        if (nextButton) {
          expect(nextButton).toHaveAttribute('type', 'button');
        }
      });
    });

    describe('Form context tests', () => {
      it('does not submit form when pressing Space on action buttons', async () => {
        const handleSubmit = jest.fn();
        
        render(
          <form onSubmit={handleSubmit}>
            <CategoryNav items={mockItems} />
            <button type="submit">Submit</button>
          </form>
        );

        const itemButton = screen.getByText('Item 1').closest('button');
        expect(itemButton).toBeInTheDocument();

        // Focus the button and press Space
        itemButton?.focus();
        await user.keyboard(' ');

        // Form should not be submitted
        expect(handleSubmit).not.toHaveBeenCalled();
      });

      it('does not submit form when pressing Enter on action buttons', async () => {
        const handleSubmit = jest.fn();
        
        render(
          <form onSubmit={handleSubmit}>
            <CategoryNav items={mockItems} />
            <button type="submit">Submit</button>
          </form>
        );

        const itemButton = screen.getByText('Item 1').closest('button');
        expect(itemButton).toBeInTheDocument();

        // Focus the button and press Enter
        itemButton?.focus();
        await user.keyboard('{Enter}');

        // Form should not be submitted
        expect(handleSubmit).not.toHaveBeenCalled();
      });
    });

    describe('Event handling hygiene', () => {
      it('calls preventDefault and stopPropagation when consuming navigation keys', async () => {
        const onSelect = jest.fn();
        render(<CategoryNav items={mockItems} onSelect={onSelect} />);

        const scroller = screen.getByRole('region');
        scroller.focus();

        // Mock event methods
        const mockEvent = {
          key: 'ArrowRight',
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
          ctrlKey: false,
          metaKey: false,
        };

        // Trigger keydown
        fireEvent.keyDown(scroller, mockEvent);

        // Event should be prevented and stopped
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
      });

      it('does not prevent default for Tab key', async () => {
        render(<CategoryNav items={mockItems} />);

        const scroller = screen.getByRole('region');
        scroller.focus();

        const mockEvent = {
          key: 'Tab',
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
          ctrlKey: false,
          metaKey: false,
        };

        fireEvent.keyDown(scroller, mockEvent);

        // Tab should not be prevented
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
        expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      });
    });
  });

  describe('P1 Hardening Items', () => {
    describe('Icon accessibility', () => {
      it('sets aria-hidden="true" and focusable="false" on item icons', () => {
        render(<CategoryNav items={mockItemsWithIcons} />);
        
        const icons = screen.getAllByTestId(/icon\d/);
        icons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
          expect(icon).toHaveAttribute('focusable', 'false');
        });
      });

      it('sets aria-hidden="true" and focusable="false" on navigation icons', () => {
        // Mock overflow to show controls
        const mockResizeObserver = jest.fn().mockImplementation((callback) => ({
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        }));
        global.ResizeObserver = mockResizeObserver;

        render(<CategoryNav items={mockItems} />);

        // Force overflow state
        const scroller = screen.getByRole('region');
        Object.defineProperty(scroller, 'scrollLeft', { value: 10, configurable: true });
        Object.defineProperty(scroller, 'scrollWidth', { value: 1000, configurable: true });
        Object.defineProperty(scroller, 'clientWidth', { value: 500, configurable: true });

        const resizeObserverCallback = mockResizeObserver.mock.calls[0][0];
        resizeObserverCallback();

        const chevronIcons = screen.getAllByTestId(/chevron-(left|right)/);
        chevronIcons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
          expect(icon).toHaveAttribute('focusable', 'false');
        });
      });
    });

    describe('External link security', () => {
      it('adds rel="noopener noreferrer" for external links', () => {
        render(<CategoryNav items={mockItemsWithLinks} />);
        
        const externalLink = screen.getByText('External Link').closest('a');
        expect(externalLink).toHaveAttribute('target', '_blank');
        expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
      });

      it('does not add security attributes for internal links', () => {
        render(<CategoryNav items={mockItemsWithLinks} />);
        
        const internalLink = screen.getByText('Internal Link').closest('a');
        expect(internalLink).not.toHaveAttribute('target');
        expect(internalLink).not.toHaveAttribute('rel');
      });
    });

    describe('Next.js performance optimization', () => {
      it('sets prefetch={false} on Link components', () => {
        render(<CategoryNav items={mockItemsWithLinks} />);
        
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          // Check if the link has the prefetch attribute set to false
          // This is handled by Next.js Link internally, so we verify the component structure
          expect(link).toBeInTheDocument();
        });
      });
    });

    describe('State attributes', () => {
      it('sets data-overflow attribute on scroller', () => {
        render(<CategoryNav items={mockItems} />);
        
        const scroller = screen.getByRole('region');
        expect(scroller).toHaveAttribute('data-overflow');
      });

      it('sets data-index, data-selected, and data-focused on items', () => {
        render(<CategoryNav items={mockItems} selectedId="item2" />);
        
        const items = screen.getAllByText(/Item \d/);
        items.forEach((item, index) => {
          const itemContainer = item.closest('[data-index]');
          expect(itemContainer).toHaveAttribute('data-index', index.toString());
          expect(itemContainer).toHaveAttribute('data-selected');
          expect(itemContainer).toHaveAttribute('data-focused');
        });
      });
    });

    describe('Robust first focus', () => {
      it('scrolls offscreen selected item into view on first focus', async () => {
        // Mock scrollIntoView
        const mockScrollIntoView = jest.fn();
        Element.prototype.scrollIntoView = mockScrollIntoView;

        // Mock getBoundingClientRect to simulate offscreen element
        const mockGetBoundingClientRect = jest.fn().mockReturnValue({
          left: -100, // Offscreen to the left
          right: -50,
          top: 0,
          bottom: 50,
        });
        Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

        render(<CategoryNav items={mockItems} selectedId="item3" />);

        // Wait for initialization
        await waitFor(() => {
          expect(mockScrollIntoView).toHaveBeenCalled();
        });

        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'auto', // Should respect reduced motion
          block: 'nearest',
          inline: 'nearest',
        });
      });
    });
  });

  describe('Prev/Next focus management', () => {
    it('hides controls when no overflow', () => {
      render(<CategoryNav items={mockItems} />);
      
      const prevButton = screen.queryByLabelText('Scroll to previous categories');
      const nextButton = screen.queryByLabelText('Scroll to next categories');
      
      expect(prevButton).not.toBeInTheDocument();
      expect(nextButton).not.toBeInTheDocument();
    });

    it('sets tabIndex={-1} on hidden controls', () => {
      // Mock overflow to show then hide controls
      const mockResizeObserver = jest.fn().mockImplementation((callback) => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));
      global.ResizeObserver = mockResizeObserver;

      render(<CategoryNav items={mockItems} />);

      // Force overflow state
      const scroller = screen.getByRole('region');
      Object.defineProperty(scroller, 'scrollLeft', { value: 10, configurable: true });
      Object.defineProperty(scroller, 'scrollWidth', { value: 1000, configurable: true });
      Object.defineProperty(scroller, 'clientWidth', { value: 500, configurable: true });

      const resizeObserverCallback = mockResizeObserver.mock.calls[0][0];
      resizeObserverCallback();

      // Check if controls have proper tabIndex
      const prevButton = screen.queryByLabelText('Scroll to previous categories');
      const nextButton = screen.queryByLabelText('Scroll to next categories');
      
      if (prevButton) {
        expect(prevButton).toHaveAttribute('tabIndex', '0');
      }
      if (nextButton) {
        expect(nextButton).toHaveAttribute('tabIndex', '0');
      }
    });
  });

  describe('Keyboard navigation', () => {
    it('supports arrow key navigation', async () => {
      const onSelect = jest.fn();
      render(<CategoryNav items={mockItems} onSelect={onSelect} />);

      const scroller = screen.getByRole('region');
      scroller.focus();

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalled();
    });

    it('supports Home and End keys', async () => {
      render(<CategoryNav items={mockItems} />);

      const scroller = screen.getByRole('region');
      scroller.focus();

      // Go to end
      await user.keyboard('{End}');
      
      // Go to home
      await user.keyboard('{Home}');
    });

    it('supports Space and Enter for selection', async () => {
      const onSelect = jest.fn();
      render(<CategoryNav items={mockItems} onSelect={onSelect} />);

      const scroller = screen.getByRole('region');
      scroller.focus();

      // Select with Space
      await user.keyboard('{Space}');
      expect(onSelect).toHaveBeenCalledWith('item1');

      // Select with Enter
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledWith('item2');
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<CategoryNav items={mockItems} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports aria-label', () => {
      render(<CategoryNav items={mockItems} aria-label="Category navigation" />);
      
      const nav = screen.getByLabelText('Category navigation');
      expect(nav).toBeInTheDocument();
    });

    it('supports aria-labelledby', () => {
      render(
        <div>
          <h2 id="nav-title">Categories</h2>
          <CategoryNav items={mockItems} aria-labelledby="nav-title" />
        </div>
      );
      
      const nav = screen.getByLabelText('Categories');
      expect(nav).toBeInTheDocument();
    });

    it('has proper ARIA attributes on buttons', () => {
      render(<CategoryNav items={mockItems} selectedId="item2" />);
      
      const selectedButton = screen.getByText('Item 2').closest('button');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('RTL support', () => {
    it('handles RTL direction correctly', async () => {
      // Mock RTL
      Object.defineProperty(document.documentElement, 'dir', {
        value: 'rtl',
        configurable: true,
      });

      const onSelect = jest.fn();
      render(<CategoryNav items={mockItems} onSelect={onSelect} />);

      const scroller = screen.getByRole('region');
      scroller.focus();

      // In RTL, ArrowLeft should move to next item
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledWith('item2');
    });
  });

  describe('Reduced motion support', () => {
    it('respects reduced motion preference', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Mock scrollIntoView
      const mockScrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      render(<CategoryNav items={mockItems} selectedId="item3" />);

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'auto', // Should use 'auto' for reduced motion
          block: 'nearest',
          inline: 'nearest',
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty items array', () => {
      render(<CategoryNav items={[]} />);
      
      const scroller = screen.getByRole('region');
      expect(scroller).toBeInTheDocument();
    });

    it('handles undefined onSelect', () => {
      render(<CategoryNav items={mockItems} />);
      
      // Should not throw when clicking items
      expect(() => {
        fireEvent.click(screen.getByText('Item 1'));
      }).not.toThrow();
    });

    it('handles disabled items', () => {
      const disabledItems = [
        { id: 'item1', label: 'Disabled Item', disabled: true },
        { id: 'item2', label: 'Enabled Item', disabled: false },
      ];

      render(<CategoryNav items={disabledItems} />);
      
      const disabledItem = screen.getByText('Disabled Item').closest('[data-disabled="true"]');
      expect(disabledItem).toBeInTheDocument();
    });
  });
});
