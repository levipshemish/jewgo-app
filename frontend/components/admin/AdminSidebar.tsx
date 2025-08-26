'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  MessageSquare, 
  Users, 
  Image, 
  MapPin, 
  Star,
  Settings,
  Activity,
  ChevronDown,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { AdminUser, hasPermission, ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { SignOutButton } from '@/components/auth';

interface AdminSidebarProps {
  adminUser: AdminUser;
}

export default function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigationItems = [
    {
      section: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        { title: 'Overview', href: '/admin', icon: LayoutDashboard }
      ]
    },
    {
      section: 'submissions',
      title: 'Submission Management',
      icon: Building2,
      items: [
        { 
          title: 'Restaurant Submissions', 
          href: '/admin/restaurants', 
          icon: Building2,
          permission: ADMIN_PERMISSIONS.RESTAURANT_APPROVE
        },
        { 
          title: 'Review Moderation', 
          href: '/admin/database/reviews?status=pending', 
          icon: MessageSquare,
          permission: ADMIN_PERMISSIONS.REVIEW_MODERATE
        }
      ]
    },
    {
      section: 'database',
      title: 'Database Management',
      icon: Settings,
      items: [
        { 
          title: 'Restaurants', 
          href: '/admin/database/restaurants', 
          icon: Building2,
          permission: ADMIN_PERMISSIONS.RESTAURANT_VIEW
        },
        { 
          title: 'Reviews', 
          href: '/admin/database/reviews', 
          icon: MessageSquare,
          permission: ADMIN_PERMISSIONS.REVIEW_VIEW
        },
        { 
          title: 'Users', 
          href: '/admin/database/users', 
          icon: Users,
          permission: ADMIN_PERMISSIONS.USER_VIEW
        },
        { 
          title: 'Images', 
          href: '/admin/database/images', 
          icon: Image,
          permission: ADMIN_PERMISSIONS.IMAGE_VIEW
        },
        { 
          title: 'Synagogues', 
          href: '/admin/database/synagogues', 
          icon: MapPin,
          permission: ADMIN_PERMISSIONS.SYNAGOGUE_VIEW
        },
        { 
          title: 'Kosher Places', 
          href: '/admin/database/kosher-places', 
          icon: Star,
          permission: ADMIN_PERMISSIONS.KOSHER_PLACE_VIEW
        }
      ]
    },
    {
      section: 'system',
      title: 'System Administration',
      icon: Settings,
      items: [
        { 
          title: 'Audit Logs', 
          href: '/admin/audit', 
          icon: Activity,
          permission: ADMIN_PERMISSIONS.AUDIT_VIEW
        },
        { 
          title: 'Settings', 
          href: '/admin/settings', 
          icon: Settings,
          permission: ADMIN_PERMISSIONS.SYSTEM_SETTINGS
        }
      ]
    }
  ];

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.map(section => ({
    ...section,
    items: section.items.filter(item => 
      !('permission' in item) || hasPermission(adminUser, (item as any).permission)
    )
  })).filter(section => section.items.length > 0); // Remove sections with no visible items

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  // SignOut handled by SignOutButton

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">JewGo Admin</h1>
            <p className="text-xs text-gray-500">Administration Panel</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {adminUser.name || adminUser.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {adminUser.adminRole || 'Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {filteredNavigationItems.map((section) => (
          <div key={section.section}>
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="flex items-center space-x-2">
                <section.icon className="h-4 w-4" />
                <span>{section.title}</span>
              </div>
              {expandedSections.includes(section.section) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {expandedSections.includes(section.section) && (
              <div className="ml-6 mt-1 space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 p-2 text-sm rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <SignOutButton
          redirectTo="/auth/signin"
          className="w-full flex items-center space-x-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <span className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Sign Out</span>
        </SignOutButton>
      </div>
    </div>
  );
}
