'use client';

import { ShoppingCart, Plus, Minus, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import { LoadingButton } from '@/components/ui/LoadingStates';
import { Restaurant } from '@/lib/types/restaurant';
import { validatePhone } from '@/lib/utils/formValidation';
import { orderAPI } from '@/lib/api/orders';
import { OrderFormData, OrderItem, OrderConfirmation } from '@/lib/types/order';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import OrderTracking from './OrderTracking';

// Using types from @/lib/types/order

interface OrderFormProps {
  restaurant: Restaurant;
  onOrderSubmit?: (order: OrderFormData & { items: OrderItem[] }) => Promise<void>;
  onClose: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  restaurant, onOrderSubmit, onClose, }) => {
  const { trackEvent } = useAnalytics();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    deliveryInstructions: '',
    orderType: 'pickup',
    paymentMethod: 'cash',
    estimatedTime: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // Mock menu items - in a real app, this would come from the restaurant data
  const menuItems = [
    { id: '1', name: 'Kosher Burger', price: 15.99, category: 'Main Course' },
    { id: '2', name: 'Falafel Wrap', price: 12.99, category: 'Main Course' },
    { id: '3', name: 'Hummus Plate', price: 8.99, category: 'Appetizer' },
    { id: '4', name: 'Israeli Salad', price: 6.99, category: 'Side' },
    { id: '5', name: 'Baklava', price: 4.99, category: 'Dessert' },
  ];

  const addItemToOrder = (item: typeof menuItems[0]): void => {
    setOrderItems(prev => {
      const existingItem = prev.find(orderItem => orderItem.id === item.id);
      if (existingItem) {
        return prev.map(orderItem =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        );
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1,
        specialInstructions: ''
      }];
    });
  };

  const incrementItemQuantity = (itemId: string): void => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const removeItemFromOrder = (itemId: string): void => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.id !== itemId);
    });
  };

  const updateItemInstructions = (itemId: string, instructions: string): void => {
    setOrderItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.customerName.trim()) {
      newErrors['customerName'] = 'Name is required';
    }

    if (!formData.customerPhone.trim()) {
      newErrors['customerPhone'] = 'Phone number is required';
    } else {
      const phoneError = validatePhone(formData.customerPhone);
      if (phoneError) {
        newErrors['customerPhone'] = phoneError;
      }
    }

    if (formData.orderType === 'delivery' && !formData.deliveryAddress.trim()) {
      newErrors['deliveryAddress'] = 'Delivery address is required';
    }

    if (orderItems.length === 0) {
      newErrors['items'] = 'Please add at least one item to your order';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateSubtotal = (): number => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * 0.08; // 8% tax rate
  };

  const calculateDeliveryFee = (): number => {
    return formData.orderType === 'delivery' ? 3.99 : 0;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax() + calculateDeliveryFee();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Track order submission event
      trackEvent('order_submit_started', {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        order_type: formData.orderType,
        payment_method: formData.paymentMethod,
        item_count: orderItems.length,
        total_amount: calculateTotal(),
      });

      // Prepare order data for backend
      const orderData = {
        restaurant_id: Number(restaurant.id),
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        delivery_address: formData.orderType === 'delivery' ? formData.deliveryAddress : undefined,
        delivery_instructions: formData.deliveryInstructions,
        order_type: formData.orderType,
        payment_method: formData.paymentMethod,
        estimated_time: formData.estimatedTime,
        items: orderItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          special_instructions: item.specialInstructions,
        })),
      };

      // Submit order to backend
      const response = await orderAPI.createOrder(orderData);
      
      // Track successful order submission
      trackEvent('order_submit_success', {
        order_id: response.order.id,
        order_number: response.order.order_number,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        total_amount: response.order.total,
      });

      // Set order confirmation
      const confirmation: OrderConfirmation = {
        orderNumber: response.order.order_number,
        orderId: response.order.id,
        restaurantName: restaurant.name,
        customerName: response.order.customer_name,
        customerEmail: response.order.customer_email,
        customerPhone: response.order.customer_phone,
        orderType: response.order.order_type as 'pickup' | 'delivery',
        deliveryAddress: response.order.delivery_address,
        deliveryInstructions: response.order.delivery_instructions,
        items: response.order.items.map(item => ({
          id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.special_instructions,
        })),
        subtotal: response.order.subtotal,
        tax: response.order.tax,
        deliveryFee: response.order.delivery_fee,
        total: response.order.total,
        estimatedTime: response.order.estimated_time,
        status: response.order.status,
        createdAt: response.order.created_at,
        paymentMethod: response.order.payment_method as 'cash' | 'card' | 'online',
      };

      setOrderConfirmation(confirmation);
      setShowConfirmation(true);

      // Call custom onOrderSubmit if provided
      if (onOrderSubmit) {
        await onOrderSubmit({
          ...formData,
          items: orderItems,
        });
      }
    } catch (error) {
      console.error('Order submission error:', error);
      
      // Track order submission failure
      trackEvent('order_submit_failed', {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      setErrors({
        general: error instanceof Error ? error.message : 'Failed to submit order',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Place Order</h2>
            <p className="text-gray-600">{restaurant.name}</p>
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

        <div className="flex h-[calc(90vh-120px)]">
          {/* Menu Section */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Menu</h3>
            <div className="space-y-4">
              {menuItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.price.toFixed(2)}</p>
                      <button
                        onClick={() => addItemToOrder(item)}
                        className="mt-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Section */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Your Order</h3>
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Add items from the menu to start your order
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => removeItemFromOrder(item.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => incrementItemQuantity(item.id)}
                              className="p-1 text-gray-500 hover:text-green-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItemFromOrder(item.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          placeholder="Special instructions (optional)"
                          value={item.specialInstructions || ''}
                          onChange={(e) => updateItemInstructions(item.id, e.target.value)}
                          className="mt-2 w-full p-2 border rounded-md text-sm"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {errors['items'] && (
                  <p className="text-red-600 text-sm mt-1">{errors['items']}</p>
                )}
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        errors['customerName'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Your full name"
                    />
                    {errors['customerName'] && (
                      <p className="text-red-600 text-sm mt-1">{errors['customerName']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        errors['customerPhone'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                    />
                    {errors['customerPhone'] && (
                      <p className="text-red-600 text-sm mt-1">{errors['customerPhone']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Type
                    </label>
                    <select
                      value={formData.orderType}
                      onChange={(e) => handleInputChange('orderType', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="pickup">Pickup</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                </div>

                {formData.orderType === 'delivery' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      value={formData.deliveryAddress}
                      onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        errors['deliveryAddress'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your delivery address"
                      rows={3}
                    />
                    {errors['deliveryAddress'] && (
                      <p className="text-red-600 text-sm mt-1">{errors['deliveryAddress']}</p>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.deliveryInstructions}
                    onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Any special instructions for your order"
                    rows={2}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8%):</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  {formData.orderType === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>${calculateDeliveryFee().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {errors['general'] && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{errors['general']}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-3">
                <LoadingButton
                  loading={isSubmitting}
                  loadingText="Submitting Order..."
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  onClick={async () => {
                    const mockEvent = {} as React.FormEvent;
                    await handleSubmit(mockEvent);
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Place Order
                </LoadingButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {showConfirmation && orderConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
                <p className="text-gray-600">Your order has been successfully placed</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-800">Order #{orderConfirmation.orderNumber}</p>
                  <p className="text-sm text-green-600">{orderConfirmation.restaurantName}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Customer Details</h4>
                    <p className="text-sm text-gray-600">{orderConfirmation.customerName}</p>
                    <p className="text-sm text-gray-600">{orderConfirmation.customerEmail}</p>
                    <p className="text-sm text-gray-600">{orderConfirmation.customerPhone}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Details</h4>
                    <p className="text-sm text-gray-600">Type: {orderConfirmation.orderType}</p>
                    <p className="text-sm text-gray-600">Payment: {orderConfirmation.paymentMethod}</p>
                    {orderConfirmation.estimatedTime && (
                      <p className="text-sm text-gray-600">Est. Time: {orderConfirmation.estimatedTime}</p>
                    )}
                  </div>
                </div>

                {orderConfirmation.orderType === 'delivery' && orderConfirmation.deliveryAddress && (
                  <div>
                    <h4 className="font-medium text-gray-900">Delivery Address</h4>
                    <p className="text-sm text-gray-600">{orderConfirmation.deliveryAddress}</p>
                    {orderConfirmation.deliveryInstructions && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Instructions:</strong> {orderConfirmation.deliveryInstructions}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {orderConfirmation.items.map((item, index) => (
                      <div key={item.id || `${item.name}-${index}` } className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          {item.specialInstructions && (
                            <p className="text-sm text-gray-500 italic">{item.specialInstructions}</p>
                          )}
                        </div>
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${orderConfirmation.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${orderConfirmation.tax.toFixed(2)}</span>
                    </div>
                    {orderConfirmation.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>${orderConfirmation.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${orderConfirmation.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => setShowOrderTracking(true)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Track Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {showOrderTracking && (
        <OrderTracking onClose={() => setShowOrderTracking(false)} />
      )}
    </div>,
    document.body
  ) : null;
}; 
