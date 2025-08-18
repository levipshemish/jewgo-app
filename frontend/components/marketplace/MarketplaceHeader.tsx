'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';

interface MarketplaceHeaderProps {
  onSearch?: (query: string) => void;
}

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export default function MarketplaceHeader({ onSearch }: MarketplaceHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            image: session.user.user_metadata?.avatar_url,
          });
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

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            image: session.user.user_metadata?.avatar_url,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
            {user.image ? (
              <img
                src={user.image}
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
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>
    </header>
  );
}
