import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { oauthLogger } from '@/lib/utils/logger';
import LinkAccountForm from './LinkAccountForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LinkAccountPage() {
  const supabase = await createServerSupabaseClient();
  
  // Get current user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    oauthLogger.error('User not authenticated for linking page', { error: userError?.message });
    redirect('/auth/signin');
  }

  // Check if user has multiple identities (potential collision)
  if (!user.identities || user.identities.length <= 1) {
    oauthLogger.info('No identity collision detected, redirecting to account', { userId: user.id });
    redirect('/account');
  }

  // Log the collision for debugging
  oauthLogger.info('Identity collision detected, showing linking interface', { 
    userId: user.id, 
    identityCount: user.identities.length,
    providers: user.identities.map((id: any) => id.provider)
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Link Your Accounts
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We found multiple accounts with the same email. Please link them to continue.
          </p>
        </div>
        
        <LinkAccountForm 
          user={user}
          identities={user.identities}
        />
      </div>
    </div>
  );
}
