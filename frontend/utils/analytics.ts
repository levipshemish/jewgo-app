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

}

class Analytics {
  private queue: AnalyticsEventData[] = [];
  private sentEvents = new Set<string>(); // Track sent events to prevent duplicates
  private metrics: RegistrationMetrics = {
    totalAttempts: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
    validationErrors: 0,
    rateLimitHits: 0,
  };

  // Track a generic event with deduplication
  track(event: string, properties?: Record<string, any>) {
    // Create unique key for deduplication (event + key properties)
    const eventKey = this.createEventKey(event, properties);
    
    // Check if we've already sent this event recently
    if (this.sentEvents.has(eventKey)) {
      console.info(`[Analytics] Duplicate event skipped: ${event}`);
      return;
    }
    
    // Mark event as sent
    this.sentEvents.add(eventKey);
    
    // Clean up old event keys every 100 events to prevent memory leak
    if (this.sentEvents.size > 100) {
      const keysArray = Array.from(this.sentEvents);
      keysArray.slice(0, 50).forEach(key => this.sentEvents.delete(key));
    }

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
      console.info(`[Analytics] Event tracked: ${event}`, properties);
    }
  }

  // Create unique key for event deduplication
  private createEventKey(event: string, properties?: Record<string, any>): string {
    const keyProps = properties ? {
      page: properties.page,
      userId: properties.userId,
      timestamp: Math.floor((properties.timestamp || Date.now()) / 60000) // Group by minute
    } : {};
    
    return `${event}:${JSON.stringify(keyProps)}`;
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
      
    
    return sanitized;
  }

  private async sendToAnalyticsService(event: AnalyticsEventData) {
    // Placeholder for actual analytics service integration
    // Examples: Google Analytics, Mixpanel, Segment, etc.
    
    // Skip network calls in development
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    
    // Google Analytics example:
    if ((window as any).gtag) {
      (window as any).gtag('event', event.event, event.properties);
    }

    // Or send to custom analytics endpoint
    try {
      const payload = JSON.stringify(event);
      const payloadSize = new TextEncoder().encode(payload).length;
      
      // Check payload size and truncate if necessary
      if (payloadSize > 500000) { // 500KB threshold for individual events
        console.warn(`[Analytics] Large event payload (${Math.round(payloadSize / 1024)}KB), truncating properties`);
        const truncatedEvent = {
          ...event,
          properties: this.truncateProperties(event.properties || {})
        };
        
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(truncatedEvent),
        });
      } else {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      }
    } catch (error: any) {
      // Handle REQUEST_TOO_LARGE errors gracefully
      if (error?.message?.includes('413') || error?.message?.includes('REQUEST_TOO_LARGE')) {
        console.warn('[Analytics] Request too large, event dropped');
      }
      // console.error('[Analytics] Failed to send event:', error);
    }
  }

  private truncateProperties(properties: Record<string, any>): Record<string, any> {
    const truncated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && value.length > 500) {
        // Truncate long strings
        truncated[key] = `${value.substring(0, 500)}... [truncated]`;
      } else if (typeof value === 'object' && value !== null) {
        // For objects, keep only essential fields
        if (Array.isArray(value)) {
          truncated[key] = value.slice(0, 10); // Limit arrays to 10 items
        } else {
          // Recursively truncate nested objects
          truncated[key] = this.truncateProperties(value);
        }
      } else {
        truncated[key] = value;
      }
    }
    
    return truncated;
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export types
export type { AnalyticsEventData, RegistrationMetrics };
