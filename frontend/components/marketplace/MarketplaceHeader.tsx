'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MarketplaceHeaderProps {
  onSearch?: (query: string) => void;
}

export default function MarketplaceHeader({ onSearch }: MarketplaceHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Mock user data - replace with actual auth context
  const user = null; // Replace with actual user from auth context

  return (
    <header className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
      {user ? (
        <Link href="/marketplace/profile">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-green-400 font-bold text-xl">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </Link>
      ) : (
        <Link href="/marketplace/login">
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
