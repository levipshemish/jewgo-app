import { 
  MarketplaceProduct, 
  MarketplaceVendor, 
  MarketplaceCategory, 
  MarketplaceOrder,
  MarketplaceFilters,
  MarketplaceSearchResult,
  MarketplaceStats
} from '@/lib/types/marketplace';

export class MarketplaceAPI {
  private static baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private static apiVersion = 'v4';

  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api/${this.apiVersion}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Products
  static async getProducts(filters?: MarketplaceFilters): Promise<MarketplaceProduct[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              queryParams.append(key, JSON.stringify(value));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const endpoint = `/marketplace/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await this.makeRequest<{ products: MarketplaceProduct[] }>(endpoint);
      return data.products;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return this.getMockProducts();
    }
  }

  static async getProduct(id: string): Promise<MarketplaceProduct> {
    try {
      const data = await this.makeRequest<{ product: MarketplaceProduct }>(`/marketplace/products/${id}`);
      return data.product;
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return this.getMockProduct(id);
    }
  }

  static async getFeaturedProducts(): Promise<MarketplaceProduct[]> {
    try {
      const data = await this.makeRequest<{ products: MarketplaceProduct[] }>('/marketplace/products/featured');
      return data.products;
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
      return this.getMockFeaturedProducts();
    }
  }

  // Vendors
  static async getVendors(): Promise<MarketplaceVendor[]> {
    try {
      const data = await this.makeRequest<{ vendors: MarketplaceVendor[] }>('/marketplace/vendors');
      return data.vendors;
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      return this.getMockVendors();
    }
  }

  static async getVendor(id: string): Promise<MarketplaceVendor> {
    try {
      const data = await this.makeRequest<{ vendor: MarketplaceVendor }>(`/marketplace/vendors/${id}`);
      return data.vendor;
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      return this.getMockVendor(id);
    }
  }

  static async getVendorProducts(vendorId: string): Promise<MarketplaceProduct[]> {
    try {
      const data = await this.makeRequest<{ products: MarketplaceProduct[] }>(`/marketplace/vendors/${vendorId}/products`);
      return data.products;
    } catch (error) {
      console.error('Failed to fetch vendor products:', error);
      return this.getMockVendorProducts(vendorId);
    }
  }

  // Categories
  static async getCategories(): Promise<MarketplaceCategory[]> {
    try {
      const data = await this.makeRequest<{ categories: MarketplaceCategory[] }>('/marketplace/categories');
      return data.categories;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return this.getMockCategories();
    }
  }

  static async getCategory(id: string): Promise<MarketplaceCategory> {
    try {
      const data = await this.makeRequest<{ category: MarketplaceCategory }>(`/marketplace/categories/${id}`);
      return data.category;
    } catch (error) {
      console.error('Failed to fetch category:', error);
      return this.getMockCategory(id);
    }
  }

  static async getCategoryProducts(categoryId: string): Promise<MarketplaceProduct[]> {
    try {
      const data = await this.makeRequest<{ products: MarketplaceProduct[] }>(`/marketplace/categories/${categoryId}/products`);
      return data.products;
    } catch (error) {
      console.error('Failed to fetch category products:', error);
      return this.getMockCategoryProducts(categoryId);
    }
  }

  // Search
  static async search(query: string, filters?: MarketplaceFilters): Promise<MarketplaceSearchResult> {
    try {
      const searchParams = new URLSearchParams({ q: query });
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              searchParams.append(key, JSON.stringify(value));
            } else {
              searchParams.append(key, String(value));
            }
          }
        });
      }

      const endpoint = `/marketplace/search?${searchParams.toString()}`;
      const data = await this.makeRequest<MarketplaceSearchResult>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to search marketplace:', error);
      return this.getMockSearchResult(query);
    }
  }

  // Orders
  static async createOrder(orderData: Partial<MarketplaceOrder>): Promise<MarketplaceOrder> {
    try {
      const data = await this.makeRequest<{ order: MarketplaceOrder }>('/marketplace/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      return data.order;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  static async getOrders(): Promise<MarketplaceOrder[]> {
    try {
      const data = await this.makeRequest<{ orders: MarketplaceOrder[] }>('/marketplace/orders');
      return data.orders;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      return this.getMockOrders();
    }
  }

  static async getOrder(id: string): Promise<MarketplaceOrder> {
    try {
      const data = await this.makeRequest<{ order: MarketplaceOrder }>(`/marketplace/orders/${id}`);
      return data.order;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return this.getMockOrder(id);
    }
  }

  // Stats
  static async getStats(): Promise<MarketplaceStats> {
    try {
      const data = await this.makeRequest<{ stats: MarketplaceStats }>('/marketplace/stats');
      return data.stats;
    } catch (error) {
      console.error('Failed to fetch marketplace stats:', error);
      return this.getMockStats();
    }
  }

  // Mock Data Methods
  private static getMockProducts(): MarketplaceProduct[] {
    return [
      {
        id: '1',
        name: 'Glatt Kosher Beef Brisket',
        description: 'Premium quality beef brisket, perfect for Shabbat meals',
        price: 45.99,
        originalPrice: 59.99,
        currency: 'USD',
        category: this.getMockCategories()[0],
        vendor: this.getMockVendors()[0],
        images: ['/images/products/brisket-1.jpg', '/images/products/brisket-2.jpg'],
        thumbnail: '/images/products/brisket-thumb.jpg',
        stock: 15,
        isAvailable: true,
        isFeatured: true,
        isOnSale: true,
        discountPercentage: 23,
        tags: ['meat', 'brisket', 'shabbat', 'glatt'],
        rating: 4.8,
        reviewCount: 127,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        kosherCertification: {
          agency: 'OU',
          level: 'glatt',
          isVerified: true
        }
      },
      {
        id: '2',
        name: 'Challah Bread - Traditional',
        description: 'Fresh-baked traditional challah bread, perfect for Shabbat',
        price: 8.99,
        currency: 'USD',
        category: this.getMockCategories()[1],
        vendor: this.getMockVendors()[1],
        images: ['/images/products/challah-1.jpg'],
        thumbnail: '/images/products/challah-thumb.jpg',
        stock: 50,
        isAvailable: true,
        isFeatured: false,
        isOnSale: false,
        tags: ['bread', 'challah', 'shabbat', 'dairy'],
        rating: 4.9,
        reviewCount: 89,
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-19T16:45:00Z',
        kosherCertification: {
          agency: 'Kof-K',
          level: 'pas_yisrael',
          isVerified: true
        }
      }
    ];
  }

  private static getMockFeaturedProducts(): MarketplaceProduct[] {
    return this.getMockProducts().filter(product => product.isFeatured);
  }

  private static getMockProduct(id: string): MarketplaceProduct {
    return this.getMockProducts().find(p => p.id === id) || this.getMockProducts()[0];
  }

  private static getMockVendors(): MarketplaceVendor[] {
    return [
      {
        id: '1',
        name: 'Kosher Delights Market',
        description: 'Premium kosher meats and deli products',
        logo: '/images/vendors/kosher-delights-logo.jpg',
        address: '123 Main Street',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        phone: '(305) 555-0123',
        email: 'info@kosherdelights.com',
        website: 'https://kosherdelights.com',
        rating: 4.7,
        reviewCount: 234,
        isVerified: true,
        isPremium: true,
        categories: this.getMockCategories().slice(0, 2),
        products: [],
        hours: this.getMockVendorHours(),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-20T12:00:00Z'
      },
      {
        id: '2',
        name: 'Bakery Express',
        description: 'Fresh kosher baked goods and pastries',
        logo: '/images/vendors/bakery-express-logo.jpg',
        address: '456 Oak Avenue',
        city: 'Miami',
        state: 'FL',
        zipCode: '33102',
        phone: '(305) 555-0456',
        email: 'orders@bakeryexpress.com',
        rating: 4.8,
        reviewCount: 156,
        isVerified: true,
        isPremium: false,
        categories: this.getMockCategories().slice(1, 3),
        products: [],
        hours: this.getMockVendorHours(),
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-19T10:00:00Z'
      }
    ];
  }

  private static getMockVendor(id: string): MarketplaceVendor {
    return this.getMockVendors().find(v => v.id === id) || this.getMockVendors()[0];
  }

  private static getMockVendorProducts(vendorId: string): MarketplaceProduct[] {
    return this.getMockProducts().filter(p => p.vendor.id === vendorId);
  }

  private static getMockCategories(): MarketplaceCategory[] {
    return [
      {
        id: '1',
        name: 'Meat & Poultry',
        description: 'Fresh kosher meats and poultry products',
        icon: '🥩',
        color: '#dc2626',
        productCount: 45,
        isActive: true,
        sortOrder: 1
      },
      {
        id: '2',
        name: 'Bakery',
        description: 'Fresh baked goods and pastries',
        icon: '🥖',
        color: '#f59e0b',
        productCount: 32,
        isActive: true,
        sortOrder: 2
      },
      {
        id: '3',
        name: 'Dairy',
        description: 'Kosher dairy products and cheeses',
        icon: '🥛',
        color: '#3b82f6',
        productCount: 28,
        isActive: true,
        sortOrder: 3
      },
      {
        id: '4',
        name: 'Pantry',
        description: 'Kosher pantry staples and ingredients',
        icon: '🫙',
        color: '#10b981',
        productCount: 67,
        isActive: true,
        sortOrder: 4
      }
    ];
  }

  private static getMockCategory(id: string): MarketplaceCategory {
    return this.getMockCategories().find(c => c.id === id) || this.getMockCategories()[0];
  }

  private static getMockCategoryProducts(categoryId: string): MarketplaceProduct[] {
    return this.getMockProducts().filter(p => p.category.id === categoryId);
  }

  private static getMockVendorHours() {
    return {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '16:00', isClosedForShabbat: true },
      saturday: { isOpen: false, isClosedForShabbat: true },
      sunday: { isOpen: true, openTime: '10:00', closeTime: '17:00' }
    };
  }

  private static getMockOrders(): MarketplaceOrder[] {
    return [
      {
        id: '1',
        userId: 'user123',
        vendorId: '1',
        products: [
          {
            productId: '1',
            productName: 'Glatt Kosher Beef Brisket',
            quantity: 2,
            price: 45.99,
            total: 91.98,
            image: '/images/products/brisket-thumb.jpg'
          }
        ],
        status: 'confirmed',
        subtotal: 91.98,
        tax: 7.36,
        shipping: 5.99,
        total: 105.33,
        currency: 'USD',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '789 Pine Street',
          city: 'Miami',
          state: 'FL',
          zipCode: '33103',
          country: 'USA',
          phone: '(305) 555-0789'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '789 Pine Street',
          city: 'Miami',
          state: 'FL',
          zipCode: '33103',
          country: 'USA',
          phone: '(305) 555-0789'
        },
        paymentMethod: {
          id: 'pm_1',
          type: 'credit_card',
          last4: '4242',
          brand: 'visa'
        },
        paymentStatus: 'paid',
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:30:00Z',
        estimatedDelivery: '2024-01-22T14:00:00Z'
      }
    ];
  }

  private static getMockOrder(id: string): MarketplaceOrder {
    return this.getMockOrders().find(o => o.id === id) || this.getMockOrders()[0];
  }

  private static getMockSearchResult(query: string): MarketplaceSearchResult {
    const products = this.getMockProducts().filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      products,
      vendors: this.getMockVendors(),
      categories: this.getMockCategories(),
      totalProducts: products.length,
      totalVendors: this.getMockVendors().length,
      hasMore: false
    };
  }

  private static getMockStats(): MarketplaceStats {
    return {
      totalProducts: 172,
      totalVendors: 8,
      totalCategories: 4,
      activeOrders: 23,
      totalSales: 15420.50,
      averageRating: 4.7
    };
  }
}
