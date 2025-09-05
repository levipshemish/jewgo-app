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
  User,
  BarChart3,
  Shield,
  ShoppingBag,
  Package,
  ShoppingCart,
  Mail
} from 'lucide-react';
import { SignOutButton } from '@/components/auth';
// Local type definition to avoid restricted import warning
interface AdminUser {
  id: string;
  email: string | undefined;
  name?: string | null | undefined;
  username?: string | undefined;
  provider?: string;
  avatar_url?: string | null;
  providerInfo?: {
    provider: string;
    displayName: string;
    icon: string;
  };
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  role?: string;
  permissions: string[];
  subscriptionTier?: string;
  adminRole: string | null;
  roleLevel: number;
  isSuperAdmin: boolean;
}

// Local permission constants
const ADMIN_PERMISSIONS = {
  ANALYTICS_VIEW: 'analytics:view',
  RESTAURANT_APPROVE: 'restaurant:approve',
  REVIEW_MODERATE: 'review:moderate',
  RESTAURANT_VIEW: 'restaurant:view',
  REVIEW_VIEW: 'review:view',
  USER_VIEW: 'user:view',
  IMAGE_VIEW: 'image:view',
  SYNAGOGUE_VIEW: 'synagogue:view',
  KOSHER_PLACE_VIEW: 'kosher_place:view',
  AUDIT_VIEW: 'audit:view',
  SYSTEM_SETTINGS: 'system:settings',
  STORE_VIEW: 'store:view',
  STORE_PRODUCTS: 'store:products',
  STORE_ORDERS: 'store:orders',
  STORE_MESSAGES: 'store:messages',
  STORE_ANALYTICS: 'store:analytics'
} as const;

// Local permission check function
const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

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
        { title: 'Overview', href: '/admin', icon: LayoutDashboard },
        { 
          title: 'Analytics', 
          href: '/admin/analytics', 
          icon: BarChart3,
          permission: ADMIN_PERMISSIONS.ANALYTICS_VIEW
        }
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
      section: 'store',
      title: 'Store Management',
      icon: ShoppingBag,
      items: [
        { 
          title: 'Store Dashboard', 
          href: '/shtel/dashboard', 
          icon: LayoutDashboard,
          permission: ADMIN_PERMISSIONS.STORE_VIEW
        },
        { 
          title: 'Products', 
          href: '/admin/store/products', 
          icon: Package,
          permission: ADMIN_PERMISSIONS.STORE_PRODUCTS
        },
        { 
          title: 'Orders', 
          href: '/admin/store/orders', 
          icon: ShoppingCart,
          permission: ADMIN_PERMISSIONS.STORE_ORDERS
        },
        { 
          title: 'Messages', 
          href: '/admin/store/messages', 
          icon: Mail,
          permission: ADMIN_PERMISSIONS.STORE_MESSAGES
        },
        { 
          title: 'Store Analytics', 
          href: '/admin/store/analytics', 
          icon: BarChart3,
          permission: ADMIN_PERMISSIONS.STORE_ANALYTICS
        }
      ]
    },
    {
      section: 'security',
      title: 'Security',
      icon: Shield,
      items: [
        { 
          title: 'Role Management', 
          href: '/admin/security/roles', 
          icon: Users,
          requiresSuperAdmin: true
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
    items: section.items.filter(item => {
      // Check for super admin requirement
      if ('requiresSuperAdmin' in item && (item as any).requiresSuperAdmin) {
        return adminUser.isSuperAdmin;
      }
      // Check for permission requirement
      if ('permission' in item) {
        return hasPermission(adminUser.permissions, (item as any).permission);
      }
      // No restrictions, show the item
      return true;
    })
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
              {adminUser.name || adminUser.email || 'Admin User'}
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
