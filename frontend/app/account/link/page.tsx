import { redirect } from 'next/navigation';
import { oauthLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LinkAccountPage() {
  // PostgreSQL auth doesn't support account linking in the same way as Supabase
  // Redirect to profile page for now
  oauthLogger.info('Account linking page accessed - redirecting to profile');
  redirect('/profile');
}