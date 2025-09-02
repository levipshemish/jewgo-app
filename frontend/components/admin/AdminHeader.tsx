/* eslint-disable no-console */
'use client';

import React from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  Settings, 
  User,
  ChevronDown,
  Clock as ClockIcon
} from 'lucide-react';
import Clock from './Clock';
import NotificationSystem from './NotificationSystem';
import { SignOutButton } from '@/components/auth';
// Local type definition to avoid restricted import warning
interface AdminUser {
  id: string;
  email: string | undefined;
  name: string | null;
  username: string | undefined;
  provider: string;
  avatar_url: string | null;
  providerInfo: {
    name: string;
    icon: string;
    color: string;
    displayName: string;
  };
  createdAt: string | undefined;
  updatedAt: string | undefined;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: string;
  permissions: string[];
  subscriptionTier: string;
  adminRole: string | null;
  roleLevel: number;
  isSuperAdmin: boolean;
}

interface AdminHeaderProps {
  adminUser: AdminUser;
}

export default function AdminHeader({ adminUser }: AdminHeaderProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const segment = segments[i];
      
      // Map segment to readable name
      const nameMap: Record<string, string> = {
        admin: 'Admin',
        restaurants: 'Restaurants',
        database: 'Database',
        reviews: 'Reviews',
        users: 'Users',
        images: 'Images',
        synagogues: 'Synagogues',
        'kosher-places': 'Kosher Places',
        audit: 'Audit Logs',
        settings: 'Settings'
      };
      
      breadcrumbs.push({
        name: nameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath,
        isLast: i === segments.length - 1
      });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {return;}
    
    // Redirect to search results page with query
    window.location.href = `/admin/search?q=${encodeURIComponent(searchQuery.trim())}`;
  };

  // SignOut handled by SignOutButton

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.path} className="flex items-center">
                {index > 0 && (
                  <span className="text-gray-400 mx-2">/</span>
                )}
                <span className={`text-sm ${
                  breadcrumb.isLast 
                    ? 'text-gray-900 font-medium' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                  {breadcrumb.name}
                </span>
              </div>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
            </form>

            {/* Notifications */}
            <NotificationSystem />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {adminUser.name || adminUser.email || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {adminUser.adminRole || 'Admin'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {adminUser.name || adminUser.email || 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {adminUser.adminRole || 'Admin'}
                    </p>
                  </div>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  
                  <div className="border-t border-gray-100">
                    <SignOutButton
                      redirectTo="/auth/signin"
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      variant="link"
                    >
                      Sign Out
                    </SignOutButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current time and status */}
      <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-3 w-3" />
              <Clock />
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>System Online</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Database: Healthy</span>
            <span>Uptime: 99.9%</span>
          </div>
        </div>
      </div>
    </header>
  );
}
