import { notFound } from "next/navigation";
import { Metadata } from "next";

// PostgreSQL auth - no server client needed for this page
// import PublicProfile from "@/components/profile/PublicProfile"; // TODO: Implement public profile

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username: _username } = await params; // TODO: Use username
  
  return {
    title: `${_username} - Jewgo`,
    description: `View ${_username}'s profile on Jewgo`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username: _username } = await params; // TODO: Use username
  
  // PostgreSQL auth - user page not implemented yet
  return notFound();
}