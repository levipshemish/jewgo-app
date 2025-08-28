export {};

// Google Maps types
declare global {
  interface Window {
    __CSRF_TOKEN__?: string;
    google?: any;
  }
}

// External library types
export interface MarkerClusterer {
  // Add basic interface for MarkerClusterer
}

export interface SuperClusterAlgorithm {
  // Add basic interface for SuperClusterAlgorithm
}

export interface ReCaptchaAPI {
  // Add basic interface for ReCaptchaAPI
}

export interface AnalyticsAPI {
  // Add basic interface for AnalyticsAPI
}

export interface GTagAPI {
  // Add basic interface for GTagAPI
}

export interface GoogleMapsAPI {
  // Add basic interface for GoogleMapsAPI
}

