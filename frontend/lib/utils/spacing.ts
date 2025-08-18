/**
 * Spacing System
 * =============
 * 
 * Consistent spacing across all cards and components.
 * This ensures uniform appearance and proper visual hierarchy.
 */

export const spacing = {
  // Card padding
  card: {
    content: 'p-3 sm:p-4', // Consistent content padding
    compact: 'p-2 sm:p-3', // For smaller cards
    minimal: 'p-1 sm:p-2', // For very compact cards
  },
  
  // Section spacing
  section: {
    container: 'space-y-3 sm:space-y-4', // Between sections
    items: 'space-y-2 sm:space-y-3', // Between items in a section
  },
  
  // Grid spacing
  grid: {
    gap: 'gap-3 sm:gap-4', // Grid gaps
    gapCompact: 'gap-2 sm:gap-3', // Compact grid gaps
  },
  
  // Margins
  margin: {
    bottom: {
      small: 'mb-1 sm:mb-2',
      medium: 'mb-2 sm:mb-3',
      large: 'mb-3 sm:mb-4',
    },
    top: {
      small: 'mt-1 sm:mt-2',
      medium: 'mt-2 sm:mt-3',
      large: 'mt-3 sm:mt-4',
    },
  },
  
  // Padding
  padding: {
    small: 'p-2 sm:p-3',
    medium: 'p-3 sm:p-4',
    large: 'p-4 sm:p-6',
  },
  
  // Component specific
  components: {
    // Restaurant cards
    restaurantCard: {
      content: 'p-3 sm:p-4', // Consistent with other cards
      imageContainer: 'relative aspect-[3/4] bg-gray-100 overflow-hidden rounded-t-xl',
      badge: 'absolute top-2 left-2', // Consistent badge positioning
      favoriteButton: 'absolute top-2 right-2', // Consistent button positioning
    },
    
    // Specials cards
    specialsCard: {
      content: 'p-3 sm:p-4', // Consistent with restaurant cards
      imageContainer: 'relative h-28 sm:h-32 md:h-36 bg-gray-200',
      badge: 'absolute bottom-2 right-2', // Consistent badge positioning
    },
    
    // Specials section
    specialsSection: {
      container: 'space-y-3 sm:space-y-4',
      grid: 'grid grid-cols-3 gap-3 sm:gap-4',
      title: 'mb-3 sm:mb-4',
    },
  }
};

/**
 * Get consistent spacing classes
 */
export function getSpacingClasses(
  type: keyof typeof spacing, variant?: string): string {
  const spacingItem = spacing[type];
  
  if (typeof spacingItem === 'object' && variant && variant in spacingItem) {
    return spacingItem[variant as keyof typeof spacingItem];
  }
  
  if (typeof spacingItem === 'string') {
    return spacingItem;
  }
  
  return '';
}

/**
 * Common spacing combinations
 */
export const commonSpacing = {
  // Card content padding
  cardContent: getSpacingClasses('card', 'content'),
  cardContentCompact: getSpacingClasses('card', 'compact'),
  cardContentMinimal: getSpacingClasses('card', 'minimal'),
  
  // Section spacing
  sectionContainer: getSpacingClasses('section', 'container'),
  sectionItems: getSpacingClasses('section', 'items'),
  
  // Grid spacing
  gridGap: getSpacingClasses('grid', 'gap'),
  gridGapCompact: getSpacingClasses('grid', 'gapCompact'),
  
  // Margins
  marginBottomSmall: getSpacingClasses('margin', 'bottom.small'),
  marginBottomMedium: getSpacingClasses('margin', 'bottom.medium'),
  marginBottomLarge: getSpacingClasses('margin', 'bottom.large'),
  marginTopSmall: getSpacingClasses('margin', 'top.small'),
  marginTopMedium: getSpacingClasses('margin', 'top.medium'),
  marginTopLarge: getSpacingClasses('margin', 'top.large'),
  
  // Component specific
  restaurantCardContent: getSpacingClasses('components', 'restaurantCard.content'),
  specialsCardContent: getSpacingClasses('components', 'specialsCard.content'),
  specialsSectionContainer: getSpacingClasses('components', 'specialsSection.container'),
  specialsSectionGrid: getSpacingClasses('components', 'specialsSection.grid'),
}; 