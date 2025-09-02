/**
 * Analytics Hook for React Components
 * Provides easy access to analytics tracking functions
 */

import { useCallback, useEffect, useRef } from 'react';
import { analyticsService } from '@/lib/services/analytics-service';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function useAnalytics() {
  const { user } = useAuth();
  const router = useRouter();
  const lastPageRef = useRef<string>('');

  // Track page views automatically
  useEffect(() => {
    const currentPage = window.location.pathname;
    
    if (currentPage !== lastPageRef.current) {
      analyticsService.trackPageView(currentPage, {
        page: currentPage,
        title: document.title,
        referrer: lastPageRef.current || document.referrer,
      });
      lastPageRef.current = currentPage;
    }
  });

  // Set user properties when user changes
  useEffect(() => {
    if (user) {
      analyticsService.setUserProperties({
        userId: user.id,
        email: user.email,
        userType: 'authenticated',
        lastLoginDate: new Date().toISOString(),
      });
    }
  }, [user]);

  // Restaurant tracking functions
  const trackRestaurantView = useCallback((restaurantId: number, restaurantName: string, properties?: Record<string, unknown>) => {
    analyticsService.trackRestaurantView(restaurantId, restaurantName, properties);
  }, []);

  const trackRestaurantSearch = useCallback((query: string, resultsCount: number, filters?: Record<string, unknown>) => {
    analyticsService.trackRestaurantSearch(query, resultsCount, filters);
  }, []);

  const trackRestaurantFavorite = useCallback((restaurantId: number, action: 'add' | 'remove', restaurantName?: string) => {
    analyticsService.trackRestaurantFavorite(restaurantId, action, restaurantName);
  }, []);

  const trackRestaurantReview = useCallback((restaurantId: number, rating: number, reviewLength?: number) => {
    analyticsService.trackRestaurantReview(restaurantId, rating, reviewLength);
  }, []);

  // Marketplace tracking functions
  const trackMarketplaceListingView = useCallback((listingId: string, listingTitle: string, category?: string) => {
    analyticsService.trackMarketplaceListingView(listingId, listingTitle, category);
  }, []);

  const trackMarketplacePurchase = useCallback((listingId: string, value: number, currency: string = 'USD') => {
    analyticsService.trackMarketplacePurchase(listingId, value, currency);
  }, []);

  // User engagement tracking functions
  const trackUserEngagement = useCallback((engagementType: string, properties?: Record<string, unknown>) => {
    analyticsService.trackUserEngagement(engagementType, properties);
  }, []);

  const trackUserSignup = useCallback((method: string, source?: string) => {
    analyticsService.trackUserSignup(method, source);
  }, []);

  const trackUserLogin = useCallback((method: string, source?: string) => {
    analyticsService.trackUserLogin(method, source);
  }, []);

  // Performance tracking functions
  const trackPerformance = useCallback((metric: string, value: number, unit: string = 'milliseconds') => {
    analyticsService.trackPerformance(metric, value, unit);
  }, []);

  // Error tracking functions
  const trackError = useCallback((error: Error | string, context?: Record<string, unknown>) => {
    analyticsService.trackError(error, context);
  }, []);

  // Custom event tracking
  const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    analyticsService.trackEvent(eventName, properties);
  }, []);

  // Conversion tracking
  const trackConversion = useCallback((goal: string, value?: number, properties?: Record<string, unknown>) => {
    analyticsService.trackConversion({
      goal,
      value,
      currency: 'USD',
      ...properties,
    });
  }, []);

  // Ecommerce tracking
  const trackPurchase = useCallback((transactionId: string, value: number, items: Array<{id: string, name: string, price: number, quantity: number}>, currency: string = 'USD') => {
    analyticsService.trackEcommerceTransaction({
      transactionId,
      value,
      currency,
      items: items.map(item => ({
        ...item,
        category: 'general',
      })),
    });
  }, []);

  // Navigation tracking
  const trackNavigation = useCallback((from: string, to: string, method: 'click' | 'programmatic' | 'browser') => {
    analyticsService.trackEvent('navigation', {
      from_page: from,
      to_page: to,
      navigation_method: method,
      category: 'navigation',
    });
  }, []);

  // Form tracking
  const trackFormStart = useCallback((formName: string, formType: string) => {
    analyticsService.trackEvent('form_start', {
      form_name: formName,
      form_type: formType,
      category: 'form',
    });
  }, []);

  const trackFormComplete = useCallback((formName: string, formType: string, completionTime?: number) => {
    analyticsService.trackEvent('form_complete', {
      form_name: formName,
      form_type: formType,
      completion_time: completionTime,
      category: 'form',
    });
  }, []);

  const trackFormError = useCallback((formName: string, formType: string, errorType: string, errorMessage?: string) => {
    analyticsService.trackEvent('form_error', {
      form_name: formName,
      form_type: formType,
      error_type: errorType,
      error_message: errorMessage,
      category: 'form',
    });
  }, []);

  // Search tracking
  const trackSearch = useCallback((query: string, resultsCount: number, searchType: string = 'general', filters?: Record<string, unknown>) => {
    analyticsService.trackEvent('search', {
      query,
      results_count: resultsCount,
      search_type: searchType,
      filters,
      category: 'search',
    });
  }, []);

  // Filter tracking
  const trackFilter = useCallback((filterType: string, filterValue: string, context?: string) => {
    analyticsService.trackEvent('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
      context,
      category: 'filter',
    });
  }, []);

  // Map interaction tracking
  const trackMapInteraction = useCallback((interactionType: string, properties?: Record<string, unknown>) => {
    analyticsService.trackEvent('map_interaction', {
      interaction_type: interactionType,
      ...properties,
      category: 'map',
    });
  }, []);

  // Share tracking
  const trackShare = useCallback((contentType: string, contentId: string, shareMethod: string, platform?: string) => {
    analyticsService.trackEvent('share', {
      content_type: contentType,
      content_id: contentId,
      share_method: shareMethod,
      platform,
      category: 'social',
    });
  }, []);

  // Phone call tracking
  const trackPhoneCall = useCallback((phoneNumber: string, context?: string, duration?: number) => {
    analyticsService.trackEvent('phone_call', {
      phone_number: phoneNumber.replace(/\D/g, ''), // Remove non-digits for privacy
      context,
      duration,
      category: 'contact',
    });
  }, []);

  // Website visit tracking
  const trackWebsiteVisit = useCallback((url: string, context?: string) => {
    analyticsService.trackEvent('website_visit', {
      url,
      context,
      category: 'contact',
    });
  }, []);

  // Directions tracking
  const trackDirections = useCallback((destination: string, destinationType: string, method: 'driving' | 'walking' | 'transit') => {
    analyticsService.trackEvent('get_directions', {
      destination,
      destination_type: destinationType,
      method,
      category: 'navigation',
    });
  }, []);

  return {
    // Core tracking
    trackEvent,
    trackPageView: analyticsService.trackPageView.bind(analyticsService),
    
    // Restaurant tracking
    trackRestaurantView,
    trackRestaurantSearch,
    trackRestaurantFavorite,
    trackRestaurantReview,
    
    // Marketplace tracking
    trackMarketplaceListingView,
    trackMarketplacePurchase,
    
    // User tracking
    trackUserEngagement,
    trackUserSignup,
    trackUserLogin,
    
    // Performance tracking
    trackPerformance,
    
    // Error tracking
    trackError,
    
    // Conversion tracking
    trackConversion,
    
    // Ecommerce tracking
    trackPurchase,
    
    // Navigation tracking
    trackNavigation,
    
    // Form tracking
    trackFormStart,
    trackFormComplete,
    trackFormError,
    
    // Search and filter tracking
    trackSearch,
    trackFilter,
    
    // Map tracking
    trackMapInteraction,
    
    // Social tracking
    trackShare,
    
    // Contact tracking
    trackPhoneCall,
    trackWebsiteVisit,
    trackDirections,
  };
}

// Export the hook
export default useAnalytics;
