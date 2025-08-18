export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: MarketplaceCategory;
  subcategory?: string;
  vendor: MarketplaceVendor;
  images: string[];
  thumbnail: string;
  stock: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  discountPercentage?: number;
  tags: string[];
  specifications?: Record<string, string>;
  shippingInfo?: ShippingInfo;
  rating: number;
  reviewCount: number;
  views?: number;
  timeAgo?: string;
  createdAt: string;
  updatedAt: string;
  expiryDate?: string;
  kosherCertification?: KosherCertification;
  dietaryInfo?: DietaryInfo;
}

export interface MarketplaceVendor {
  id: string;
  name: string;
  description: string;
  logo: string;
  banner?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isPremium: boolean;
  categories: MarketplaceCategory[];
  products: MarketplaceProduct[];
  hours: VendorHours;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentCategory?: string;
  subcategories?: MarketplaceCategory[];
  productCount: number;
  isActive: boolean;
  sortOrder: number;
}

export interface MarketplaceOrder {
  id: string;
  userId: string;
  vendorId: string;
  products: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  image: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface ShippingInfo {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  shippingMethods: ShippingMethod[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  isAvailable: boolean;
}

export interface KosherCertification {
  agency: string;
  level: 'glatt' | 'regular' | 'chalav_yisrael' | 'pas_yisrael';
  certificateNumber?: string;
  expiryDate?: string;
  isVerified: boolean;
}

export interface DietaryInfo {
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  allergens: string[];
}

export interface VendorHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  isClosedForShabbat?: boolean;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface MarketplaceFilters {
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  vendors?: string[];
  rating?: number;
  availability?: 'in_stock' | 'out_of_stock' | 'all';
  kosherLevel?: string[];
  dietary?: string[];
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  search?: string;
}

export interface MarketplaceSearchResult {
  products: MarketplaceProduct[];
  vendors: MarketplaceVendor[];
  categories: MarketplaceCategory[];
  totalProducts: number;
  totalVendors: number;
  hasMore: boolean;
}

export interface MarketplaceStats {
  totalProducts: number;
  totalVendors: number;
  totalCategories: number;
  activeOrders: number;
  totalSales: number;
  averageRating: number;
}
