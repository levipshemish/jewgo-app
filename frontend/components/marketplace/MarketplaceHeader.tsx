'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { postgresAuth } from '@/lib/auth/postgres-auth';
import { type AuthUser } from '@/lib/auth/postgres-auth';

interface MarketplaceHeaderProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export default function MarketplaceHeader({ onSearch }: MarketplaceHeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (postgresAuth.isAuthenticated()) {
          const profile = await postgresAuth.getProfile();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up periodic auth checks since we don't have real-time subscriptions
    const interval = setInterval(checkAuth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        router.push(`/marketplace/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  if (loading) {
    return (
      <header className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
        <form className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="What do you want to find?"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            disabled
          />
        </form>
      </header>
    );
  }

  return (
    <header className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
      {user ? (
        <Link href="/profile">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-green-400 font-bold text-xl">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </Link>
      ) : (
        <Link href="/auth/signin">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-green-400 font-bold text-xl">G</span>
          </div>
        </Link>
      )}
      <form onSubmit={handleSearch} className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="What do you want to find?"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
        />
      </form>
    </header>
  );
}
