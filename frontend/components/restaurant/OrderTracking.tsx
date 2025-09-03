'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { orderAPI } from '@/lib/api/orders';
import { OrderDetails } from '@/lib/api/orders';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

interface OrderTrackingProps {
  onClose: () => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ onClose }) => {
  const { trackEvent } = useAnalytics();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async () => {
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOrder(null);

    try {
      // Track order tracking event
      trackEvent('order_tracking_requested', {
        order_number: orderNumber,
      });

      const orderData = await orderAPI.getOrderByNumber(orderNumber);
      setOrder(orderData);

      // Track successful order tracking
      trackEvent('order_tracking_success', {
        order_id: orderData.id,
        order_number: orderData.order_number,
        restaurant_id: orderData.restaurant_id,
        status: orderData.status,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track order';
      setError(errorMessage);

      // Track order tracking failure
      trackEvent('order_tracking_failed', {
        order_number: orderNumber,
        error_message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // const getStatusIcon = (status: string) => {
  //   switch (status.toLowerCase()) {
  //     case 'pending':
  //       return <Clock className="w-5 h-5 text-yellow-500" />;
  //     case 'confirmed':
  //       return <CheckCircle className="w-5 h-5 text-blue-500" />;
  //     case 'preparing':
  //       return <Package className="w-5 h-5 text-orange-500" />;
  //     case 'ready':
  //       return <CheckCircle className="w-5 h-5 text-green-500" />;
  //     case 'delivered':
  //       return <CheckCircle className="w-5 h-5 text-green-600" />;
  //     case 'cancelled':
  //       return <AlertCircle className="w-5 h-5 text-red-500" />;
  //     default:
  //       return <Package className="w-5 h-5 text-yellow-500" />;
  //   }
  // };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Your order has been received and is being reviewed';
      case 'confirmed':
        return 'Your order has been confirmed and is being prepared';
      case 'preparing':
        return 'Your order is being prepared in the kitchen';
      case 'ready':
        return 'Your order is ready for pickup';
      case 'delivered':
        return 'Your order has been delivered';
      case 'cancelled':
        return 'Your order has been cancelled';
      default:
        return 'Order status unknown';
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Track Your Order</h2>
            <p className="text-gray-600">Enter your order number to track your order status</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Order Number Input */}
          <div className="mb-6">
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Order Number
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter your order number (e.g., ORD-12345)"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
              />
              <button
                onClick={handleTrackOrder}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Tracking...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    Track
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Order Details */}
          {order && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Order #{order.order_number}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <p className="text-gray-600">{getStatusDescription(order.status)}</p>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Progress</h4>
                <div className="space-y-4">
                  {['pending', 'confirmed', 'preparing', 'ready', 'delivered'].map((status, index) => {
                    const isCompleted = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'].indexOf(order.status.toLowerCase()) >= index;
                    const isCurrent = order.status.toLowerCase() === status;
                    
                    return (
                      <div key={status} className="flex items-center">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-blue-500' : 'bg-gray-300'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div className={`ml-4 flex-1 ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                          <p className="capitalize">{status}</p>
                          {isCurrent && (
                            <p className="text-sm text-blue-500">Current Status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {order.order_type}</p>
                    <p><span className="font-medium">Payment:</span> {order.payment_method}</p>
                    {order.estimated_time && (
                      <p><span className="font-medium">Est. Time:</span> {order.estimated_time}</p>
                    )}
                    <p><span className="font-medium">Created:</span> {new Date(order.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {order.order_type === 'delivery' && order.delivery_address && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Delivery Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                        <p className="text-gray-600">{order.delivery_address}</p>
                      </div>
                      {order.delivery_instructions && (
                        <p className="text-gray-600">
                          <span className="font-medium">Instructions:</span> {order.delivery_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        {item.special_instructions && (
                          <p className="text-sm text-gray-500 italic">{item.special_instructions}</p>
                        )}
                      </div>
                      <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>${order.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement order cancellation
                    alert('Order cancellation will be implemented next!');
                  }}
                  className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
};

export default OrderTracking;
