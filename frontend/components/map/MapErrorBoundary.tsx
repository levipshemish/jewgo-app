'use client';

import React from 'react';
import { AlertCircle, RefreshCw, MapPin } from 'lucide-react';

interface ErrorInfo {
  componentStack: string;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ onRetry: () => void; error?: Error }>;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface MapFallbackUIProps {
  onRetry: () => void;
  error?: Error;
  retryCount?: number;
  maxRetries?: number;
}

const MapFallbackUI: React.FC<MapFallbackUIProps> = ({ 
  onRetry, 
  error, 
  retryCount = 0, 
  maxRetries = 3 
}) => {
  const canRetry = retryCount < maxRetries;
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <MapPin className="w-8 h-8 text-gray-400 mx-auto opacity-50" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-3">
          Map Temporarily Unavailable
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {error?.message?.includes('Google Maps') 
            ? 'Google Maps failed to load. This might be due to network issues or API limitations.'
            : error?.message?.includes('WebAssembly')
            ? 'Memory allocation error occurred. The map will retry with optimized settings.'
            : 'The interactive map encountered an error and needs to be reloaded.'
          }
        </p>
        
        {canRetry ? (
          <button
            onClick={onRetry}
            disabled={!canRetry}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryCount > 0 ? `Retry (${maxRetries - retryCount} attempts left)` : 'Retry Map Loading'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Maximum retry attempts reached. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </button>
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-500">
          <details className="cursor-pointer">
            <summary className="hover:text-gray-700">Technical Details</summary>
            <pre className="mt-2 text-left bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
              {error?.stack || 'No error details available'}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MapErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error details for debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.group('🗺️ Map Error Boundary');
      // eslint-disable-next-line no-console
      console.error('Error:', error);
      // eslint-disable-next-line no-console
      console.error('Error Info:', errorInfo);
      // eslint-disable-next-line no-console
      console.error('Component Stack:', errorInfo.componentStack);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Replace with your monitoring service
      // reportError('MapErrorBoundary', error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    // Clear any existing timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Increment retry count and reset error state
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Add a small delay to allow for cleanup
    this.retryTimeout = setTimeout(() => {
      // Force a re-render after state reset
      this.forceUpdate();
    }, 100);
  };

  render() {
    const { children, fallbackComponent: FallbackComponent, maxRetries = 3 } = this.props;
    const { hasError, error, retryCount } = this.state;

    if (hasError) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent onRetry={this.handleRetry} error={error || undefined} />;
      }

      // Use default fallback UI
      return (
        <MapFallbackUI
          onRetry={this.handleRetry}
          error={error || undefined}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return children;
  }
}

export default MapErrorBoundary;