/**
 * Analytics Integration Examples
 * Demonstrates how to use the analytics system in various components
 */

'use client';

import React, { useState } from 'react';
import useAnalytics from '@/lib/hooks/useAnalytics';

// Example: Restaurant Card with Analytics
export function RestaurantCardWithAnalytics({ 
  restaurantId, 
  restaurantName, 
  rating, 
  reviewCount 
}: {
  restaurantId: number;
  restaurantName: string;
  rating: number;
  reviewCount: number;
}) {
  const { trackRestaurantView, trackRestaurantFavorite } = useAnalytics();
  const [isFavorited, setIsFavorited] = useState(false);

  const handleCardClick = () => {
    trackRestaurantView(restaurantId, restaurantName, {
      rating,
      review_count: reviewCount,
      source: 'restaurant_card',
    });
  };

  const handleFavoriteClick = () => {
    const action = isFavorited ? 'remove' : 'add';
    trackRestaurantFavorite(restaurantId, action, restaurantName);
    setIsFavorited(!isFavorited);
  };

  return (
    <div 
      className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <h3 className="font-semibold text-lg">{restaurantName}</h3>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-500">★</span>
          <span>{rating}</span>
          <span className="text-gray-500">({reviewCount} reviews)</span>
        </div>
        <button
          onClick={(_e) => {
            _e.stopPropagation();
            handleFavoriteClick();
          }}
          className={`p-2 rounded-full ${
            isFavorited ? 'text-red-500' : 'text-gray-400'
          } hover:bg-gray-100`}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  );
}

// Example: Search Form with Analytics
export function SearchFormWithAnalytics() {
  const { trackSearch, trackFormStart, trackFormComplete } = useAnalytics();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    trackFormStart('restaurant_search', 'search');
    setIsSearching(true);

    try {
      // Simulate search
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Track successful search
      trackSearch(query, Math.floor(Math.random() * 50) + 10, 'restaurant', {
        filters: { cuisine: 'kosher', location: 'current' },
      });
      
      trackFormComplete('restaurant_search', 'search', 1000);
    } catch (_error) {
      // Track form error
      // trackFormError('restaurant_search', 'search', 'api_error', _error.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          value={query}
          onChange={(_e) => setQuery(_e.target.value)}
          placeholder="Search for kosher restaurants..."
          className="w-full p-3 border rounded-lg"
          disabled={isSearching}
        />
      </div>
      <button
        type="submit"
        disabled={isSearching}
        className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}

// Example: Marketplace Listing with Analytics
export function MarketplaceListingWithAnalytics({
  listingId,
  title,
  price,
  category,
  description
}: {
  listingId: string;
  title: string;
  price: number;
  category: string;
  description: string;
}) {
  const { trackMarketplaceListingView, trackMarketplacePurchase } = useAnalytics();

  const handleListingClick = () => {
    trackMarketplaceListingView(listingId, title, category);
  };

  const handlePurchase = () => {
    trackMarketplacePurchase(listingId, price, 'USD');
  };

  return (
    <div 
      className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleListingClick}
    >
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-gray-600 text-sm mt-1">{category}</p>
      <p className="text-gray-700 mt-2">{description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xl font-bold text-green-600">${price}</span>
        <button
          onClick={(_e) => {
            _e.stopPropagation();
            handlePurchase();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Purchase
        </button>
      </div>
    </div>
  );
}

// Example: User Engagement Tracking
export function UserEngagementTracker() {
  const { trackUserEngagement, trackConversion } = useAnalytics();

  const handleFeatureClick = (feature: string) => {
    trackUserEngagement('feature_click', {
      feature_name: feature,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  };

  const handleGoalCompletion = (goal: string, value?: number) => {
    trackConversion(goal, value, {
      source: 'user_engagement_tracker',
      medium: 'web',
      campaign: 'feature_adoption',
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Track Your Engagement</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleFeatureClick('favorites')}
          className="p-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
        >
          Add to Favorites
        </button>
        
        <button
          onClick={() => handleFeatureClick('reviews')}
          className="p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
        >
          Write Review
        </button>
        
        <button
          onClick={() => handleFeatureClick('sharing')}
          className="p-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
        >
          Share Restaurant
        </button>
        
        <button
          onClick={() => handleFeatureClick('directions')}
          className="p-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200"
        >
          Get Directions
        </button>
      </div>

      <div className="mt-6">
        <h4 className="font-medium mb-2">Goal Completion</h4>
        <div className="space-y-2">
          <button
            onClick={() => handleGoalCompletion('first_search', 10)}
            className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Complete First Search ($10 value)
          </button>
          
          <button
            onClick={() => handleGoalCompletion('first_review', 25)}
            className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Write First Review ($25 value)
          </button>
          
          <button
            onClick={() => handleGoalCompletion('first_purchase', 50)}
            className="block w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Make First Purchase ($50 value)
          </button>
        </div>
      </div>
    </div>
  );
}

// Example: Performance Monitoring
export function PerformanceMonitor() {
  const { trackPerformance } = useAnalytics();

  const simulatePerformanceMetrics = () => {
    // Simulate various performance metrics
    trackPerformance('api_response_time', Math.random() * 1000 + 100);
    trackPerformance('page_load_time', Math.random() * 2000 + 500);
    trackPerformance('image_load_time', Math.random() * 500 + 50);
    trackPerformance('database_query_time', Math.random() * 300 + 20);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Performance Monitoring</h3>
      <button
        onClick={simulatePerformanceMetrics}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
      >
        Simulate Performance Metrics
      </button>
      <p className="text-sm text-gray-600 mt-2">
        Click to simulate tracking various performance metrics
      </p>
    </div>
  );
}

// Example: Error Tracking
export function ErrorTracker() {
  const { trackError } = useAnalytics();

  const simulateError = (errorType: string) => {
    const error = new Error(`Simulated ${errorType} error`);
    trackError(error, {
      error_type: errorType,
      component: 'ErrorTracker',
      user_action: 'button_click',
    });
  };

  const simulateStringError = () => {
    trackError('Simulated string error message', {
      error_type: 'string_error',
      component: 'ErrorTracker',
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Error Tracking</h3>
      <div className="space-y-2">
        <button
          onClick={() => simulateError('validation')}
          className="block w-full text-left p-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Simulate Validation Error
        </button>
        
        <button
          onClick={() => simulateError('network')}
          className="block w-full text-left p-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Simulate Network Error
        </button>
        
        <button
          onClick={() => simulateError('database')}
          className="block w-full text-left p-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Simulate Database Error
        </button>
        
        <button
          onClick={simulateStringError}
          className="block w-full text-left p-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Simulate String Error
        </button>
      </div>
    </div>
  );
}

// Main Example Component
export default function AnalyticsExamples() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Analytics Integration Examples
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Restaurant Features</h2>
          <RestaurantCardWithAnalytics
            restaurantId={1}
            restaurantName="Kosher Deli Plus"
            rating={4.5}
            reviewCount={127}
          />
          <SearchFormWithAnalytics />
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Marketplace Features</h2>
          <MarketplaceListingWithAnalytics
            listingId="mp_001"
            title="Vintage Menorah"
            price={75}
            category="Judaica"
            description="Beautiful antique menorah from the 1920s"
          />
        </div>
      </div>
      
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">User Engagement & Tracking</h2>
        <UserEngagementTracker />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PerformanceMonitor />
        <ErrorTracker />
      </div>
    </div>
  );
}
