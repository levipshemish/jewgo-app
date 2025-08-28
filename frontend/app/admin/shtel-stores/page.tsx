'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import { 
  Store, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  BarChart3,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  Star,
  DollarSign,
  Users,
  Package,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  Award
} from 'lucide-react';

// Types
interface StoreData {
  store_id: string;
  store_name: string;
  owner_name: string;
  owner_email: string;
  city: string;
  state: string;
  store_type: string;
  store_category: string;
  plan_type: string;
  is_active: boolean;
  is_approved: boolean;
  status: string;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

interface StoreAnalytics {
  store_id: string;
  period: string;
  revenue: number;
  orders: number;
  average_order_value: number;
  total_customers: number;
  active_products: number;
  featured_products: number;
  low_stock_products: number;
  total_products: number;
  page_views: number;
  unique_visitors: number;
  conversion_rate: number;
}

const AdminShtelStores: React.FC = () => {
  const router = useRouter();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);

  // Mock data for development
  const mockStores: StoreData[] = [
    {
      store_id: '1',
      store_name: 'Kosher Corner Market',
      owner_name: 'Sarah Cohen',
      owner_email: 'sarah.cohen@email.com',
      city: 'Miami',
      state: 'FL',
      store_type: 'Grocery',
      store_category: 'Kosher Foods',
      plan_type: 'premium',
      is_active: true,
      is_approved: true,
      status: 'active',
      total_products: 45,
      total_orders: 127,
      total_revenue: 15420.50,
      average_rating: 4.7,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-08-28T15:30:00Z'
    },
    {
      store_id: '2',
      store_name: 'Judaica World',
      owner_name: 'David Levy',
      owner_email: 'david.levy@email.com',
      city: 'Miami',
      state: 'FL',
      store_type: 'Judaica',
      store_category: 'Religious Items',
      plan_type: 'basic',
      is_active: true,
      is_approved: false,
      status: 'pending',
      total_products: 12,
      total_orders: 0,
      total_revenue: 0,
      average_rating: 0,
      created_at: '2025-08-25T14:00:00Z',
      updated_at: '2025-08-25T14:00:00Z'
    },
    {
      store_id: '3',
      store_name: 'Gemach Community',
      owner_name: 'Rachel Green',
      owner_email: 'rachel.green@email.com',
      city: 'Miami',
      state: 'FL',
      store_type: 'Community',
      store_category: 'Gemach',
      plan_type: 'free',
      is_active: false,
      is_approved: true,
      status: 'suspended',
      total_products: 8,
      total_orders: 23,
      total_revenue: 0,
      average_rating: 4.9,
      created_at: '2025-07-10T09:00:00Z',
      updated_at: '2025-08-20T16:45:00Z'
    }
  ];

  const mockAnalytics: StoreAnalytics = {
    store_id: '1',
    period: 'total',
    revenue: 15420.50,
    orders: 127,
    average_order_value: 121.42,
    total_customers: 89,
    active_products: 42,
    featured_products: 8,
    low_stock_products: 3,
    total_products: 45,
    page_views: 1250,
    unique_visitors: 450,
    conversion_rate: 28.2
  };

  useEffect(() => {
    // Load stores data
    const loadStoresData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        setStores(mockStores);
        setError(null);
      } catch (err) {
        setError('Failed to load stores data');
        console.error('Error loading stores data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStoresData();
  }, []);

  const handleApproveStore = async (storeId: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Approving store:', storeId);
      
      // Update local state
      setStores(prevStores => 
        prevStores.map(store => 
          store.store_id === storeId 
            ? { ...store, is_approved: true, status: 'active' }
            : store
        )
      );
      
      alert('Store approved successfully');
    } catch (err) {
      console.error('Error approving store:', err);
      alert('Failed to approve store');
    }
  };

  const handleSuspendStore = async (storeId: string, reason: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Suspending store:', storeId, 'Reason:', reason);
      
      // Update local state
      setStores(prevStores => 
        prevStores.map(store => 
          store.store_id === storeId 
            ? { ...store, is_active: false, status: 'suspended' }
            : store
        )
      );
      
      alert('Store suspended successfully');
    } catch (err) {
      console.error('Error suspending store:', err);
      alert('Failed to suspend store');
    }
  };

  const handleViewAnalytics = async (storeId: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Loading analytics for store:', storeId);
      
      // Set mock analytics
      setAnalytics(mockAnalytics);
      setShowAnalytics(true);
    } catch (err) {
      console.error('Error loading analytics:', err);
      alert('Failed to load analytics');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'suspended':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'premium':
        return 'text-purple-600 bg-purple-100';
      case 'basic':
        return 'text-blue-600 bg-blue-100';
      case 'free':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Admin - Shtel Stores" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading stores...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Admin - Shtel Stores" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin - Shtel Stores" />
      
      {/* Analytics Modal */}
      {showAnalytics && analytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Store Analytics</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-lg font-semibold">${analytics.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Package className="w-6 h-6 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-lg font-semibold">{analytics.orders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-purple-600" />
                  <div className="ml-2">
                    <p className="text-sm text-gray-600">Customers</p>
                    <p className="text-lg font-semibold">{analytics.total_customers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Star className="w-6 h-6 text-orange-600" />
                  <div className="ml-2">
                    <p className="text-sm text-gray-600">Products</p>
                    <p className="text-lg font-semibold">{analytics.total_products}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Performance Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Average Order Value:</span>
                    <span>${analytics.average_order_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Rate:</span>
                    <span>{analytics.conversion_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Page Views:</span>
                    <span>{analytics.page_views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Visitors:</span>
                    <span>{analytics.unique_visitors.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Product Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Active Products:</span>
                    <span>{analytics.active_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Featured Products:</span>
                    <span>{analytics.featured_products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Stock Products:</span>
                    <span className="text-red-600">{analytics.low_stock_products}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Shtel Store Management</h1>
          <p className="text-gray-600">Manage Jewish community marketplace stores</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stores, owners, or cities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stores</p>
                <p className="text-2xl font-bold text-gray-900">{stores.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Stores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.filter(s => s.is_active && s.is_approved).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.filter(s => !s.is_approved).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.filter(s => s.status === 'suspended').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStores.map((store) => (
                  <tr key={store.store_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{store.store_name}</div>
                          <div className="text-sm text-gray-500">{store.store_type} • {store.store_category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{store.owner_name}</div>
                        <div className="text-sm text-gray-500">{store.owner_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1" />
                        {store.city}, {store.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(store.plan_type)}`}>
                        {store.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(store.status)}`}>
                        {store.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>Products: {store.total_products}</div>
                        <div>Orders: {store.total_orders}</div>
                        <div>Revenue: ${store.total_revenue.toLocaleString()}</div>
                        {store.average_rating > 0 && (
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 mr-1" />
                            {store.average_rating}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAnalytics(store.store_id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        
                        {!store.is_approved && (
                          <button
                            onClick={() => handleApproveStore(store.store_id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve Store"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {store.is_active && store.is_approved && (
                          <button
                            onClick={() => handleSuspendStore(store.store_id, 'Admin action')}
                            className="text-red-600 hover:text-red-900"
                            title="Suspend Store"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => router.push(`/admin/shtel-stores/${store.store_id}`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No stores found matching your criteria</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AdminShtelStores;
