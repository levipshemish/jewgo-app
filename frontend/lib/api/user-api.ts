/**
 * User API Client
 * 
 * This module provides a client-side API for interacting with user-specific
 * backend endpoints. It automatically handles authentication by including
 * the user's JWT token from Supabase.
 */

import { supabaseBrowser } from '@/lib/supabase/client';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Get the current user's JWT token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * User Profile API
 */
export const userProfileApi = {
  /**
   * Get current user's profile
   */
  async getProfile() {
    return apiRequest('/api/user/profile');
  },

  /**
   * Update current user's profile
   */
  async updateProfile(profileData: {
    display_name?: string;
    avatar_url?: string;
    preferences?: any;
    phone?: string;
  }) {
    return apiRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

/**
 * User Favorites API
 */
export const userFavoritesApi = {
  /**
   * Get user's favorite restaurants
   */
  async getFavorites(limit = 20, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return apiRequest(`/api/user/favorites?${params}`);
  },

  /**
   * Add restaurant to favorites
   */
  async addFavorite(restaurantId: string) {
    return apiRequest(`/api/user/favorites/${restaurantId}`, {
      method: 'POST',
    });
  },

  /**
   * Remove restaurant from favorites
   */
  async removeFavorite(restaurantId: string) {
    return apiRequest(`/api/user/favorites/${restaurantId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * User Reviews API
 */
export const userReviewsApi = {
  /**
   * Get user's reviews
   */
  async getReviews(limit = 20, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return apiRequest(`/api/user/reviews?${params}`);
  },

  /**
   * Create a review for a restaurant
   */
  async createReview(restaurantId: string, reviewData: {
    rating: number;
    title?: string;
    content: string;
    images?: string[];
  }) {
    return apiRequest(`/api/user/reviews/${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Update a review
   */
  async updateReview(reviewId: string, reviewData: {
    rating?: number;
    title?: string;
    content?: string;
    images?: string[];
  }) {
    return apiRequest(`/api/user/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string) {
    return apiRequest(`/api/user/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * User Activity API
 */
export const userActivityApi = {
  /**
   * Get user's activity history
   */
  async getActivity(limit = 20, offset = 0, type?: string) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (type) {
      params.append('type', type);
    }
    return apiRequest(`/api/user/activity?${params}`);
  },
};

/**
 * User Stats API
 */
export const userStatsApi = {
  /**
   * Get user's statistics
   */
  async getStats() {
    return apiRequest('/api/user/stats');
  },
};

/**
 * Combined User API
 */
export const userApi = {
  profile: userProfileApi,
  favorites: userFavoritesApi,
  reviews: userReviewsApi,
  activity: userActivityApi,
  stats: userStatsApi,
};

/**
 * Hook for using user API with error handling
 */
export function useUserApi() {
  const handleError = (error: any) => {
    console.error('User API error:', error);
    // You can add toast notifications or other error handling here
    throw error;
  };

  return {
    profile: {
      get: () => userProfileApi.getProfile().catch(handleError),
      update: (data: any) => userProfileApi.updateProfile(data).catch(handleError),
    },
    favorites: {
      get: (limit?: number, offset?: number) => 
        userFavoritesApi.getFavorites(limit, offset).catch(handleError),
      add: (restaurantId: string) => 
        userFavoritesApi.addFavorite(restaurantId).catch(handleError),
      remove: (restaurantId: string) => 
        userFavoritesApi.removeFavorite(restaurantId).catch(handleError),
    },
    reviews: {
      get: (limit?: number, offset?: number) => 
        userReviewsApi.getReviews(limit, offset).catch(handleError),
      create: (restaurantId: string, data: any) => 
        userReviewsApi.createReview(restaurantId, data).catch(handleError),
      update: (reviewId: string, data: any) => 
        userReviewsApi.updateReview(reviewId, data).catch(handleError),
      delete: (reviewId: string) => 
        userReviewsApi.deleteReview(reviewId).catch(handleError),
    },
    activity: {
      get: (limit?: number, offset?: number, type?: string) => 
        userActivityApi.getActivity(limit, offset, type).catch(handleError),
    },
    stats: {
      get: () => userStatsApi.getStats().catch(handleError),
    },
  };
}
