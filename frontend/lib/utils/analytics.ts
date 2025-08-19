// NOTE: simple console-based analytics removed in favor of class-based singleton below

// Import AnalyticsEvent from types
import type { AnalyticsEvent } from '../types/index';

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
  private queue: AnalyticsEvent[] = [];
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
    const analyticsEvent: AnalyticsEvent = {
      name: event,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      props: properties,
    };

    this.queue.push(analyticsEvent);
    
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalyticsService(analyticsEvent);
    } else {
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

  trackLoginFailure(email: string, reason: string, details?: any) {
    this.track('login_failure', {
      email: this.hashEmail(email),
      reason,
      details: this.sanitizeDetails(details),
      timestamp: new Date().toISOString(),
    });
  }

  trackAccountLocked(email: string, attempts: number) {
    this.track('account_locked', {
      email: this.hashEmail(email),
      attempts,
      timestamp: new Date().toISOString(),
    });
  }

  // Get current metrics
  getMetrics(): RegistrationMetrics {
    return { ...this.metrics };
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.metrics = {
      totalAttempts: 0,
      successfulRegistrations: 0,
      failedRegistrations: 0,
      validationErrors: 0,
      rateLimitHits: 0,
      recaptchaFailures: 0,
    };
  }

  // Private helper methods
  private hashEmail(email: string): string {
    // Simple hash for privacy (in production, use proper hashing)
    return email.split('@')[1] || 'unknown';
  }

  private sanitizeDetails(details: any): any {
    if (!details) {
    return undefined;
  }
    
    // Remove sensitive information
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.recaptchaToken;
    
    return sanitized;
  }

  private async sendToAnalyticsService(event: AnalyticsEventData) {
    // Placeholder for actual analytics service integration
    // Examples: Google Analytics, Mixpanel, Segment, etc.
    
    // Google Analytics example:
    if ((window as any).gtag) {
      (window as any).gtag('event', event.event, event.properties);
    }

    // Or send to custom analytics endpoint
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {
      // console.error('[Analytics] Failed to send event:', error);
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export types
export type { AnalyticsEventData, RegistrationMetrics };
