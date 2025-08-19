// NOTE: simple console-based analytics removed in favor of class-based singleton below

// Analytics tracking utility
// This can be integrated with services like Google Analytics, Mixpanel, or custom analytics

interface AnalyticsEventData {
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

interface RegistrationMetrics {
  totalAttempts: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  validationErrors: number;
  rateLimitHits: number;
  recaptchaFailures: number;
}

class Analytics {
  private queue: AnalyticsEventData[] = [];
  private metrics: RegistrationMetrics = {
    totalAttempts: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
    validationErrors: 0,
    rateLimitHits: 0,
    recaptchaFailures: 0,
  };

  // Track a generic event
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEventData = {
      event,
      properties,
      timestamp: new Date(),
    };

    this.queue.push(analyticsEvent);
    
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalyticsService(analyticsEvent);
    } else {
      // Development logging removed for production readiness
    }
  }

  // Registration-specific tracking methods
  trackRegistrationAttempt(email: string, source?: string) {
    this.metrics.totalAttempts++;
    this.track('registration_attempt', {
      email: this.hashEmail(email),
      source,
      timestamp: new Date().toISOString(),
    });
  }

  trackRegistrationSuccess(userId: string, email: string, source?: string) {
    this.metrics.successfulRegistrations++;
    this.track('registration_success', {
      userId,
      email: this.hashEmail(email),
      source,
      timestamp: new Date().toISOString(),
    });
  }

  trackRegistrationFailure(email: string, reason: string, details?: any) {
    this.metrics.failedRegistrations++;
    
    // Categorize failures
    if (reason === 'validation_error') {
      this.metrics.validationErrors++;
    } else if (reason === 'rate_limit') {
      this.metrics.rateLimitHits++;
    } else if (reason === 'recaptcha_failed') {
      this.metrics.recaptchaFailures++;
    }

    this.track('registration_failure', {
      email: this.hashEmail(email),
      reason,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  trackLoginAttempt(email: string, method: string) {
    this.track('login_attempt', {
      email: this.hashEmail(email),
      method,
      timestamp: new Date().toISOString(),
    });
  }

  trackLoginSuccess(userId: string, email: string, method: string) {
    this.track('login_success', {
      userId,
      email: this.hashEmail(email),
      method,
      timestamp: new Date().toISOString(),
    });
  }

  trackLoginFailure(email: string, method: string, reason: string) {
    this.track('login_failure', {
      email: this.hashEmail(email),
      method,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance tracking
  trackPageLoad(page: string, loadTime: number) {
    this.track('page_load', {
      page,
      loadTime,
      timestamp: new Date().toISOString(),
    });
  }

  trackApiCall(endpoint: string, method: string, duration: number, status: number) {
    this.track('api_call', {
      endpoint,
      method,
      duration,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Search tracking
  trackSearch(query: string, results: number, filters?: Record<string, any>) {
    this.track('search', {
      query: this.sanitizeQuery(query),
      results,
      filters,
      timestamp: new Date().toISOString(),
    });
  }

  // Restaurant interaction tracking
  trackRestaurantView(restaurantId: number, restaurantName: string) {
    this.track('restaurant_view', {
      restaurantId,
      restaurantName,
      timestamp: new Date().toISOString(),
    });
  }

  trackRestaurantFavorite(restaurantId: number, action: 'add' | 'remove') {
    this.track('restaurant_favorite', {
      restaurantId,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // Get metrics
  getMetrics(): RegistrationMetrics {
    return { ...this.metrics };
  }

  // Get queue
  getQueue(): AnalyticsEventData[] {
    return [...this.queue];
  }

  // Clear queue
  clearQueue() {
    this.queue = [];
  }

  // Private helper methods
  private hashEmail(email: string): string {
    // Simple hash for privacy - in production, use a proper hashing library
    return `${email.split('@')[0].substring(0, 3)}***@${email.split('@')[1]}`;
  }

  private sanitizeDetails(details: any): any {
    // Remove sensitive information from error details
    if (typeof details === 'object' && details !== null) {
      const sanitized = { ...details };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      return sanitized;
    }
    return details;
  }

  private sanitizeQuery(query: string): string {
    // Remove potentially sensitive information from search queries
    return query.replace(/[<>]/g, '').substring(0, 100);
  }

  private sendToAnalyticsService(_event: AnalyticsEventData) {
    // In production, implement actual analytics service integration
    // For now, silently process the event
    // TODO: Integrate with actual analytics service (Google Analytics, Mixpanel, etc.)
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export types for external use
export type { AnalyticsEventData, RegistrationMetrics };
