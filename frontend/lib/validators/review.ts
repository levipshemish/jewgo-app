export interface Review {
  id: string;
  restaurant_id: number;
  restaurant_name?: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  rating: number;
  title?: string;
  content: string;
  comment?: string; // Alias for content
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  verified_purchase?: boolean;
  helpful_count?: number;
  report_count?: number;
  moderator_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface ReviewFilters {
  status?: string;
  restaurant_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReviewUpdateRequest {
  reviewId: string;
  status?: 'pending' | 'approved' | 'rejected';
  moderator_notes?: string;
  title?: string;
  content?: string;
  rating?: number;
}

export interface ReviewCreateRequest {
  restaurant_id: number;
  user_name: string;
  user_email?: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}
