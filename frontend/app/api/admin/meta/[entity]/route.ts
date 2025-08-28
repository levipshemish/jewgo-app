import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminDatabaseService } from '@/lib/admin/database';
import { rateLimit, RATE_LIMITS } from '@/lib/admin/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(RATE_LIMITS.DEFAULT)(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate admin user
    const adminUser = await requireAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate entity type
    const validEntities = ['restaurant', 'review', 'user', 'restaurantImage', 'marketplace'];
    if (!validEntities.includes(entity)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    // Get valid sort fields for the entity
    const validSortFields = AdminDatabaseService.getValidSortFields(entity as any);
    const searchFields = AdminDatabaseService.getSearchFields(entity as any);
    const defaultSortField = AdminDatabaseService.getDefaultSortField(entity as any);
    const supportsSoftDelete = AdminDatabaseService.supportsSoftDelete(entity as any);

    return NextResponse.json({
      entity,
      validSortFields,
      searchFields,
      defaultSortField,
      supportsSoftDelete
    });
  } catch (error) {
    console.error('[ADMIN] Meta endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entity metadata' },
      { status: 500 }
    );
  }
}
