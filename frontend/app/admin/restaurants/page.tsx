'use client';

import React, { useState, useEffect } from 'react';
import { useAdminCsrf } from '@/lib/admin/hooks';
import { ADMIN_PERMISSIONS } from '@/lib/admin/types';
import { Loader2, Eye, CheckCircle, XCircle, Filter, Search } from 'lucide-react';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone_number: string;
  kosher_category: string;
  certifying_agency: string;
  submission_status: string;
  submission_date: string;
  is_owner_submission: boolean;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_email?: string;
  short_description?: string;
  business_images?: string[];
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface AdminDashboardProps {}

export default function AdminRestaurantsPage({}: AdminDashboardProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending_approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingAction, setProcessingAction] = useState<number | null>(null);
  const [adminUser, setAdminUser] = useState<{ permissions: string[] } | null>(null);
  const csrfToken = useAdminCsrf();

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    ownerSubmissions: 0,
    communitySubmissions: 0,
  });

  useEffect(() => {
    fetchRestaurants();
  }, [filterStatus]);

  useEffect(() => {
    // Fetch current admin user for permission-aware UI
    const fetchAdmin = async () => {
      try {
        const res = await fetch('/api/admin/user');
        if (res.ok) {
          setAdminUser(await res.json());
        }
      } catch {}
    };
    fetchAdmin();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/restaurants?status=${filterStatus}&pageSize=100`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }

      const data = await response.json();
      setRestaurants(data.data || []);
      
      // Calculate statistics
      const total = data.data?.length || 0;
      const pending = data.data?.filter((r: Restaurant) => r.submission_status === 'pending_approval').length || 0;
      const approved = data.data?.filter((r: Restaurant) => r.submission_status === 'approved').length || 0;
      const rejected = data.data?.filter((r: Restaurant) => r.submission_status === 'rejected').length || 0;
      const ownerSubmissions = data.data?.filter((r: Restaurant) => r.is_owner_submission).length || 0;
      const communitySubmissions = total - ownerSubmissions;

      setStats({
        total,
        pending,
        approved,
        rejected,
        ownerSubmissions,
        communitySubmissions,
      });
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (restaurantId: number) => {
    try {
      setProcessingAction(restaurantId);
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve restaurant');
      }

      // Refresh the list
      await fetchRestaurants();
    } catch (error) {
      console.error('Error approving restaurant:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (restaurantId: number) => {
    try {
      setProcessingAction(restaurantId);
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ 
          reason: rejectionReason || 'Rejected by admin'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject restaurant');
      }

      // Refresh the list
      await fetchRestaurants();
      setIsRejectModalOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const openDetailModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsDetailModalOpen(true);
  };

  const openRejectModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsRejectModalOpen(true);
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getSubmissionTypeBadge = (isOwnerSubmission: boolean) => {
    return isOwnerSubmission ? 
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500 text-blue-600">Owner</span> :
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-500 text-gray-600">Community</span>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading restaurants...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Restaurant Submissions Admin</h1>
        <p className="text-muted-foreground">
          Manage restaurant submissions and approval workflow
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Submissions</h3>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Owner Submissions</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.ownerSubmissions}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Community Submissions</h3>
          <p className="text-2xl font-bold text-gray-600">{stats.communitySubmissions}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Search
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Restaurant Submissions ({filteredRestaurants.length})</h3>
        </div>
        <div className="p-6">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No restaurants found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                        {getStatusBadge(restaurant.submission_status)}
                        {getSubmissionTypeBadge(restaurant.is_owner_submission)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {restaurant.address}, {restaurant.city}, {restaurant.state}
                      </p>
                      <p className="text-sm text-gray-600">
                        Phone: {restaurant.phone_number} | {restaurant.kosher_category} | {restaurant.certifying_agency}
                      </p>
                      {restaurant.short_description && (
                        <p className="text-sm">{restaurant.short_description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(restaurant)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1 inline" />
                        View Details
                      </button>
                      
                      {restaurant.submission_status === 'pending_approval' && adminUser?.permissions?.includes(ADMIN_PERMISSIONS.RESTAURANT_APPROVE) && (
                        <>
                          <button
                            onClick={() => handleApprove(restaurant.id)}
                            disabled={processingAction === restaurant.id}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingAction === restaurant.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin inline" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1 inline" />
                            )}
                            Approve
                          </button>
                          
                          <button
                            onClick={() => openRejectModal(restaurant)}
                            disabled={processingAction === restaurant.id}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {processingAction === restaurant.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin inline" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1 inline" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Submitted: {new Date(restaurant.submission_date || restaurant.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Detail Modal */}
      {isDetailModalOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Restaurant Details</h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {selectedRestaurant.name}</p>
                      <p><strong>Address:</strong> {selectedRestaurant.address}</p>
                      <p><strong>City:</strong> {selectedRestaurant.city}</p>
                      <p><strong>State:</strong> {selectedRestaurant.state}</p>
                      <p><strong>Phone:</strong> {selectedRestaurant.phone_number}</p>
                      <p><strong>Kosher Category:</strong> {selectedRestaurant.kosher_category}</p>
                      <p><strong>Certifying Agency:</strong> {selectedRestaurant.certifying_agency}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Submission Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Status:</strong> {getStatusBadge(selectedRestaurant.submission_status)}</p>
                      <p><strong>Type:</strong> {getSubmissionTypeBadge(selectedRestaurant.is_owner_submission)}</p>
                      <p><strong>Submitted:</strong> {new Date(selectedRestaurant.submission_date || selectedRestaurant.created_at).toLocaleString()}</p>
                      {selectedRestaurant.short_description && (
                        <p><strong>Description:</strong> {selectedRestaurant.short_description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedRestaurant.is_owner_submission && (
                  <div>
                    <h3 className="font-semibold mb-2">Owner Information</h3>
                    <div className="space-y-2 text-sm">
                      {selectedRestaurant.owner_name && <p><strong>Owner Name:</strong> {selectedRestaurant.owner_name}</p>}
                      {selectedRestaurant.owner_email && <p><strong>Owner Email:</strong> {selectedRestaurant.owner_email}</p>}
                      {selectedRestaurant.owner_phone && <p><strong>Owner Phone:</strong> {selectedRestaurant.owner_phone}</p>}
                      {selectedRestaurant.business_email && <p><strong>Business Email:</strong> {selectedRestaurant.business_email}</p>}
                    </div>
                  </div>
                )}
                
                {selectedRestaurant.business_images && selectedRestaurant.business_images.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Business Images</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRestaurant.business_images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Business image ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRestaurant.rejection_reason && (
                  <div>
                    <h3 className="font-semibold mb-2">Rejection Reason</h3>
                    <p className="text-sm text-red-600">{selectedRestaurant.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">Reject Restaurant Submission</h2>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting {selectedRestaurant.name}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter the reason for rejection..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedRestaurant && handleReject(selectedRestaurant.id)}
                  disabled={!rejectionReason.trim() || processingAction === selectedRestaurant.id}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {processingAction === selectedRestaurant.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin inline" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1 inline" />
                  )}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
