interface DbRestaurantImage {
  id: number;
  restaurant_id?: number | null;
  image_url?: string | null;
  image_order?: number | null;
  cloudinary_public_id?: string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

export function mapImagesToApiResponse(dbRows: DbRestaurantImage[]) {
  return dbRows.map((i) => ({
    id: i.id,
    restaurant_id: i.restaurant_id ?? undefined,
    image_url: i.image_url ?? undefined,
    image_order: i.image_order ?? undefined,
    cloudinary_public_id: i.cloudinary_public_id ?? undefined,
    created_at: i.created_at ? new Date(i.created_at) : undefined,
    updated_at: i.updated_at ? new Date(i.updated_at) : undefined,
  }));
}

