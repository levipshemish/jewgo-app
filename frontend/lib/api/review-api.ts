/**
 * Review API Client
 * 
 * This module provides a client-side API for interacting with review-specific
 * backend endpoints. It handles authentication and provides methods for
 * submitting and retrieving reviews.
 */

import { postgresAuth } from '@/lib/auth/postgres-auth';

// We'll use a callback to check authentication instead of direct postgresAuth
let authCheckCallback: (() => boolean) | null = null;

export function setAuthCheckCallback(callback: () => boolean) {
  authCheckCallback = callback;
}

// Base API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://api.jewgo.app';

export interface ReviewSubmissionData {
  rating: number;
  content: string;
  entity_type: 'restaurants' | 'synagogues' | 'mikvahs' | 'stores';
  entity_id: number;
}

export interface ReviewResponse {
  data: {
    id: string;
    user_id: number;
    entity_type: string;
    entity_id: number;
    rating: number;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    moderation_reason?: string;
    created_at: string;
    updated_at: string;
  };
  message: string;
  moderation_status: string;
}

export interface ReviewError {
  error: string;
  details?: string[];
  code?: string;
}

/**
 * Make an authenticated API request using cookie-based authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Check if user is authenticated using the auth callback or fallback to postgresAuth
  const isAuthenticated = authCheckCallback ? authCheckCallback() : postgresAuth.isAuthenticated();
  if (!isAuthenticated) {
    throw new Error('Authentication required. Please log in to submit a review.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging
  console.log('🌐 Review API Request:', {
    url,
    endpoint,
    API_BASE_URL,
    method: options.method || 'GET'
  });
  
  // Get CSRF token for POST requests
  const method = (options.method || 'GET').toString().toUpperCase();
  const isPostRequest = method === 'POST';
  let csrfToken = null;
  
  if (isPostRequest) {
    try {
      if (!postgresAuth.csrfToken) {
        await postgresAuth.getCsrf();
      }
      csrfToken = postgresAuth.csrfToken;
      console.log('🔐 CSRF Token obtained:', csrfToken ? 'Yes' : 'No');
    } catch (e) {
      console.warn('⚠️ Failed to get CSRF token:', e);
    }
  }
  
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...options.headers,
      },
      // Include credentials to send HttpOnly cookies
      credentials: 'include',
      // Add mode to ensure CORS is handled properly
      mode: 'cors',
      // Prevent automatic redirects to avoid HTTPS->HTTP redirects
      redirect: 'manual',
    });
  } catch (fetchError) {
    console.error('🚨 Fetch Error Details:', {
      error: fetchError,
      message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      name: fetchError instanceof Error ? fetchError.name : 'UnknownError',
      url,
      method: options.method || 'GET'
    });
    throw fetchError;
  }

  // Handle manual redirects - if we get a redirect, follow it manually with HTTPS
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    const location = response.headers.get('location');
    if (location) {
      // Convert HTTP redirects to HTTPS
      const httpsLocation = location.replace(/^http:\/\//, 'https://');
      console.log('🔄 Following redirect:', { from: location, to: httpsLocation });
      
      // Make the request to the HTTPS version
      try {
        response = await fetch(httpsLocation, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
            ...options.headers,
          },
          credentials: 'include',
          mode: 'cors',
          redirect: 'manual',
        });
      } catch (redirectError) {
        console.error('🚨 Redirect Error:', redirectError);
        throw redirectError;
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle specific error cases
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    
    if (response.status === 409) {
      throw new Error('You have already reviewed this restaurant.');
    }
    
    if (response.status === 429) {
      throw new Error('Too many review submissions. Please try again later.');
    }
    
    if (response.status === 400 && errorData.details) {
      throw new Error(`Validation error: ${errorData.details.join(', ')}`);
    }
    
    throw new Error(errorData.error || `Failed to submit review: ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a new review
 */
export async function submitReview(reviewData: ReviewSubmissionData): Promise<ReviewResponse> {
  try {
    const response = await apiRequest<ReviewResponse>('/api/v5/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
    
    return response;
  } catch (error) {
    console.error('Review submission error:', error);
    throw error;
  }
}

/**
 * Get reviews for a specific entity
 */
export async function getReviews(
  entityType: string,
  entityId: number,
  limit: number = 10,
  cursor: string = '0'
): Promise<{
  reviews: any[];
  pagination: {
    cursor: string;
    next_cursor: string | null;
    has_more: boolean;
    total_count: number;
  };
}> {
  try {
    const params = new URLSearchParams({
      entity_type: entityType,
      entity_id: entityId.toString(),
      limit: limit.toString(),
      cursor
    });
    
    const response = await apiRequest<{
      reviews: any[];
      pagination: {
        cursor: string;
        next_cursor: string | null;
        has_more: boolean;
        total_count: number;
      };
    }>(`/api/v5/reviews?${params}`);
    
    return response;
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    throw error;
  }
}

/**
 * Get review statistics for an entity
 */
export async function getReviewStats(
  entityType: string,
  entityId: number
): Promise<{
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
  recent_reviews_count: number;
}> {
  try {
    const response = await apiRequest<{
      data: {
        total_reviews: number;
        average_rating: number;
        rating_distribution: Record<string, number>;
        recent_reviews_count: number;
      };
    }>(`/api/v5/reviews/${entityType}/${entityId}/stats`);
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch review stats:', error);
    throw error;
  }
}
