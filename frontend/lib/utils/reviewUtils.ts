import { ReviewSnippet } from '@/components/reviews/ReviewSnippets';

/**
 * Parse review snippets from JSON string
 */
export function parseReviewSnippets(snippetsJson: string | null | undefined): ReviewSnippet[] {
  if (!snippetsJson || snippetsJson === 'None' || snippetsJson === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(snippetsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(snippet => ({
        author: snippet.author || 'Anonymous',
        rating: snippet.rating || 0,
        text: snippet.text || '',
        time: snippet.time || Date.now() / 1000
      }));
    }
    return [];
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse review snippets:', error);
    }
    return [];
  }
}

/**
 * Get average rating from review snippets
 */
export function getAverageRating(snippets: ReviewSnippet[]): number {
  if (snippets.length === 0) {
    return 0;
  }
  
  const totalRating = snippets.reduce((sum, snippet) => sum + snippet.rating, 0);
  return Math.round((totalRating / snippets.length) * 10) / 10; // Round to 1 decimal place
}

/**
 * Get review count from snippets
 */
export function getReviewCount(snippets: ReviewSnippet[]): number {
  return snippets.length;
}

/**
 * Format review count for display
 */
export function formatReviewCount(count: number): string {
  if (count === 0) {
    return 'No reviews';
  }
  if (count === 1) {
    return '1 review';
  }
  return `${count} reviews`;
}

/**
 * Get business type display name
 */
export function getBusinessTypeDisplayName(businessType: string | null | undefined): string {
  if (!businessType || businessType === 'None' || businessType === '') {
    return 'Restaurant';
  }

  // Capitalize and format business type
  return businessType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get business type icon
 */
export function getBusinessTypeIcon(businessType: string | null | undefined): string {
  if (!businessType || businessType === 'None' || businessType === '') {
    return '🍽️';
  }

  const iconMap: Record<string, string> = {
    restaurant: '🍽️',
    bakery: '🥐',
    cafe: '☕',
    pizzeria: '🍕',
    sushi: '🍣',
    steakhouse: '🥩',
    deli: '🥪',
    ice_cream: '🍦',
    bbq: '🍖',
    mediterranean: '🥙',
    asian: '🥢',
    italian: '🍝',
    mexican: '🌮',
    american: '🍔'
  };

  return iconMap[businessType.toLowerCase()] || '🍽️';
}

/**
 * Get business type color
 */
export function getBusinessTypeColor(businessType: string | null | undefined): string {
  if (!businessType || businessType === 'None' || businessType === '') {
    return 'bg-gray-100 text-gray-800';
  }

  const colorMap: Record<string, string> = {
    restaurant: 'bg-blue-100 text-blue-800',
    bakery: 'bg-yellow-100 text-yellow-800',
    cafe: 'bg-brown-100 text-brown-800',
    pizzeria: 'bg-red-100 text-red-800',
    sushi: 'bg-green-100 text-green-800',
    steakhouse: 'bg-purple-100 text-purple-800',
    deli: 'bg-orange-100 text-orange-800',
    ice_cream: 'bg-pink-100 text-pink-800',
    bbq: 'bg-red-100 text-red-800',
    mediterranean: 'bg-blue-100 text-blue-800',
    asian: 'bg-green-100 text-green-800',
    italian: 'bg-green-100 text-green-800',
    mexican: 'bg-orange-100 text-orange-800',
    american: 'bg-red-100 text-red-800'
  };

  return colorMap[businessType.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
