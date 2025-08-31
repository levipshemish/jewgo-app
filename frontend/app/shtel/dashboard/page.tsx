'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout';
import { DashboardBottomNavigation } from '@/components/navigation/ui';
import { useSupabase } from '@/lib/contexts/SupabaseContext';
import { useAuth } from '@/hooks/useAuth';
import { appLogger } from '@/lib/utils/logger';
import { useMobileOptimization } from '@/lib/mobile-optimization';

// Dashboard Components
import StoreOverview from '@/components/shtel/dashboard/StoreOverview';
import ProductManagement from '@/components/shtel/dashboard/ProductManagement';
import OrderManagement from '@/components/shtel/dashboard/OrderManagement';
import MessagingCenter from '@/components/shtel/dashboard/MessagingCenter';
import StoreSettings from '@/components/shtel/dashboard/StoreSettings';

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

// Loading component
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Error component
function DashboardError({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Tab component
interface TabProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function Tab({ label, icon, isActive, onClick, badge }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
      {badge && badge > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// Main dashboard component
function ShtelDashboardContent() {
  const router = useRouter();
  const { session, loading: supaLoading } = useSupabase();
  const { user, isAdmin } = useAuth();
  const { isMobile } = useMobileOptimization();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    orders: 0,
    messages: 0,
    products: 0
  });

  // Initialize admin setup
  const initializeForAdmin = () => {
    setStoreData({
      store_id: 'admin',
      store_name: 'Admin Dashboard',
      store_type: 'admin',
      plan_type: 'admin',
      is_approved: true,
      is_admin: true
    });
    setLoading(false);
  };

  // Check authentication
  useEffect(() => {
    // Wait for Supabase session to load before making auth decisions
    if (supaLoading) {
      return;
    }
    
    if (!session) {
      router.push('/auth/signin?redirect=/shtel/dashboard');
      return;
    }
    
    // Check if user is admin using role-based authentication
    if (isAdmin) {
      initializeForAdmin();
      return;
    }
    
    loadStoreData();
  }, [session, router, isAdmin, supaLoading]);

  // Load store data
  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin using role-based authentication
      if (isAdmin) {
        initializeForAdmin();
        return;
      }
      
      // Get store data for current user
      const response = await fetch('/api/shtel/store', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // No store found, redirect to setup
          router.push('/shtel/setup');
          return;
        }
        throw new Error('Failed to load store data');
      }
      
      const data = await response.json();
      setStoreData(data.store);
      
      // Load notifications
      loadNotifications();
      
    } catch (err) {
      appLogger.error('Error loading store data:', { error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      // Check if user is admin using role-based authentication
      if (isAdmin) {
        // Admin users don't need notifications for now
        setNotifications({
          orders: 0,
          messages: 0,
          products: 0
        });
        return;
      }
      
      const [ordersRes, messagesRes] = await Promise.all([
        fetch('/api/shtel/orders?status=pending&limit=1', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        }),
        fetch('/api/shtel/messages?unread=true&limit=1', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
      ]);
      
      const ordersData = await ordersRes.json();
      const messagesData = await messagesRes.json();
      
      setNotifications({
        orders: ordersData.total || 0,
        messages: messagesData.total || 0,
        products: 0 // Will be updated by ProductManagement component
      });
    } catch (err) {
      appLogger.error('Error loading notifications:', { error: err });
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: undefined },
    { id: 'products', label: 'Products', icon: '📦', badge: notifications.products },
    { id: 'orders', label: 'Orders', icon: '🛒', badge: notifications.orders },
    { id: 'messages', label: 'Messages', icon: '💬', badge: notifications.messages },
    { id: 'settings', label: 'Settings', icon: '⚙️', badge: undefined }
  ];

  // Render tab content
  const renderTabContent = () => {
    if (!storeData) {return null;}
    
    // Check if user is admin using role-based authentication
    if (isAdmin) {
      // Admin users see a simplified dashboard
      switch (activeTab) {
        case 'overview':
          return (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
              <p className="text-gray-600 mb-4">Welcome to the Shtetl Admin Dashboard</p>
              <p className="text-sm text-gray-500">Admin users have access to all store management features.</p>
            </div>
          );
        case 'products':
          return <ProductManagement storeData={storeData} onRefresh={loadStoreData} />;
        case 'orders':
          return <OrderManagement storeData={storeData} onRefresh={loadNotifications} />;
        case 'messages':
          return <MessagingCenter storeData={storeData} onRefresh={loadNotifications} />;
        case 'settings':
          return <StoreSettings storeData={storeData} onRefresh={loadStoreData} />;
        default:
          return (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
              <p className="text-gray-600 mb-4">Welcome to the Shtetl Admin Dashboard</p>
              <p className="text-sm text-gray-500">Admin users have access to all store management features.</p>
            </div>
          );
      }
    }
    
    // Regular store owners
    switch (activeTab) {
      case 'overview':
        return <StoreOverview storeData={storeData} onRefresh={loadStoreData} />;
      case 'products':
        return <ProductManagement storeData={storeData} onRefresh={loadStoreData} />;
      case 'orders':
        return <OrderManagement storeData={storeData} onRefresh={loadNotifications} />;
      case 'messages':
        return <MessagingCenter storeData={storeData} onRefresh={loadNotifications} />;
      case 'settings':
        return <StoreSettings storeData={storeData} onRefresh={loadStoreData} />;
      default:
        return <StoreOverview storeData={storeData} onRefresh={loadStoreData} />;
    }
  };

  // Handle loading state
  if (loading) {
    return <DashboardLoading />;
  }

  // Handle error state
  if (error) {
    return <DashboardError error={error} />;
  }

  // Handle no store data
  if (!storeData) {
    return null; // Will redirect to setup
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader 
        title="Store Dashboard"
        subtitle={storeData.store_name}
        showBackButton={false}
        className="bg-white shadow-sm"
      />
      
      {/* Store Info Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{storeData.store_name}</h1>
              <p className="text-blue-100">
                {storeData.is_admin ? 'Admin Dashboard' : `${storeData.store_type} • ${storeData.plan_type} Plan`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Status</div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                storeData.is_admin 
                  ? 'bg-purple-500 text-white'
                  : storeData.is_approved 
                    ? 'bg-green-500 text-white' 
                    : 'bg-yellow-500 text-white'
              }`}>
                {storeData.is_admin ? 'Admin' : (storeData.is_approved ? 'Approved' : 'Pending Approval')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex ${isMobile ? 'overflow-x-auto space-x-2 py-2' : 'space-x-4 py-4'}`}>
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                badge={tab.badge}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Suspense fallback={<DashboardLoading />}>
          {renderTabContent()}
        </Suspense>
      </div>

      {/* Bottom Navigation */}
      <DashboardBottomNavigation activeTab={activeTab} />
    </div>
  );
}

// Main page component
export default function ShtelDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ShtelDashboardContent />
    </Suspense>
  );
}
