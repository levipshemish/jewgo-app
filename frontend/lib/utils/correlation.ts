/**
 * Correlation ID utilities for request tracing
 * Provides functions to generate and manage correlation IDs for request tracking
 */

/**
 * Generate a unique correlation ID for request tracing
 * Format: req_<timestamp>_<random_string>
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get correlation ID from current context
 * In a real implementation, this would get the correlation ID from request context
 * For now, generates a new one
 */
export function getCorrelationId(): string {
  // TODO: Implement proper correlation ID retrieval from request context
  // This should get the correlation ID from the current request context
  return generateCorrelationId();
}

/**
 * Create a correlation context for logging and tracing
 */
export function createCorrelationContext(correlationId?: string) {
  const id = correlationId || generateCorrelationId();
  return {
    correlationId: id,
    timestamp: new Date().toISOString(),
    requestId: id,
  };
}

/**
 * Extract correlation ID from headers or context
 */
export function extractCorrelationId(headers?: Record<string, string>): string | null {
  if (!headers) return null;
  
  // Check common correlation ID header names
  const correlationHeaders = [
    'x-correlation-id',
    'x-request-id',
    'x-trace-id',
    'correlation-id',
    'request-id',
  ];
  
  for (const header of correlationHeaders) {
    if (headers[header]) {
      return headers[header];
    }
  }
  
  return null;
}
