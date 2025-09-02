/**
 * Order Types
 * Defines TypeScript interfaces for order management
 */

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryInstructions: string;
  orderType: 'pickup' | 'delivery';
  paymentMethod: 'cash' | 'card' | 'online';
  estimatedTime: string;
}

export interface OrderSubmissionData extends OrderFormData {
  items: OrderItem[];
}

export interface OrderStatus {
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  timestamp: string;
  message?: string;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  estimatedTime?: string;
  restaurantName: string;
  items: OrderItem[];
  total: number;
  orderType: 'pickup' | 'delivery';
  deliveryAddress?: string;
}

export interface OrderConfirmation {
  orderNumber: string;
  orderId: number;
  restaurantName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryInstructions?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  estimatedTime?: string;
  status: string;
  createdAt: string;
  paymentMethod: 'cash' | 'card' | 'online';
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  available: boolean;
  specialInstructions?: string;
}

export interface RestaurantMenu {
  restaurantId: number;
  restaurantName: string;
  categories: Array<{
    name: string;
    items: MenuItem[];
  }>;
}

export interface OrderValidationError {
  field: string;
  message: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: OrderValidationError[];
}

export interface OrderSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'online';
  description?: string;
  icon?: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  fee: number;
  estimatedTime: string;
  available: boolean;
}

export interface PickupOption {
  id: string;
  name: string;
  estimatedTime: string;
  available: boolean;
}

export interface OrderPreferences {
  defaultPaymentMethod: 'cash' | 'card' | 'online';
  defaultOrderType: 'pickup' | 'delivery';
  saveDeliveryAddress: boolean;
  savePaymentInfo: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}
