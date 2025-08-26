interface DbRestaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone_number?: string | null;
  kosher_category?: string | null;
  certifying_agency?: string | null;
  status?: string | null;
  submission_status?: string | null;
  submission_date?: Date | string | null;
  approval_date?: Date | string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

export function mapRestaurantsToApiResponse(dbRows: DbRestaurant[]) {
  return dbRows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    city: r.city,
    state: r.state,
    phone_number: r.phone_number ?? undefined,
    kosher_category: r.kosher_category ?? undefined,
    certifying_agency: r.certifying_agency ?? undefined,
    status: r.status ?? undefined,
    submission_status: r.submission_status ?? undefined,
    submission_date: r.submission_date ? new Date(r.submission_date) : undefined,
    approval_date: r.approval_date ? new Date(r.approval_date) : undefined,
    google_rating: r.google_rating ?? undefined,
    google_review_count: r.google_review_count ?? undefined,
    created_at: r.created_at ? new Date(r.created_at) : undefined,
    updated_at: r.updated_at ? new Date(r.updated_at) : undefined,
  }));
}

