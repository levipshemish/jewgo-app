'use client';

import { useState, useCallback, useEffect } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

interface AnalyticsProps {
  userId?: string;
  sessionId?: string;
  pageName?: string;
}

export default function Analytics({ userId, sessionId, pageName }: AnalyticsProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeAnalytics = useCallback(() => {
    // Initialize Google Analytics if available and properly configured
    const gaMeasurementId = process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'];
    if (typeof window !== 'undefined' && window.gtag && gaMeasurementId && gaMeasurementId !== 'G-XXXXXXXXXX') {
      window.gtag('config', gaMeasurementId, {
        page_title: pageName || document.title,
        page_location: window.location.href,
        user_id: userId,
        session_id: sessionId,
      });
    }
  }, [pageName, userId, sessionId]);

  const sendToAnalyticsEndpoint = useCallback(async (event: AnalyticsEvent) => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        // console.warn('Analytics endpoint returned error:', response.status);
      }
        } catch {
      // console.warn('Failed to send analytics event');
    }
  }, []);

  // Initialize analytics
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      initializeAnalytics();
      setIsInitialized(true);
    }
  }, [isInitialized, initializeAnalytics]);

  const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        user_id: userId,
        session_id: sessionId,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      },
      timestamp: Date.now(),
    };

    // Send to Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        ...properties,
        user_id: userId,
        session_id: sessionId,
      });
    }

    // Send to custom analytics endpoint
    sendToAnalyticsEndpoint(event);

    if (process.env.NODE_ENV === 'development') {
              // console.log('Analytics event:', eventName, properties);
    }
  }, [userId, sessionId, sendToAnalyticsEndpoint]);

  // Expose tracking function globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).trackAnalyticsEvent = trackEvent;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).trackAnalyticsEvent;
      }
    };
  }, [userId, sessionId, trackEvent]);

  // Track specific user interactions
  const trackRestaurantView = useCallback((restaurantId: number, restaurantName: string) => {
    trackEvent('restaurant_view', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackEvent('search', {
      query,
      results_count: resultsCount,
      search_type: 'text',
    });
  }, [trackEvent]);

  const trackFilter = useCallback((filterType: string, filterValue: string) => {
    trackEvent('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  }, [trackEvent]);

  const trackMapInteraction = useCallback((interactionType: string, properties?: Record<string, unknown>) => {
    trackEvent('map_interaction', {
      interaction_type: interactionType,
      ...properties,
    });
  }, [trackEvent]);

  const trackAddToFavorites = useCallback((restaurantId: number, restaurantName: string) => {
    trackEvent('add_to_favorites', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [trackEvent]);

  const trackShare = useCallback((restaurantId: number, shareMethod: string) => {
    trackEvent('share_restaurant', {
      restaurant_id: restaurantId,
      share_method: shareMethod,
    });
  }, [trackEvent]);

  const trackPhoneCall = useCallback((restaurantId: number, restaurantName: string) => {
    trackEvent('phone_call', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [trackEvent]);

  const trackWebsiteVisit = useCallback((restaurantId: number, restaurantName: string) => {
    trackEvent('website_visit', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [trackEvent]);

  const trackDirections = useCallback((restaurantId: number, restaurantName: string) => {
    trackEvent('get_directions', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    });
  }, [trackEvent]);

  // Performance tracking
  const trackPerformance = useCallback((metric: string, value: number) => {
    trackEvent('performance_metric', {
      metric,
      value,
      unit: 'milliseconds',
    });
  }, [trackEvent]);

  // Error tracking
  const trackError = useCallback((error: Error, context?: Record<string, unknown>) => {
    trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context,
    });
  }, [trackEvent]);

  // User engagement tracking
  const trackUserEngagement = useCallback((engagementType: string, properties?: Record<string, unknown>) => {
    trackEvent('user_engagement', {
      engagement_type: engagementType,
      ...properties,
    });
  }, [trackEvent]);

  // Expose tracking functions globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.analytics = {
        trackRestaurantView,
        trackSearch,
        trackFilter,
        trackMapInteraction,
        trackAddToFavorites,
        trackShare,
        trackPhoneCall,
        trackWebsiteVisit,
        trackDirections,
        trackPerformance,
        trackError,
        trackUserEngagement,
      };
    }
  }, [
    trackRestaurantView,
    trackSearch,
    trackFilter,
    trackMapInteraction,
    trackAddToFavorites,
    trackShare,
    trackPhoneCall,
    trackWebsiteVisit,
    trackDirections,
    trackPerformance,
    trackError,
    trackUserEngagement,
  ]);

  // Track page performance metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            trackPerformance('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart);
            trackPerformance('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            trackPerformance('first_paint', navEntry.responseStart - navEntry.fetchStart);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });

      return () => observer.disconnect();
    }
    return undefined;
  }, [trackPerformance]);

  // Track Core Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      import('web-vitals').then((webVitals) => {
        webVitals.onCLS((metric) => trackPerformance('CLS', metric.value));
        webVitals.onINP((metric) => trackPerformance('INP', metric.value));
        webVitals.onFCP((metric) => trackPerformance('FCP', metric.value));
        webVitals.onLCP((metric) => trackPerformance('LCP', metric.value));
        webVitals.onTTFB((metric) => trackPerformance('TTFB', metric.value));
      }).catch(() => {
        });
    }
    return undefined;
  }, [trackPerformance]);

  // Error boundary tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error, {
        error_type: 'javascript_error',
        error_filename: event.filename,
        error_lineno: event.lineno,
        error_colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), {
        error_type: 'unhandled_promise_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  // Return null since this is a utility component
  return null;
}

// Global type declarations
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    trackAnalyticsEvent?: (eventName: string, properties?: Record<string, unknown>) => void;
    analytics?: {
      trackRestaurantView: (restaurantId: number, restaurantName: string) => void;
      trackSearch: (query: string, resultsCount: number) => void;
      trackFilter: (filterType: string, filterValue: string) => void;
      trackMapInteraction: (interactionType: string, properties?: Record<string, unknown>) => void;
      trackAddToFavorites: (restaurantId: number, restaurantName: string) => void;
      trackShare: (restaurantId: number, shareMethod: string) => void;
      trackPhoneCall: (restaurantId: number, restaurantName: string) => void;
      trackWebsiteVisit: (restaurantId: number, restaurantName: string) => void;
      trackDirections: (restaurantId: number, restaurantName: string) => void;
      trackPerformance: (metric: string, value: number) => void;
      trackError: (error: Error, context?: Record<string, unknown>) => void;
      trackUserEngagement: (engagementType: string, properties?: Record<string, unknown>) => void;
    };
  }
} 