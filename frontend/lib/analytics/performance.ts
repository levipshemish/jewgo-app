// Performance monitoring and analytics system

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  
  // Custom metrics
  pageLoadTime?: number;
  apiResponseTime?: number;
  componentRenderTime?: number;
  errorCount?: number;
  userInteractions?: number;
}

interface PerformanceEvent {
  name: string;
  value: number;
  category: 'navigation' | 'paint' | 'layout' | 'api' | 'component' | 'error';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) {return;}
    
    this.setupCoreWebVitals();
    this.setupCustomMetrics();
    this.setupErrorTracking();
    
    this.isInitialized = true;
  }

  private setupCoreWebVitals() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.recordEvent('LCP', lastEntry.startTime, 'paint', {
              element: (lastEntry as unknown as Record<string, unknown>)['element'] as string,
              url: (lastEntry as unknown as Record<string, unknown>)['url'] as string
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch {
        // eslint-disable-next-line no-console
        }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordEvent('FID', ((entry as unknown as Record<string, unknown>)['processingStart'] as number) - entry.startTime, 'navigation', {
              name: entry.name,
              type: entry.entryType
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch {
        // eslint-disable-next-line no-console
        }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!((entry as unknown as Record<string, unknown>)['hadRecentInput'] as boolean)) {
              clsValue += (entry as unknown as Record<string, unknown>)['value'] as number;
            }
          });
          this.recordEvent('CLS', clsValue, 'layout');
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch {
        // eslint-disable-next-line no-console
        }
    }
  }

  private setupCustomMetrics() {
    // Page load time
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.recordEvent('PageLoad', loadTime, 'navigation');
      });

      // Navigation timing
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
          this.recordEvent('TTFB', navEntry.responseStart - navEntry.requestStart, 'navigation');
          this.recordEvent('DOMContentLoaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'navigation');
        }
      }
    }
  }

  private setupErrorTracking() {
    if (typeof window !== 'undefined') {
      // JavaScript errors
      window.addEventListener('error', (event) => {
        this.recordEvent('JavaScriptError', 0, 'error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.recordEvent('UnhandledRejection', 0, 'error', {
          reason: event.reason?.toString()
        });
      });
    }
  }

  recordEvent(name: string, value: number, category: PerformanceEvent['category'], metadata?: Record<string, unknown>) {
    const event: PerformanceEvent = {
      name,
      value,
      category,
      timestamp: Date.now(),
      metadata
    };

    this.events.push(event);
    this.sendToAnalytics(event);
  }

  measureComponentRender(componentName: string, renderFn: () => void) {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    
    this.recordEvent('ComponentRender', endTime - startTime, 'component', {
      component: componentName
    });
  }

  measureApiCall<T>(apiName: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return apiCall().finally(() => {
      const endTime = performance.now();
      this.recordEvent('ApiCall', endTime - startTime, 'api', {
        api: apiName
      });
    });
  }

  trackUserInteraction(interactionName: string, metadata?: Record<string, unknown>) {
    this.recordEvent('UserInteraction', 0, 'navigation', {
      interaction: interactionName,
      ...metadata
    });
  }

  private sendToAnalytics(event: PerformanceEvent) {
    // Send to your analytics service (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance', {
        event_category: event.category,
        event_label: event.name,
        value: Math.round(event.value),
        custom_parameters: event.metadata
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      }

    // Store locally for debugging
    this.storeLocally(event);
  }

  private storeLocally(event: PerformanceEvent) {
    try {
      // Sanitize the event to remove circular references and DOM elements
      const sanitizedEvent = this.sanitizeEvent(event);
      
      const stored = localStorage.getItem('jewgo_performance_events');
      const events = stored ? JSON.parse(stored) : [];
      events.push(sanitizedEvent);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('jewgo_performance_events', JSON.stringify(events));
    } catch {
      }
  }

  private sanitizeEvent(event: PerformanceEvent): PerformanceEvent {
    // Create a clean copy of the event without circular references
    const sanitized: PerformanceEvent = {
      name: event.name,
      value: event.value,
      category: event.category,
      timestamp: event.timestamp
    };

    // Sanitize metadata if it exists
    if (event.metadata) {
      sanitized.metadata = this.sanitizeMetadata(event.metadata);
    }

    return sanitized;
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip DOM elements and functions
      if (value && typeof value === 'object') {
        if (value instanceof Element || value instanceof HTMLElement) {
          sanitized[key] = `[DOM Element: ${value.tagName || 'unknown'}]`;
        } else if (value instanceof Event) {
          sanitized[key] = `[Event: ${value.type}]`;
        } else if (typeof value === 'function') {
          sanitized[key] = '[Function]';
        } else {
          // Recursively sanitize nested objects
          try {
            // Test if it can be serialized
            JSON.stringify(value);
            sanitized[key] = value;
          } catch {
            sanitized[key] = '[Circular Reference]';
          }
        }
      } else if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};
    
    // Calculate averages from events
    const lcpEvents = this.events.filter(e => e.name === 'LCP');
    const fidEvents = this.events.filter(e => e.name === 'FID');
    const clsEvents = this.events.filter(e => e.name === 'CLS');
    const apiEvents = this.events.filter(e => e.name === 'ApiCall');
    const errorEvents = this.events.filter(e => e.category === 'error');

    if (lcpEvents.length > 0) {
      const lastLcpEvent = lcpEvents[lcpEvents.length - 1];
      if (lastLcpEvent) {
        metrics.lcp = lastLcpEvent.value; // Use latest LCP
      }
    }
    if (fidEvents.length > 0) {
      metrics.fid = Math.min(...fidEvents.map(e => e.value)); // Use best FID
    }
    if (clsEvents.length > 0) {
      const lastClsEvent = clsEvents[clsEvents.length - 1];
      if (lastClsEvent) {
        metrics.cls = lastClsEvent.value; // Use latest CLS
      }
    }
    if (apiEvents.length > 0) {
      metrics.apiResponseTime = apiEvents.reduce((sum, e) => sum + e.value, 0) / apiEvents.length;
    }
    metrics.errorCount = errorEvents.length;

    return metrics;
  }

  getEvents(category?: string): PerformanceEvent[] {
    if (category) {
      return this.events.filter(e => e.category === category);
    }
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
    localStorage.removeItem('jewgo_performance_events');
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const measureRender = (componentName: string) => {
  return (renderFn: () => void) => {
    performanceMonitor.measureComponentRender(componentName, renderFn);
  };
};

export const measureApi = (apiName: string) => {
  return <T>(apiCall: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureApiCall(apiName, apiCall);
  };
};

export const trackInteraction = (interactionName: string, metadata?: Record<string, unknown>) => {
  performanceMonitor.trackUserInteraction(interactionName, metadata);
};

// React hook for measuring component performance
export const usePerformanceTracking = (componentName: string) => {
  const trackRender = () => {
    performanceMonitor.recordEvent('ComponentRender', 0, 'component', {
      component: componentName,
      timestamp: Date.now()
    });
  };

  return { trackRender };
}; 