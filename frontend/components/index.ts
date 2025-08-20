// Barrel file for components exports
// This provides stable entry points for commonly used components

// UI Components
export * from './ui/Loading';
export * from './ui/LoadingSpinner';
export * from './ui/LoadingState';
export * from './ui/UnifiedCard';
export * from './ui/ErrorBoundary';
export * from './ui/VirtualList';
export * from './ui/FontLoader';
export * from './ui/CssLoader';

// Search Components
export * from './search/FilterBase';
export * from './search/CategoryFilters';
export * from './search/DietaryFilters';
export * from './search/AdvancedFilters';

// Restaurant Components
export * from './restaurant/RestaurantClaimForm';
export * from './restaurant/HoursStatusBadge';
export { default as UnifiedRestaurantCard } from './restaurant/UnifiedRestaurantCard';

// Map Components
export * from './map/InteractiveRestaurantMap';
export * from './map/MapNotification';
export * from './map/MapControls';
export * from './map/MapLegend';

// Layout Components
export * from './layout/MobileSearchHeader';
export * from './layout/MobileActionButtons';

// Auth Components
// export * from './auth/index'; // Empty file, skipping for now

// Newsletter Components
export * from './newsletter/NewsletterSignup';

// Marketplace Components
// MarketplaceListingCard has been deleted - use EnhancedMarketplaceCard instead
