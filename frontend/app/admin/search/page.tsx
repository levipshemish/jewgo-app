import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/server/admin-auth';
import GlobalSearchResults from '@/components/admin/GlobalSearchResults';

// Force dynamic rendering for admin routes to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminSearchPage({ searchParams }: SearchPageProps) {
  try {
    const adminUser = await getAdminUser();
    
    if (!adminUser) {
      redirect('/auth/signin?redirectTo=/admin/search&message=admin_access_required');
    }

    // Check if user has minimal admin role (moderator or higher)
    if (!adminUser.adminRole || !['moderator', 'data_admin', 'store_admin', 'system_admin', 'super_admin'].includes(adminUser.adminRole)) {
      redirect('/?error=not_authorized&message=insufficient_admin_permissions');
    }

    const params = await searchParams;
    const query = Array.isArray(params.q) ? params.q[0] : params.q || '';

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Global Search</h1>
          <p className="text-gray-600">
            Search across all data in the system.
          </p>
        </div>

        {/* Search Results */}
        <GlobalSearchResults query={query} adminUser={adminUser} />
      </div>
    );
  } catch (error) {
    console.error('[ADMIN] Error rendering search page:', error);
    redirect('/auth/signin?redirectTo=/admin/search&message=admin_access_required');
  }
}