interface DbReview {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  user_email?: string | null;
  rating: number;
  title?: string | null;
  content: string;
  status: string;
  helpful_count: number;
  report_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export function mapReviewsToApiResponse(dbRows: DbReview[]) {
  return dbRows.map((r) => ({
    id: r.id,
    restaurant_id: r.restaurant_id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_email: r.user_email ?? undefined,
    rating: r.rating,
    title: r.title ?? undefined,
    content: r.content,
    status: r.status,
    helpful_count: r.helpful_count,
    report_count: r.report_count,
    created_at: r.created_at ? new Date(r.created_at) : undefined,
    updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
  }));
}

