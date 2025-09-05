// Component Library Index
// This file exports all components with the new unified structure

// Core Components (Primary)
export * from './core';

// Domain-Specific Wrappers
export * from './shuls';

// Legacy Components (Deprecated - use core components instead)
export * from './ui/Loading';
export * from './ui/LoadingSpinner';
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

// Newsletter Components
export * from './newsletter/NewsletterSignup';

// Marketplace Components
// Note: EnhancedMarketplaceCard and related components are still available
// but consider migrating to core Card component for consistency