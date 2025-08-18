# Navigation Components

This directory contains unified navigation components that consolidate the various navigation patterns used throughout the application.

## Components

### `/ui/` Directory

- **BottomNavigation.tsx** - Unified bottom navigation with multiple variants
- **CategoryTabs.tsx** - Unified category tabs for navigation and filtering
- **SubNav.tsx** - Unified sub-navigation buttons
- **index.ts** - Clean exports for easy importing

## Features

### BottomNavigation Variants
- **Main Variant**: Used in most pages (HomePageClient, SpecialsPageClient, etc.)
- **Layout Variant**: Used in eatery and favorites pages
- **Eatery Variant**: Mobile-specific bottom tab bar

### CategoryTabs Variants
- **Navigation Variant**: Routes to different pages (LiveMapClient, eatery, favorites)
- **Filter Variant**: Filters content within a page (eatery page)

### SubNav Variants
- **ActionButtons**: Complex filtering system
- **Simple Buttons**: Basic action buttons
- **Eatery Actions**: Eatery-specific actions

## Usage

### Importing Components

```tsx
import { 
  BottomNavigation, 
  CategoryTabs, 
  SubNav 
} from '@/components/navigation/ui';
```

### BottomNavigation Usage

```tsx
// Main variant (default)
<BottomNavigation />

// Layout variant
<BottomNavigation variant="layout" />

// Eatery variant
<BottomNavigation variant="eatery" />
```

### CategoryTabs Usage

```tsx
// Navigation variant
<CategoryTabs variant="navigation" activeTab={activeTab} onTabChange={handleTabChange} />

// Filter variant
<CategoryTabs variant="filter" activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
```

## Styling

All components preserve their original production styling while providing unified interfaces for better maintainability. 