import { notFound } from "next/navigation";
import { Metadata } from "next";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import PublicProfile from "@/components/profile/PublicProfile";

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

/**
 * Generate metadata for the public profile page
 */
export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const usernameLower = username.toLowerCase();
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, location, created_at')
      .ilike('username', usernameLower)
      .single();

    if (error || !profile) {
      return {
        title: 'Profile Not Found | JewGo',
        description: 'The requested profile could not be found.',
        robots: 'noindex, nofollow',
      };
    }

    const displayName = profile.display_name;
    const bio = profile.bio || '';
    const location = profile.location || '';
    const avatarUrl = profile.avatar_url;
    
    // Create description from bio or default
    const description = bio 
      ? `${displayName} on JewGo: ${bio.substring(0, 150)}${bio.length > 150 ? '...' : ''}`
      : `View ${displayName}'s profile on JewGo${location ? ` from ${location}` : ''}`;

    return {
      title: `${displayName} | JewGo`,
      description,
      openGraph: {
        title: `${displayName} | JewGo`,
        description,
        type: 'profile',
        images: avatarUrl ? [
          {
            url: avatarUrl,
            width: 400,
            height: 400,
            alt: `${displayName}'s profile picture`,
          }
        ] : undefined,
        siteName: 'JewGo',
      },
      twitter: {
        card: 'summary',
        title: `${displayName} | JewGo`,
        description,
        images: avatarUrl ? [avatarUrl] : undefined,
      },
      alternates: {
        canonical: `https://jewgo.app/u/${usernameLower}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for profile:', error);
    return {
      title: 'Profile | JewGo',
      description: 'View user profile on JewGo',
    };
  }
}

/**
 * Public profile page component
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const usernameLower = username.toLowerCase();
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get profile data with case-insensitive username lookup
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        location,
        website,
        date_of_birth,
        preferences,
        created_at,
        updated_at
      `)
      .ilike('username', usernameLower)
      .single();

    if (error || !profile) {
      notFound();
    }

    // Get basic stats (stubbed for now)
    const stats = await getProfileStats(profile.id);

    return (
      <PublicProfile 
        profile={profile} 
        stats={stats}
        username={usernameLower}
      />
    );
  } catch (error) {
    console.error('Error loading public profile:', error);
    notFound();
  }
}

/**
 * Get basic profile statistics
 * This is stubbed for now but can be expanded with real data
 */
async function getProfileStats(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get review count
    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');

    // Get favorite restaurants count
    const { count: favoriteCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get member since date
    const memberSince = new Date().toISOString().split('T')[0]; // Stubbed for now

    return {
      reviewCount: reviewCount || 0,
      favoriteCount: favoriteCount || 0,
      memberSince,
      // Additional stats can be added here
      restaurantsVisited: Math.floor(Math.random() * 50) + 5, // Stubbed
      helpfulReviews: Math.floor(Math.random() * 20) + 1, // Stubbed
    };
  } catch (error) {
    console.error('Error getting profile stats:', error);
    return {
      reviewCount: 0,
      favoriteCount: 0,
      memberSince: new Date().toISOString().split('T')[0],
      restaurantsVisited: 0,
      helpfulReviews: 0,
    };
  }
}
