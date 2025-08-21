import type { Meta, StoryObj } from '@storybook/react';
import { CategoryNav } from '@/components/ui/CategoryNav';
import { CategoryNavItem } from '@/components/ui/CategoryNav.types';
import { HomeIcon, StarIcon, HeartIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof CategoryNav> = {
  title: 'Components/UI/CategoryNav',
  component: CategoryNav,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A production-ready category navigation component with comprehensive accessibility, performance, and security features.

## Features
- **P0 Critical Fixes**: Button type attributes, form submission prevention, event handling hygiene
- **P1 Hardening**: Icon accessibility, external link security, Next.js performance optimization
- **Production Guardrails**: Single source of truth, RTL caching, observer safety, hydration stability
- **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Performance**: Memoized items, ResizeObserver, reduced motion respect
- **Security**: External link protection, input sanitization, XSS prevention

## Usage
\`\`\`tsx
import { CategoryNav } from '@/components/ui/CategoryNav';

const items = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'favorites', label: 'Favorites', icon: <StarIcon /> },
  { id: 'profile', label: 'Profile', href: '/profile' },
];

<CategoryNav 
  items={items} 
  selectedId="home" 
  onSelect={(id) => console.log('Selected:', id)}
  aria-label="Main navigation"
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    items: {
      description: 'Array of category items to display',
      control: { type: 'object' },
    },
    selectedId: {
      description: 'Currently selected item ID',
      control: { type: 'text' },
    },
    onSelect: {
      description: 'Callback when an item is selected',
      action: 'selected',
    },
    className: {
      description: 'Optional CSS class name',
      control: { type: 'text' },
    },
    'aria-label': {
      description: 'Accessibility label for the navigation',
      control: { type: 'text' },
    },
    'aria-labelledby': {
      description: 'Accessibility labelledby reference',
      control: { type: 'text' },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CategoryNav>;

// Sample data
const basicItems: CategoryNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
  { id: 'blog', label: 'Blog' },
  { id: 'shop', label: 'Shop' },
];

const itemsWithIcons: CategoryNavItem[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'favorites', label: 'Favorites', icon: <StarIcon /> },
  { id: 'likes', label: 'Likes', icon: <HeartIcon /> },
  { id: 'trending', label: 'Trending', icon: <FireIcon /> },
  { id: 'featured', label: 'Featured', icon: <SparklesIcon /> },
];

const itemsWithLinks: CategoryNavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'profile', label: 'Profile', href: '/profile' },
  { id: 'settings', label: 'Settings', href: '/settings' },
  { id: 'external', label: 'External Link', href: 'https://example.com' },
  { id: 'button', label: 'Button Item' },
];

const manyItems: CategoryNavItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `item-${i + 1}`,
  label: `Item ${i + 1}`,
  icon: i % 2 === 0 ? <StarIcon /> : <HeartIcon />,
}));

const disabledItems: CategoryNavItem[] = [
  { id: 'enabled', label: 'Enabled Item' },
  { id: 'disabled', label: 'Disabled Item', disabled: true },
  { id: 'another', label: 'Another Item' },
];

// Basic stories
export const Default: Story = {
  args: {
    items: basicItems,
  },
};

export const WithIcons: Story = {
  args: {
    items: itemsWithIcons,
    selectedId: 'favorites',
  },
};

export const WithLinks: Story = {
  args: {
    items: itemsWithLinks,
    selectedId: 'profile',
  },
};

export const ManyItems: Story = {
  args: {
    items: manyItems,
    selectedId: 'item-5',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates overflow behavior and scroll controls with many items.',
      },
    },
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: disabledItems,
    selectedId: 'enabled',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how disabled items are handled with proper styling and accessibility.',
      },
    },
  },
};

// P0 Critical Fixes stories
export const FormContext: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
  },
  render: (args) => (
    <form onSubmit={(e) => { e.preventDefault(); console.log('Form submitted'); }}>
      <CategoryNav {...args} />
      <button type="submit" style={{ marginTop: '1rem' }}>
        Submit Form
      </button>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates that action buttons have `type="button"` to prevent unintended form submission.',
      },
    },
  },
};

export const EventHandlingHygiene: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows proper event handling with `preventDefault()` and `stopPropagation()` for navigation keys.',
      },
    },
  },
};

// P1 Hardening stories
export const IconAccessibility: Story = {
  args: {
    items: itemsWithIcons,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper icon accessibility with `aria-hidden="true"` and `focusable="false"`.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'icon-accessible',
            enabled: true,
          },
        ],
      },
    },
  },
};

export const ExternalLinkSecurity: Story = {
  args: {
    items: itemsWithLinks,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows external link security with `rel="noopener noreferrer"` for `target="_blank"` links.',
      },
    },
  },
};

export const NextJsPerformance: Story = {
  args: {
    items: itemsWithLinks,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates Next.js performance optimization with `prefetch={false}` for large lists.',
      },
    },
  },
};

export const StateAttributes: Story = {
  args: {
    items: basicItems,
    selectedId: 'about',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows state attributes like `data-overflow`, `data-index`, `data-selected`, and `data-focused`.',
      },
    },
  },
};

export const RobustFirstFocus: Story = {
  args: {
    items: manyItems,
    selectedId: 'item-15', // Offscreen item
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates robust first focus behavior, scrolling offscreen selected items into view.',
      },
    },
  },
};

// Accessibility stories
export const WithAriaLabel: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
    'aria-label': 'Main category navigation',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows proper accessibility labeling with `aria-label`.',
      },
    },
  },
};

export const WithAriaLabelledBy: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
    'aria-labelledby': 'nav-title',
  },
  render: (args) => (
    <div>
      <h2 id="nav-title">Category Navigation</h2>
      <CategoryNav {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows proper accessibility labeling with `aria-labelledby` reference.',
      },
    },
  },
};

// RTL support
export const RTLSupport: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
  },
  render: (args) => (
    <div dir="rtl">
      <CategoryNav {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates RTL (right-to-left) language support with proper arrow key behavior.',
      },
    },
  },
};

// Reduced motion support
export const ReducedMotion: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Respects user\'s reduced motion preference for animations and scrolling.',
      },
    },
  },
};

// Dark mode support
export const DarkMode: Story = {
  args: {
    items: itemsWithIcons,
    selectedId: 'favorites',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Demonstrates dark mode support with proper color schemes.',
      },
    },
  },
};

// High contrast mode
export const HighContrast: Story = {
  args: {
    items: basicItems,
    selectedId: 'about',
  },
  parameters: {
    docs: {
      description: {
        story: 'Supports high contrast mode for better accessibility.',
      },
    },
  },
};

// Mobile responsiveness
export const MobileView: Story = {
  args: {
    items: basicItems,
    selectedId: 'home',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Demonstrates mobile-responsive design with proper touch targets.',
      },
    },
  },
};

// Edge cases
export const EmptyItems: Story = {
  args: {
    items: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Handles empty items array gracefully.',
      },
    },
  },
};

export const LongLabels: Story = {
  args: {
    items: [
      { id: 'short', label: 'Short' },
      { id: 'very-long-label', label: 'This is a very long label that might overflow' },
      { id: 'medium', label: 'Medium length label' },
      { id: 'another-long', label: 'Another very long label for testing overflow behavior' },
    ],
    selectedId: 'very-long-label',
  },
  parameters: {
    docs: {
      description: {
        story: 'Handles long labels with proper overflow and scrolling behavior.',
      },
    },
  },
};

export const SpecialCharacters: Story = {
  args: {
    items: [
      { id: 'emoji', label: '🚀 Emoji Item' },
      { id: 'unicode', label: 'Unicode: 你好世界' },
      { id: 'symbols', label: 'Symbols: @#$%^&*()' },
      { id: 'numbers', label: 'Numbers: 1234567890' },
    ],
    selectedId: 'emoji',
  },
  parameters: {
    docs: {
      description: {
        story: 'Handles special characters, emojis, and Unicode text properly.',
      },
    },
  },
};

// Interactive stories
export const Interactive: Story = {
  args: {
    items: basicItems,
  },
  render: (args) => {
    const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
    
    return (
      <div>
        <CategoryNav 
          {...args} 
          selectedId={selectedId} 
          onSelect={setSelectedId}
        />
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
          <strong>Selected:</strong> {selectedId || 'None'}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing selection state management.',
      },
    },
  },
};

// Performance stories
export const PerformanceTest: Story = {
  args: {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i + 1}`,
      label: `Item ${i + 1}`,
      icon: i % 3 === 0 ? <StarIcon /> : i % 3 === 1 ? <HeartIcon /> : <FireIcon />,
    })),
    selectedId: 'item-50',
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 items to demonstrate efficient rendering and scrolling.',
      },
    },
  },
};
