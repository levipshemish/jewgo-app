/**
 * Order API Client
 * Provides order management functionality including order creation, retrieval, and status updates
 */

import { OrderFormData as _OrderFormData, OrderItem as _OrderItem } from '@/lib/types/order';

export interface CreateOrderRequest {
  restaurant_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address?: string;
  delivery_instructions?: string;
  order_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'card' | 'online';
  estimated_time?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    special_instructions?: string;
  }>;
}

export interface CreateOrderResponse {
  order: {
    id: number;
    order_number: string;
    restaurant_id: number;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    delivery_address?: string;
    delivery_instructions?: string;
    order_type: 'pickup' | 'delivery';
    payment_method: 'cash' | 'card' | 'online';
    estimated_time?: string;
    subtotal: number;
    tax: number;
    delivery_fee: number;
    total: number;
    status: string;
    created_at: string;
    items: Array<{
      id: number;
      item_id: string;
      name: string;
      price: number;
      quantity: number;
      special_instructions?: string;
      subtotal: number;
    }>;
  };
  message: string;
}

export interface OrderDetails {
  id: number;
  order_number: string;
  restaurant_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address?: string;
  delivery_instructions?: string;
  order_type: 'pickup' | 'delivery';
  payment_method: 'cash' | 'card' | 'online';
  estimated_time?: string;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: number;
    item_id: string;
    name: string;
    price: number;
    quantity: number;
    special_instructions?: string;
    subtotal: number;
  }>;
}

export interface RestaurantOrdersResponse {
  orders: OrderDetails[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

class OrderAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create order: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<OrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders/${orderId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get order: ${response.status}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders/number/${orderNumber}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get order: ${response.status}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Get orders for a specific restaurant
   */
  async getRestaurantOrders(
    restaurantId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<RestaurantOrdersResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v4/orders/restaurant/${restaurantId}?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get restaurant orders: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting restaurant orders:', error);
      throw error;
    }
  }

  /**
   * Get orders for a specific customer
   */
  async getCustomerOrders(
    customerEmail: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RestaurantOrdersResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v4/orders/customer/${encodeURIComponent(customerEmail)}?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get customer orders: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting customer orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string): Promise<OrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update order status: ${response.status}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number, reason?: string): Promise<OrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to cancel order: ${response.status}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Track order status
   */
  async trackOrder(orderNumber: string): Promise<OrderDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v4/orders/track/${orderNumber}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to track order: ${response.status}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const orderAPI = new OrderAPI();
