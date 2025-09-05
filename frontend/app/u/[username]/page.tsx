import { notFound } from "next/navigation";
import { Metadata } from "next";

// PostgreSQL auth - no server client needed for this page
import PublicProfile from "@/components/profile/PublicProfile";

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `${username} - Jewgo`,
    description: `View ${username}'s profile on Jewgo`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  
  // PostgreSQL auth - user page not implemented yet
  return notFound();
}