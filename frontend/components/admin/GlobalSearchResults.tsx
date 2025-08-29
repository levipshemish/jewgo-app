'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  MessageSquare, 
  Users, 
  Image, 
  MapPin,
  Star,
  Search,
  ExternalLink,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { AdminUser } from '@/lib/admin/types';
import { hasPermission } from '@/lib/admin/utils-client';
import { ADMIN_PERMISSIONS } from '@/lib/admin/constants-client';

interface SearchResult {
  id: string;
  type: 'restaurant' | 'review' | 'user' | 'image' | 'synagogue' | 'kosher_place';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  url: string;
  relevance: number;
}

interface GlobalSearchResultsProps {
  query: string;
  adminUser: AdminUser;
}

const SearchResultCard: React.FC<{ result: SearchResult }> = ({ result }) => {
  const getIcon = () => {
    switch (result.type) {
      case 'restaurant': return Building2;
      case 'review': return MessageSquare;
      case 'user': return Users;
      case 'image': return Image;
      case 'synagogue': return MapPin;
      case 'kosher_place': return Star;
      default: return Search;
    }
  };

  const getTypeColor = () => {
    switch (result.type) {
      case 'restaurant': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-purple-100 text-purple-800';
      case 'image': return 'bg-orange-100 text-orange-800';
      case 'synagogue': return 'bg-indigo-100 text-indigo-800';
      case 'kosher_place': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeName = () => {
    switch (result.type) {
      case 'restaurant': return 'Restaurant';
      case 'review': return 'Review';
      case 'user': return 'User';
      case 'image': return 'Image';
      case 'synagogue': return 'Synagogue';
      case 'kosher_place': return 'Kosher Place';
      default: return result.type;
    }
  };

  const Icon = getIcon();

  return (
    <Link href={result.url}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-gray-50 rounded-lg">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor()}`}>
                {getTypeName()}
              </span>
              <div className="flex items-center text-xs text-gray-500">
                <span>Relevance: {Math.round(result.relevance * 100)}%</span>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
              {result.title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {result.description}
            </p>
            
            {result.metadata && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {result.metadata.created_at && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(result.metadata.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {result.metadata.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{result.metadata.email}</span>
                  </div>
                )}
                {result.metadata.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{result.metadata.phone}</span>
                  </div>
                )}
                {result.metadata.status && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    result.metadata.status === 'approved' ? 'bg-green-100 text-green-800' :
                    result.metadata.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    result.metadata.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {result.metadata.status}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
};

export default function GlobalSearchResults({ query, adminUser }: GlobalSearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Mock search function - in a real app, this would call an API
  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!searchQuery.trim()) {return [];}

    // Mock search results based on query
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'restaurant',
        title: 'Kosher Deluxe Restaurant',
        description: 'Premium kosher restaurant serving traditional Jewish cuisine with modern twists. Located in the heart of Manhattan.',
        metadata: {
          created_at: '2024-01-15',
          status: 'approved',
          city: 'New York',
          phone: '(212) 555-0123'
        },
        url: '/admin/database/restaurants?search=kosher+deluxe',
        relevance: 0.95
      },
      {
        id: '2',
        type: 'user',
        title: 'Sarah Cohen',
        description: 'Active user with 25 reviews. Joined 6 months ago. Regular contributor to restaurant reviews.',
        metadata: {
          created_at: '2023-08-10',
          email: 'sarah.cohen@example.com',
          status: 'active'
        },
        url: '/admin/database/users?search=sarah+cohen',
        relevance: 0.88
      },
      {
        id: '3',
        type: 'review',
        title: 'Excellent service at Jerusalem Grill',
        description: 'Amazing food and great atmosphere. The staff was very accommodating and the kosher options were extensive...',
        metadata: {
          created_at: '2024-01-20',
          status: 'approved',
          rating: 5
        },
        url: '/admin/database/reviews?search=jerusalem+grill',
        relevance: 0.82
      },
      {
        id: '4',
        type: 'synagogue',
        title: 'Beth Shalom Synagogue',
        description: 'Orthodox synagogue with active community programs and kosher meal services.',
        metadata: {
          created_at: '2023-12-05',
          phone: '(212) 555-0456',
          status: 'verified'
        },
        url: '/admin/database/synagogues?search=beth+shalom',
        relevance: 0.75
      },
      {
        id: '5',
        type: 'kosher_place',
        title: 'Kosher Market & Deli',
        description: 'Full-service kosher market with fresh meats, baked goods, and prepared foods.',
        metadata: {
          created_at: '2024-01-08',
          status: 'approved',
          category: 'grocery'
        },
        url: '/admin/database/kosher-places?search=kosher+market',
        relevance: 0.71
      }
    ];

    // Filter results based on search query (simple text matching)
    const filtered = mockResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => b.relevance - a.relevance);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const searchResults = await performSearch(query);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setError('An error occurred while searching. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Filter results by type for tabs
  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(result => result.type === activeTab);

  const getTabCounts = () => {
    const counts: Record<string, number> = { all: results.length };
    results.forEach(result => {
      counts[result.type] = (counts[result.type] || 0) + 1;
    });
    return counts;
  };

  const tabCounts = getTabCounts();

  const tabs = [
    { key: 'all', label: 'All', count: tabCounts.all },
    { key: 'restaurant', label: 'Restaurants', count: tabCounts.restaurant || 0 },
    { key: 'user', label: 'Users', count: tabCounts.user || 0 },
    { key: 'review', label: 'Reviews', count: tabCounts.review || 0 },
    { key: 'synagogue', label: 'Synagogues', count: tabCounts.synagogue || 0 },
    { key: 'kosher_place', label: 'Kosher Places', count: tabCounts.kosher_place || 0 },
  ].filter(tab => tab.count > 0 || tab.key === 'all');

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
        <p className="text-gray-600">
          Enter a search term in the header to find restaurants, users, reviews, and more.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex space-x-1 border-b border-gray-200">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-2 bg-gray-200 rounded animate-pulse h-10 w-24"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Search className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Search Error</h3>
          <p>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
      </div>

      {/* Filter Tabs */}
      {tabs.length > 1 && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Search Results */}
      {filteredResults.length > 0 ? (
        <div className="space-y-4">
          {filteredResults.map(result => (
            <SearchResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or use different keywords.
          </p>
        </div>
      )}
    </div>
  );
}