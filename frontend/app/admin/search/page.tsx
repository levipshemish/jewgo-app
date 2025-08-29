import { getAdminUser } from '@/lib/admin/auth';
import GlobalSearchResults from '@/components/admin/GlobalSearchResults';
import { redirect } from 'next/navigation';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminSearchPage({ searchParams }: SearchPageProps) {
  try {
    const adminUser = await getAdminUser();
    const params = await searchParams;
    
    if (!adminUser) {
      redirect('/auth/signin?redirectTo=/admin/search&message=admin_access_required');
    }

    const query = params.q || '';

    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
          {query && (
            <p className="text-gray-600">
              Showing results for: <span className="font-semibold">&quot;{query}&quot;</span>
            </p>
          )}
        </div>
        
        <GlobalSearchResults query={query} adminUser={adminUser} />
      </div>
    );
  } catch (error) {
    console.error('[ADMIN] Error rendering search page:', error);
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Search</h1>
          <p className="text-red-600">
            Error loading search page. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    );
  }
}