import { ReviewsResponse, ReviewFilters, ReviewUpdateRequest} from '@/lib/types/review';

class AdminClient {
  private baseUrl = '/api/admin';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Reviews
  async getReviews(filters: ReviewFilters = {}): Promise<ReviewsResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.restaurant_id) {
      params.append('restaurantId', filters.restaurant_id.toString());
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    return this.request<ReviewsResponse>(`/reviews?${params.toString()}`);
  }

  async updateReview(request: ReviewUpdateRequest): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/reviews', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/reviews', {
      method: 'DELETE',
      body: JSON.stringify({ reviewId }),
    });
  }

  async approveReview(reviewId: string): Promise<{ success: boolean }> {
    return this.updateReview({ reviewId, status: 'approved' });
  }

  async rejectReview(reviewId: string): Promise<{ success: boolean }> {
    return this.updateReview({ reviewId, status: 'rejected' });
  }

  // Restaurants
  async getRestaurants(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    return this.request(`/restaurants?${params.toString()}`);
  }

  async updateRestaurant(restaurantId: number, data: any): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/restaurants', {
      method: 'PUT',
      body: JSON.stringify({ restaurantId, ...data }),
    });
  }

  async deleteRestaurant(restaurantId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/restaurants/${restaurantId}`, {
      method: 'DELETE',
    });
  }

  // Users
  async getUsers(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    return this.request(`/users?${params.toString()}`);
  }

  async updateUser(userId: string, data: any): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/users', {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    });
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/users', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  // Cache management
  async clearCache(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/cache/clear', {
      method: 'POST',
    });
  }

  async getCacheStats(): Promise<any> {
    return this.request('/cache/stats');
  }

  // Google Reviews
  async fetchGoogleReviews(data: { restaurant_id?: number; batch_size?: number } = {}): Promise<any> {
    return this.request('/google-reviews/fetch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGoogleReviewsStatus(): Promise<any> {
    return this.request('/google-reviews/status');
  }
}

export const adminClient = new AdminClient();
