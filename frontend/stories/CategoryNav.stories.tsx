import type { Meta, StoryObj } from '@storybook/react';
import { CategoryNav } from '@/components/ui/CategoryNav';
import { useState } from 'react';

const meta: Meta<typeof CategoryNav> = {
  title: 'Components/UI/CategoryNav',
  component: CategoryNav,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A horizontal navigation component with keyboard support, overflow controls, and accessibility features.',
      },
    },
  },
  argTypes: {
    items: {
      description: 'Array of navigation items',
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
    value: {
      description: 'Controlled value (alias for selectedId)',
      control: { type: 'text' },
    },
    onValueChange: {
      description: 'Controlled value change handler (alias for onSelect)',
      action: 'valueChanged',
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

// Base items for stories
const baseItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
];

const manyItems = [
  { id: 'item1', label: 'Item 1' },
  { id: 'item2', label: 'Item 2' },
  { id: 'item3', label: 'Item 3' },
  { id: 'item4', label: 'Item 4' },
  { id: 'item5', label: 'Item 5' },
  { id: 'item6', label: 'Item 6' },
  { id: 'item7', label: 'Item 7' },
  { id: 'item8', label: 'Item 8' },
  { id: 'item9', label: 'Item 9' },
  { id: 'item10', label: 'Item 10' },
];

const itemsWithIcons = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'contact', label: 'Contact', icon: '📧' },
];

const itemsWithLinks = [
  { id: 'internal', label: 'Internal Link', href: '/internal' },
  { id: 'external', label: 'External Link', href: 'https://example.com' },
  { id: 'button', label: 'Button Item' },
];

const itemsWithDisabled = [
  { id: 'enabled1', label: 'Enabled 1' },
  { id: 'disabled', label: 'Disabled', disabled: true },
  { id: 'enabled2', label: 'Enabled 2' },
];

const allDisabledItems = [
  { id: 'disabled1', label: 'Disabled 1', disabled: true },
  { id: 'disabled2', label: 'Disabled 2', disabled: true },
  { id: 'disabled3', label: 'Disabled 3', disabled: true },
];

// Interactive wrapper for controlled stories
const InteractiveWrapper = ({ items, initialSelectedId }: { items: any[], initialSelectedId?: string }) => {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  
  return (
    <CategoryNav
      items={items}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
};

export const Default: Story = {
  args: {
    items: baseItems,
  },
};

export const WithSelectedItem: Story = {
  args: {
    items: baseItems,
    selectedId: 'about',
  },
};

export const WithIcons: Story = {
  args: {
    items: itemsWithIcons,
    selectedId: 'services',
  },
};

export const WithLinks: Story = {
  args: {
    items: itemsWithLinks,
    selectedId: 'internal',
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled,
    selectedId: 'enabled1',
  },
};

export const AllDisabled: Story = {
  args: {
    items: allDisabledItems,
  },
};

export const OverflowControls: Story = {
  args: {
    items: manyItems,
    selectedId: 'item1',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const Controlled: Story = {
  render: (args) => <InteractiveWrapper items={args.items} initialSelectedId="about" />,
  args: {
    items: baseItems,
  },
};

export const WithAriaLabel: Story = {
  args: {
    items: baseItems,
    selectedId: 'home',
    'aria-label': 'Main navigation menu',
  },
};

export const WithAriaLabelledBy: Story = {
  render: (args) => (
    <div>
      <h2 id="nav-heading">Main Navigation</h2>
      <CategoryNav {...args} aria-labelledby="nav-heading" />
    </div>
  ),
  args: {
    items: baseItems,
    selectedId: 'home',
  },
};

export const InFormContext: Story = {
  render: (args) => (
    <form onSubmit={(e) => e.preventDefault()}>
      <input type="text" placeholder="Name" />
      <CategoryNav {...args} />
      <button type="submit">Submit</button>
    </form>
  ),
  args: {
    items: baseItems,
    selectedId: 'about',
  },
};

export const RTLSupport: Story = {
  render: (args) => (
    <div dir="rtl">
      <CategoryNav {...args} />
    </div>
  ),
  args: {
    items: baseItems,
    selectedId: 'home',
  },
};

export const ReducedMotion: Story = {
  parameters: {
    prefersReducedMotion: 'reduce',
  },
  args: {
    items: baseItems,
    selectedId: 'home',
  },
};

export const HighContrast: Story = {
  parameters: {
    forcedColors: 'active',
  },
  args: {
    items: baseItems,
    selectedId: 'home',
  },
};

export const DarkMode: Story = {
  parameters: {
    colorMode: 'dark',
  },
  args: {
    items: baseItems,
    selectedId: 'home',
  },
};

// Accessibility stories
export const KeyboardNavigation: Story = {
  args: {
    items: baseItems,
    selectedId: 'home',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use Tab to navigate between items, Arrow keys to move focus, Enter/Space to select. Test Home/End keys for first/last item navigation.',
      },
    },
  },
};

export const ScreenReader: Story = {
  args: {
    items: baseItems,
    selectedId: 'home',
    'aria-label': 'Category navigation with screen reader support',
  },
  parameters: {
    docs: {
      description: {
        story: 'Test with screen reader to verify proper announcement of selected state, navigation controls, and item descriptions.',
      },
    },
  },
};

// Performance stories
export const ManyItems: Story = {
  args: {
    items: manyItems,
    selectedId: 'item1',
  },
  parameters: {
    docs: {
      description: {
        story: 'Test performance with many items and overflow controls.',
      },
    },
  },
};

// Edge cases
export const EmptyItems: Story = {
  args: {
    items: [],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ id: 'single', label: 'Single Item' }],
    selectedId: 'single',
  },
};

export const LongLabels: Story = {
  args: {
    items: [
      { id: 'long1', label: 'This is a very long label that might cause overflow issues' },
      { id: 'long2', label: 'Another extremely long label for testing purposes' },
      { id: 'long3', label: 'Yet another long label to test the component behavior' },
    ],
    selectedId: 'long1',
  },
};

// Integration stories
export const WithExternalLinks: Story = {
  args: {
    items: [
      { id: 'internal', label: 'Internal', href: '/internal' },
      { id: 'external', label: 'External', href: 'https://example.com', target: '_blank' },
      { id: 'custom', label: 'Custom Target', href: '/custom', target: '_self' },
    ],
    selectedId: 'internal',
  },
};

export const MixedContent: Story = {
  args: {
    items: [
      { id: 'link1', label: 'Link Item', href: '/link1' },
      { id: 'button1', label: 'Button Item' },
      { id: 'link2', label: 'Another Link', href: '/link2' },
      { id: 'disabled', label: 'Disabled Item', disabled: true },
      { id: 'button2', label: 'Another Button' },
    ],
    selectedId: 'button1',
  },
};
