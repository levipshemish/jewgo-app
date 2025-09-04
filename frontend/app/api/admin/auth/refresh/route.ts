import { handleRoute } from '@/lib/server/route-helpers';
import { createSuccessResponse } from '@/lib/utils/error-responses';

export const runtime = 'nodejs';

export async function POST() {
  return handleRoute(async () => {
    // Placeholder for invalidating any server-side caches if added in the future
    return createSuccessResponse({ message: 'Token refreshed successfully' });
  });
}

