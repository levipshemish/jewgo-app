/**
 * Typography System
 * ================
 * 
 * Consistent text sizing across all pages and components.
 * This ensures uniform appearance across different device sizes.
 */

// Type definitions for better TypeScript support
type ResponsiveTypography = {
  mobile: string;
  tablet: string;
  desktop: string;
  default: string;
};

type TypographyVariant = {
  [key: string]: ResponsiveTypography;
};

type TypographyType = ResponsiveTypography | TypographyVariant | string;

export const typography: Record<string, TypographyType> = {
  // Headings
  h1: {
    mobile: 'text-xl font-bold',
    tablet: 'sm:text-2xl font-bold',
    desktop: 'lg:text-3xl font-bold',
    default: 'text-2xl font-bold text-gray-900'
  },
  
  h2: {
    mobile: 'text-lg font-bold',
    tablet: 'sm:text-xl font-bold',
    desktop: 'lg:text-2xl font-bold',
    default: 'text-xl font-bold text-gray-900'
  },
  
  h3: {
    mobile: 'text-base font-semibold',
    tablet: 'sm:text-lg font-semibold',
    desktop: 'lg:text-xl font-semibold',
    default: 'text-lg font-semibold text-gray-900'
  },
  
  h4: {
    mobile: 'text-sm font-semibold',
    tablet: 'sm:text-base font-semibold',
    desktop: 'lg:text-lg font-semibold',
    default: 'text-base font-semibold text-gray-900'
  },

  // Body text
  body: {
    large: {
      mobile: 'text-base',
      tablet: 'sm:text-lg',
      desktop: 'lg:text-xl',
      default: 'text-lg text-gray-700'
    },
    
    medium: {
      mobile: 'text-sm',
      tablet: 'sm:text-base',
      desktop: 'lg:text-lg',
      default: 'text-base text-gray-700'
    },
    
    small: {
      mobile: 'text-xs',
      tablet: 'sm:text-sm',
      desktop: 'lg:text-base',
      default: 'text-sm text-gray-600'
    },
    
    xsmall: {
      mobile: 'text-xs',
      tablet: 'sm:text-xs',
      desktop: 'lg:text-sm',
      default: 'text-xs text-gray-500'
    }
  },

  // Specialized text
  caption: {
    mobile: 'text-xs',
    tablet: 'sm:text-xs',
    desktop: 'lg:text-sm',
    default: 'text-xs text-gray-500'
  },
  
  label: {
    mobile: 'text-xs font-medium',
    tablet: 'sm:text-sm font-medium',
    desktop: 'lg:text-base font-medium',
    default: 'text-sm font-medium text-gray-700'
  },
  
  button: {
    mobile: 'text-sm font-medium',
    tablet: 'sm:text-base font-medium',
    desktop: 'lg:text-lg font-medium',
    default: 'text-base font-medium'
  },

  // Restaurant specific
  restaurantName: {
    card: {
      mobile: 'text-xs font-semibold h-5 leading-5 overflow-hidden whitespace-nowrap',
      tablet: 'sm:text-sm font-semibold h-5 leading-5 overflow-hidden whitespace-nowrap',
      desktop: 'lg:text-base font-semibold h-5 leading-5 overflow-hidden whitespace-nowrap',
      default: 'text-sm font-semibold text-gray-900 h-5 leading-5 overflow-hidden whitespace-nowrap'
    },
    
    detail: {
      mobile: 'text-xl font-bold break-words leading-tight mb-0 text-gray-800',
      tablet: 'sm:text-2xl font-bold break-words leading-tight mb-0 text-gray-800',
      desktop: 'lg:text-3xl font-bold break-words leading-tight mb-0 text-gray-800',
      default: 'text-2xl font-bold text-gray-800 break-words leading-tight mb-0'
    }
  },

  // Specials and menu items
  specialsTitle: {
    mobile: 'text-sm font-bold',
    tablet: 'sm:text-base font-bold',
    desktop: 'lg:text-lg font-bold',
    default: 'text-base font-bold text-gray-900'
  },
  
  specialsItem: {
    mobile: 'text-xs font-semibold break-words',
    tablet: 'sm:text-xs font-semibold break-words',
    desktop: 'sm:text-sm font-semibold break-words',
    default: 'text-xs font-semibold text-gray-900 break-words'
  },
  
  specialsDescription: {
    mobile: 'text-xs break-words',
    tablet: 'sm:text-xs break-words',
    desktop: 'sm:text-xs break-words',
    default: 'text-xs text-gray-600 break-words'
  },

  // Badges and tags
  badge: {
    mobile: 'text-xs font-semibold',
    tablet: 'sm:text-xs font-semibold',
    desktop: 'lg:text-sm font-semibold',
    default: 'text-xs font-semibold'
  },

  // Ratings and reviews
  rating: {
    mobile: 'text-xs font-medium',
    tablet: 'sm:text-sm font-medium',
    desktop: 'lg:text-base font-medium',
    default: 'text-sm font-medium text-gray-800'
  },
  
  reviewCount: {
    mobile: 'text-xs',
    tablet: 'sm:text-xs',
    desktop: 'lg:text-sm',
    default: 'text-xs text-gray-500'
  }
};

/**
 * Get responsive typography classes
 */
export function getTypographyClasses(
  type: string, variant?: string, responsive: boolean = true): string {
  const typographyItem = typography[type];
  
  if (!typographyItem) {
    return '';
  }
  
  // Handle string types
  if (typeof typographyItem === 'string') {
    return typographyItem;
  }
  
  // Handle variant types (like body.large, restaurantName.card)
  if (variant && typeof typographyItem === 'object' && variant in typographyItem) {
    const variantItem = (typographyItem as TypographyVariant)[variant];
    
    if (!variantItem) {
      return '';
    }
    
    if (responsive) {
      return `${variantItem.mobile} ${variantItem.tablet} ${variantItem.desktop}`;
    } else {
      return variantItem.default;
    }
  }
  
  // Handle direct responsive types
  if (typeof typographyItem === 'object' && 'mobile' in typographyItem) {
    const responsiveItem = typographyItem as ResponsiveTypography;
    
    if (responsive) {
      return `${responsiveItem.mobile} ${responsiveItem.tablet} ${responsiveItem.desktop}`;
    } else {
      return responsiveItem.default;
    }
  }
  
  return '';
}

/**
 * Common typography combinations
 */
export const commonTypography = {
  // Restaurant card title
  cardTitle: getTypographyClasses('restaurantName', 'card'),
  
  // Restaurant detail page title
  detailTitle: getTypographyClasses('restaurantName', 'detail'),
  
  // Section headings
  sectionHeading: getTypographyClasses('h3'),
  
  // Body text
  bodyText: getTypographyClasses('body', 'medium'),
  
  // Small text
  smallText: getTypographyClasses('body', 'small'),
  
  // Caption text
  captionText: getTypographyClasses('caption'),
  
  // Button text
  buttonText: getTypographyClasses('button'),
  
  // Specials title
  specialsTitle: getTypographyClasses('specialsTitle'),
  
  // Specials item
  specialsItem: getTypographyClasses('specialsItem'),
  
  // Specials description
  specialsDescription: getTypographyClasses('specialsDescription'),
  
  // Rating
  rating: getTypographyClasses('rating'),
  
  // Badge
  badge: getTypographyClasses('badge')
}; 