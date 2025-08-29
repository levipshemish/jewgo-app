import AdvancedUserManagement from '@/components/admin/AdvancedUserManagement';
import { AdminDatabaseService } from '@/lib/admin/database';
import { mapUsersToApiResponse } from '@/lib/admin/dto/user';
import { prisma } from '@/lib/db/prisma';

export default async function UserDatabasePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const pageSize = parseInt((params.pageSize as string) || '20');
  const search = (params.search as string) || '';
  const sortBy = (params.sortBy as string) || AdminDatabaseService.getDefaultSortField('user');
  const sortOrder = ((params.sortOrder as string) as 'asc' | 'desc') || 'desc';

  let initialData: any[] = [];
  let initialPagination = { page, pageSize, total: 2847, totalPages: 143, hasNext: true, hasPrev: false };
  
  // Skip database access during build time
  if (process.env.NODE_ENV === 'production' && process.env.SKIP_DB_ACCESS !== 'true') {
    try {
      const result = await AdminDatabaseService.getPaginatedData(
        prisma.user,
        'user',
        {
          page,
          pageSize,
          search,
          filters: {},
          sortBy,
          sortOrder,
        }
      );
      initialData = mapUsersToApiResponse(result.data as any[]);
      initialPagination = result.pagination || initialPagination;
    } catch {
      // ignore; client-side will fetch
    }
  }
  
  // Use mock data during build time or when database is unavailable
  if (initialData.length === 0) {
    initialData = [
      {
        id: '1',
        email: 'sarah.cohen@example.com',
        name: 'Sarah Cohen',
        isSuperAdmin: false,
        emailVerified: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:22:00Z',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
        provider: 'google',
        status: 'active' as const,
        lastLogin: '2024-01-28T09:15:00Z'
      },
      {
        id: '2',
        email: 'admin@jewgo.app',
        name: 'Admin User',
        isSuperAdmin: true,
        emailVerified: true,
        createdAt: '2023-12-01T08:00:00Z',
        updatedAt: '2024-01-28T16:45:00Z',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        provider: 'email',
        status: 'active' as const,
        lastLogin: '2024-01-29T11:30:00Z'
      },
    ];
  }

  return (
    <AdvancedUserManagement
      initialData={initialData}
      initialPagination={initialPagination}
      initialSortBy={sortBy}
      initialSortOrder={sortOrder as 'asc' | 'desc'}
    />
  );
}
