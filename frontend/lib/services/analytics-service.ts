/**
 * Enhanced Analytics Service
 * Provides comprehensive analytics tracking with Google Analytics integration
 */

import { getAnalyticsConfig, isGoogleAnalyticsConfigured, isAnalyticsEnabled } from '@/lib/utils/analytics-config';
import {
  IS_ANALYTICS_MAX_EVENTS,
  IS_ANALYTICS_MAX_ERRORS,
  IS_MAX_RETRY_EPISODES_PER_SESSION,
} from '@/lib/config/infiniteScroll.constants';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  page?: string;
  referrer?: string;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  userType?: string;
  signupDate?: string;
  lastLoginDate?: string;
  preferences?: Record<string, unknown>;
}

export interface PageViewProperties {
  page: string;
  title?: string;
  referrer?: string;
  searchQuery?: string;
  category?: string;
  tags?: string[];
}

export interface EcommerceProperties {
  transactionId: string;
  value: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
}

export interface ConversionProperties {
  goal: string;
  value?: number;
  currency?: string;
  category?: string;
  source?: string;
  medium?: string;
  campaign?: string;
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private isInitialized = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private config = getAnalyticsConfig();
  private viewedPages = new Set<string>(); // Track viewed pages per session
  private sessionId: string;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    this.initialize();
  }

  /**
   * Get or create a session ID for deduplication
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    const STORAGE_KEY = 'jewgo_analytics_session';
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { sessionId, timestamp } = JSON.parse(stored);
        
        // Check if session is still valid
        if (Date.now() - timestamp < SESSION_DURATION) {
          return sessionId;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    
    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionId: newSessionId,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore storage errors
    }
    
    return newSessionId;
  }

  /**
   * Initialize the analytics service
   */
  private initialize() {
    if (typeof window === 'undefined' || !isAnalyticsEnabled()) {
      return;
    }

    // Set up periodic flushing
    this.setupFlushTimer();
    
    // Track initial page view (will be deduplicated)
    this.trackPageView(window.location.pathname);
    
    this.isInitialized = true;
  }

  /**
   * Set up periodic flushing of analytics events
   */
  private setupFlushTimer() {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.isInitialized) return;

    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        page: window.location.pathname,
        referrer: document.referrer,
      },
      timestamp: Date.now(),
      page: window.location.pathname,
      referrer: document.referrer,
    };

    this.queue.push(event);
    this.sendToGoogleAnalytics(eventName, properties);
    
    // Flush if queue is full
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track page view with session-based deduplication
   */
  trackPageView(page: string, properties?: PageViewProperties): void {
    if (!this.isInitialized) return;

    // Create unique key for this page view (page + session)
    const pageKey = `${page}:${this.sessionId}`;
    
    // Check if we've already tracked this page in this session
    if (this.viewedPages.has(pageKey)) {
      console.debug(`[Analytics] Page view already tracked for ${page} in session ${this.sessionId}`);
      return;
    }
    
    // Mark this page as viewed in this session
    this.viewedPages.add(pageKey);
    
    console.debug(`[Analytics] Tracking new page view: ${page} (session: ${this.sessionId})`);

    const pageViewEvent: AnalyticsEvent = {
      event: 'page_view',
      properties: {
        page,
        title: document.title,
        referrer: document.referrer,
        searchQuery: this.getSearchQuery(),
        session_id: this.sessionId,
        is_duplicate: false,
        ...properties,
      },
      timestamp: Date.now(),
      page,
      referrer: document.referrer,
    };

    this.queue.push(pageViewEvent);
    this.sendPageViewToGA(page, properties);
  }

  /**
   * Track user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.isInitialized || !isGoogleAnalyticsConfigured()) return;

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', this.config.gaMeasurementId, {
        user_id: properties.userId,
        custom_map: {
          'user_type': 'user_type',
          'signup_date': 'signup_date',
          'last_login_date': 'last_login_date',
        },
        user_type: properties.userType,
        signup_date: properties.signupDate,
        last_login_date: properties.lastLoginDate,
      });
    }
  }

  /**
   * Track ecommerce transaction
   */
  trackEcommerceTransaction(properties: EcommerceProperties): void {
    if (!this.isInitialized) return;

    const ecommerceEvent: AnalyticsEvent = {
      event: 'purchase',
      properties: {
        transaction_id: properties.transactionId,
        value: properties.value,
        currency: properties.currency,
        items: properties.items,
      },
      timestamp: Date.now(),
    };

    this.queue.push(ecommerceEvent);
    this.sendEcommerceToGA(properties);
  }

  /**
   * Track conversion goal
   */
  trackConversion(properties: ConversionProperties): void {
    if (!this.isInitialized) return;

    const conversionEvent: AnalyticsEvent = {
      event: 'conversion',
      properties: {
        goal: properties.goal,
        value: properties.value,
        currency: properties.currency,
        category: properties.category,
        source: properties.source,
        medium: properties.medium,
        campaign: properties.campaign,
      },
      timestamp: Date.now(),
    };

    this.queue.push(conversionEvent);
    this.sendConversionToGA(properties);
  }

  /**
   * Track restaurant-specific events
   */
  trackRestaurantView(restaurantId: number, restaurantName: string, properties?: Record<string, unknown>): void {
    this.trackEvent('restaurant_view', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      category: 'restaurant',
      ...properties,
    });
  }

  trackRestaurantSearch(query: string, resultsCount: number, filters?: Record<string, unknown>): void {
    this.trackEvent('restaurant_search', {
      query,
      results_count: resultsCount,
      filters,
      category: 'search',
    });
  }

  trackRestaurantFavorite(restaurantId: number, action: 'add' | 'remove', restaurantName?: string): void {
    this.trackEvent('restaurant_favorite', {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      action,
      category: 'engagement',
    });
  }

  trackRestaurantReview(restaurantId: number, rating: number, reviewLength?: number): void {
    this.trackEvent('restaurant_review', {
      restaurant_id: restaurantId,
      rating,
      review_length: reviewLength,
      category: 'engagement',
    });
  }

  /**
   * Track marketplace events
   */
  trackMarketplaceListingView(listingId: string, listingTitle: string, category?: string): void {
    this.trackEvent('marketplace_listing_view', {
      listing_id: listingId,
      listing_title: listingTitle,
      category,
      category_type: 'marketplace',
    });
  }

  trackMarketplacePurchase(listingId: string, value: number, currency: string = 'USD'): void {
    this.trackEcommerceTransaction({
      transactionId: `mp_${listingId}_${Date.now()}`,
      value,
      currency,
      items: [{
        id: listingId,
        name: `Marketplace Listing ${listingId}`,
        category: 'marketplace',
        price: value,
        quantity: 1,
      }],
    });
  }

  /**
   * Track user engagement
   */
  trackUserEngagement(engagementType: string, properties?: Record<string, unknown>): void {
    this.trackEvent('user_engagement', {
      engagement_type: engagementType,
      ...properties,
    });
  }

  trackUserSignup(method: string, source?: string): void {
    this.trackEvent('sign_up', {
      method,
      source,
      category: 'user_management',
    });
  }

  trackUserLogin(method: string, source?: string): void {
    this.trackEvent('login', {
      method,
      source,
      category: 'user_management',
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'milliseconds'): void {
    this.trackEvent('performance_metric', {
      metric,
      value,
      unit,
      category: 'performance',
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error | string, context?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.trackEvent('error', {
      error_message: errorMessage,
      error_stack: errorStack,
      context,
      category: 'error',
    });
  }

  /**
   * Send event to Google Analytics
   */
  private sendToGoogleAnalytics(eventName: string, properties?: Record<string, unknown>): void {
    if (!isGoogleAnalyticsConfigured() || typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...properties,
        event_category: properties?.category || 'general',
        event_label: properties?.label || undefined,
        value: properties?.value || undefined,
      });
    }
  }

  /**
   * Send page view to Google Analytics
   */
  private sendPageViewToGA(page: string, properties?: PageViewProperties): void {
    if (!isGoogleAnalyticsConfigured() || typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('config', this.config.gaMeasurementId, {
        page_title: properties?.title || document.title,
        page_location: `${window.location.origin}${page}`,
        page_referrer: properties?.referrer || document.referrer,
      });
    }
  }

  /**
   * Send ecommerce data to Google Analytics
   */
  private sendEcommerceToGA(properties: EcommerceProperties): void {
    if (!isGoogleAnalyticsConfigured() || !this.config.gaEnhancedEcommerce || typeof window === 'undefined') return;

    if ((window as any).gtag) {
      // Enhanced ecommerce purchase event
      (window as any).gtag('event', 'purchase', {
        transaction_id: properties.transactionId,
        value: properties.value,
        currency: properties.currency,
        items: properties.items,
      });
    }
  }

  /**
   * Send conversion to Google Analytics
   */
  private sendConversionToGA(properties: ConversionProperties): void {
    if (!isGoogleAnalyticsConfigured() || typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        send_to: `${this.config.gaMeasurementId}/${properties.goal}`,
        value: properties.value,
        currency: properties.currency,
        transaction_id: `conv_${Date.now()}`,
      });
    }
  }

  /**
   * Get search query from URL
   */
  private getSearchQuery(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || urlParams.get('search') || undefined;
  }

  /**
   * Calculate the approximate size of a payload in bytes
   */
  private calculatePayloadSize(events: AnalyticsEvent[]): number {
    const payload = {
      events,
      batch_size: events.length,
      timestamp: Date.now(),
    };
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  }

  /**
   * Split events into smaller batches if they exceed size limits
   */
  private splitEventsBatch(events: AnalyticsEvent[], maxSizeBytes: number = 800000): AnalyticsEvent[][] {
    const batches: AnalyticsEvent[][] = [];
    let currentBatch: AnalyticsEvent[] = [];
    
    for (const event of events) {
      const testBatch = [...currentBatch, event];
      const testSize = this.calculatePayloadSize(testBatch);
      
      if (testSize > maxSizeBytes && currentBatch.length > 0) {
        // Current batch would exceed limit, start a new batch
        batches.push(currentBatch);
        currentBatch = [event];
      } else {
        currentBatch.push(event);
      }
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches.length > 0 ? batches : [[]];
  }

  /**
   * Send a batch of events to the analytics API
   */
  private async sendBatch(events: AnalyticsEvent[]): Promise<boolean> {
    try {
      const payload = {
        events,
        batch_size: events.length,
        timestamp: Date.now(),
      };
      
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.warn(`[Analytics] Failed to send batch (${response.status}):`, responseText);
        
        // Handle REQUEST_TOO_LARGE error by splitting batch further
        if (response.status === 413 || responseText.includes('REQUEST_TOO_LARGE')) {
          console.warn('[Analytics] Request too large, attempting to split batch further');
          
          if (events.length === 1) {
            // Single event is too large, truncate its properties
            const truncatedEvent = this.truncateEventProperties(events[0]);
            return await this.sendBatch([truncatedEvent]);
          } else {
            // Split batch into smaller pieces
            const smallerBatches = this.splitEventsBatch(events, 400000); // Even smaller batches
            let allSucceeded = true;
            
            for (const smallBatch of smallerBatches) {
              const success = await this.sendBatch(smallBatch);
              if (!success) allSucceeded = false;
            }
            
            return allSucceeded;
          }
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('[Analytics] Error sending batch:', error);
      return false;
    }
  }

  /**
   * Truncate event properties to reduce payload size
   */
  private truncateEventProperties(event: AnalyticsEvent): AnalyticsEvent {
    const truncatedEvent: AnalyticsEvent = {
      ...event,
      properties: event.properties ? this.truncateProperties(event.properties) : undefined,
    };
    
    return truncatedEvent;
  }

  /**
   * Recursively truncate properties to reduce size
   */
  private truncateProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const truncated: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && value.length > 1000) {
        // Truncate long strings
        truncated[key] = value.substring(0, 1000) + '... [truncated]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively truncate nested objects, but limit depth
        truncated[key] = this.truncateProperties(value as Record<string, unknown>);
      } else {
        truncated[key] = value;
      }
    }
    
    return truncated;
  }

  /**
   * Flush queued events to the analytics API
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      // Check payload size and split if necessary
      const payloadSize = this.calculatePayloadSize(eventsToSend);
      console.debug(`[Analytics] Flushing ${eventsToSend.length} events (${Math.round(payloadSize / 1024)}KB)`);
      
      if (payloadSize > 800000) { // 800KB threshold (below 1MB limit)
        console.warn(`[Analytics] Large payload detected (${Math.round(payloadSize / 1024)}KB), splitting into batches`);
        const batches = this.splitEventsBatch(eventsToSend);
        
        let failedEvents: AnalyticsEvent[] = [];
        
        for (const batch of batches) {
          const success = await this.sendBatch(batch);
          if (!success) {
            failedEvents.push(...batch);
          }
        }
        
        // Re-queue failed events (but limit to prevent infinite growth)
        if (failedEvents.length > 0 && this.queue.length < 50) {
          this.queue.unshift(...failedEvents.slice(0, 25)); // Limit re-queued events
        }
      } else {
        // Send as single batch
        const success = await this.sendBatch(eventsToSend);
        
        if (!success && this.queue.length < 50) {
          // Re-queue failed events (but limit to prevent infinite growth)
          this.queue.unshift(...eventsToSend.slice(0, 25));
        }
      }
    } catch (error) {
      console.warn('[Analytics] Error during flush:', error);
      
      // Re-queue some events on error (but limit to prevent infinite growth)
      if (this.queue.length < 50) {
        this.queue.unshift(...eventsToSend.slice(0, 10));
      }
    }
  }

  /**
   * Reset session tracking (useful for testing or manual session reset)
   */
  resetSession(): void {
    this.viewedPages.clear();
    this.sessionId = this.getOrCreateSessionId();
    console.debug(`[Analytics] Session reset: ${this.sessionId}`);
  }

  /**
   * Get current session info for debugging
   */
  getSessionInfo(): { sessionId: string; viewedPages: string[] } {
    return {
      sessionId: this.sessionId,
      viewedPages: Array.from(this.viewedPages)
    };
  }

  /**
   * Clean up the service
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush any remaining events
    this.flush();
    
    // Clear session tracking
    this.viewedPages.clear();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Infinite Scroll Analytics
type InfiniteLoadAttempt = { reason: 'io'|'manual'; offset?: number; epoch: number };
type InfiniteLoadSuccess = { durationMs: number; appended: number; offset?: number; epoch: number };
type InfiniteLoadAbort = { cause: string; epoch: number };
type RestoreScroll = { mode: 'offset'|'cursor'|'anchorId'|'none'; restoredY?: number; dataVersionMatch?: boolean };
type RateLimitHit = { retryAfterMs?: number; episode: number };

let eventCount = 0, errorCount = 0, retryEpisodes = 0;

export const ISAnalytics = {
  resetBudgets() { eventCount = errorCount = retryEpisodes = 0; },

  trackAttempt(payload: InfiniteLoadAttempt) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    analyticsService.trackEvent('infinite_scroll_load_attempt', {
      reason: payload.reason,
      offset: payload.offset,
      epoch: payload.epoch,
      category: 'infinite_scroll',
    });
  },

  trackSuccess(payload: InfiniteLoadSuccess) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    analyticsService.trackEvent('infinite_scroll_load_success', {
      duration_ms: payload.durationMs,
      appended: payload.appended,
      offset: payload.offset,
      epoch: payload.epoch,
      category: 'infinite_scroll',
    });
  },

  trackAbort(payload: InfiniteLoadAbort) {
    if (errorCount >= IS_ANALYTICS_MAX_ERRORS) return;
    errorCount++;
    analyticsService.trackEvent('infinite_scroll_load_abort', {
      cause: payload.cause,
      epoch: payload.epoch,
      category: 'infinite_scroll',
    });
  },

  trackRestore(payload: RestoreScroll) {
    if (eventCount >= IS_ANALYTICS_MAX_EVENTS) return;
    eventCount++;
    analyticsService.trackEvent('infinite_scroll_restore', {
      mode: payload.mode,
      restored_y: payload.restoredY,
      data_version_match: payload.dataVersionMatch,
      category: 'infinite_scroll',
    });
  },

  trackRateLimit(payload: RateLimitHit) {
    if (retryEpisodes >= IS_MAX_RETRY_EPISODES_PER_SESSION) return;
    retryEpisodes++;
    analyticsService.trackEvent('infinite_scroll_rate_limit', {
      retry_after_ms: payload.retryAfterMs,
      episode: payload.episode,
      category: 'infinite_scroll',
    });
  },
};

// Virtualization Analytics
type VirtualInit = { enabled: boolean; overscan: number; estimatePx: number };
type VirtualMeasure = { measureErrorPx: number; estimatePx: number };
type VirtualMemory = { usedMB?: number; totalMB?: number; jsHeap?: { totalJSHeapSize?: number; usedJSHeapSize?: number; jsHeapSizeLimit?: number }; t: number };

export const ISVirtualAnalytics = {
  trackEnabled(payload: VirtualInit) {
    analyticsService.trackEvent('is.virtual.enabled', {
      enabled: payload.enabled,
      overscan: payload.overscan,
      estimate_px: payload.estimatePx,
      category: 'infinite_scroll',
    });
  },
  trackMeasure(payload: VirtualMeasure) {
    analyticsService.trackEvent('is.virtual.measure', {
      error_px: payload.measureErrorPx,
      estimate_px: payload.estimatePx,
      category: 'infinite_scroll',
    });
  },
  trackMemory(payload: VirtualMemory) {
    analyticsService.trackEvent('is.virtual.memory', {
      used_mb: payload.usedMB,
      total_mb: payload.totalMB,
      js_heap: payload.jsHeap,
      t_ms: payload.t,
      category: 'infinite_scroll',
    });
  },
};
