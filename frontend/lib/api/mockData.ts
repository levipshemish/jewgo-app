import { Restaurant } from '@/lib/types/restaurant';

// Mock restaurant data - moved to separate file to reduce webpack serialization issues
export const mockRestaurants: Restaurant[] = [
  {
    id: "1",
    name: 'Kosher Deli & Grill',
    address: '123 Main St',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0123',
    certifying_agency: 'KM',
    kosher_category: 'meat',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.5,
    price_range: '$15 - $35',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7617,
    longitude: -80.1918,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Fri: 11:00 AM - 10:00 PM, Sat-Sun: 12:00 PM - 11:00 PM'
    },
    category: {
      name: 'Restaurant',
      description: 'Full-service kosher restaurant'
    }
  },
  {
    id: "2",
    name: 'Miami Kosher Market',
    address: '456 Oak Ave',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0456',
    certifying_agency: 'ORB',
    kosher_category: 'dairy',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.2,
    price_range: '$10 - $25',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7907,
    longitude: -80.1300,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Sat: 8:00 AM - 8:00 PM, Sun: 9:00 AM - 6:00 PM'
    },
    category: {
      name: 'Market',
      description: 'Kosher grocery and deli market'
    }
  },
  {
    id: "3",
    name: 'Kosher Pizza Palace',
    address: '789 Pine St',
    city: 'Miami',
    state: 'FL',
    zip_code: '33102',
    phone_number: '(305) 555-0789',
    certifying_agency: 'ORB',
    kosher_category: 'dairy',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.8,
    price_range: '$12 - $30',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7749,
    longitude: -80.1977,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Thu: 11:00 AM - 11:00 PM, Fri: 11:00 AM - 3:00 PM, Sat: 8:00 PM - 12:00 AM, Sun: 12:00 PM - 10:00 PM'
    },
    category: {
      name: 'Pizza',
      description: 'Kosher pizza and Italian cuisine'
    }
  },
  {
    id: "4",
    name: 'Sushi Kosher Express',
    address: '321 Ocean Dr',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0321',
    certifying_agency: 'Kosher Miami',
    kosher_category: 'pareve',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.7,
    price_range: '$20 - $45',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7825,
    longitude: -80.1344,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Sat: 12:00 PM - 10:00 PM, Sun: 5:00 PM - 9:00 PM'
    },
    category: {
      name: 'Sushi',
      description: 'Kosher sushi and Japanese cuisine'
    }
  },
  {
    id: "5",
    name: 'Kosher Bakery & Cafe',
    address: '654 Biscayne Blvd',
    city: 'Miami',
    state: 'FL',
    zip_code: '33132',
    phone_number: '(305) 555-0654',
    certifying_agency: 'ORB',
    kosher_category: 'dairy',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.0,
    price_range: '$8 - $20',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7869,
    longitude: -80.1867,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Fri: 7:00 AM - 7:00 PM, Sat: 8:00 AM - 6:00 PM, Sun: 8:00 AM - 5:00 PM'
    },
    category: {
      name: 'Bakery',
      description: 'Kosher bakery and cafe'
    }
  },
  {
    id: "6",
    name: 'Kosher Ice Cream Parlor',
    address: '987 Collins Ave',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0987',
    certifying_agency: 'ORB',
    kosher_category: 'dairy',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.3,
    price_range: '$5 - $15',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7869,
    longitude: -80.1225,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Sun: 12:00 PM - 10:00 PM'
    },
    category: {
      name: 'Dessert',
      description: 'Kosher ice cream and dessert parlor'
    }
  },
  {
    id: "7",
    name: 'Kosher Steakhouse',
    address: '147 Lincoln Rd',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0147',
    certifying_agency: 'KM',
    kosher_category: 'meat',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.6,
    price_range: '$25 - $60',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7907,
    longitude: -80.1300,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Thu: 5:00 PM - 11:00 PM, Fri: 5:00 PM - 3:00 PM, Sat: 8:00 PM - 12:00 AM, Sun: 5:00 PM - 10:00 PM'
    },
    category: {
      name: 'Steakhouse',
      description: 'Upscale kosher steakhouse'
    }
  },
  {
    id: "8",
    name: 'Kosher Mediterranean Grill',
    address: '258 Washington Ave',
    city: 'Miami Beach',
    state: 'FL',
    zip_code: '33139',
    phone_number: '(305) 555-0258',
    certifying_agency: 'ORB',
    kosher_category: 'meat',
    listing_type: 'restaurant',
    status: 'open',
    rating: 4.4,
    price_range: '$15 - $35',
    image_url: '/images/default-restaurant.webp',
    latitude: 25.7825,
    longitude: -80.1344,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    hours: {
      hours_of_operation: 'Mon-Sat: 11:00 AM - 10:00 PM, Sun: 12:00 PM - 9:00 PM'
    },
    category: {
      name: 'Mediterranean',
      description: 'Kosher Mediterranean and Middle Eastern cuisine'
    }
  }
];

// Mock API functions for profile page

export const mockExportUserData = async (): Promise<any> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock user data
  return {
    profile: {
      name: 'Sarah Cohen',
      email: 'sarah.cohen@email.com',
      phone: '(305) 555-0123',
      location: 'Miami, FL',
      dietaryPreferences: ['dairy', 'pareve'],
      favoriteCertifications: ['ORB', 'KM']
    },
    favorites: [
      { id: 1, name: 'Kosher Deli', addedAt: '2024-01-15' },
      { id: 2, name: 'Miami Kosher Market', addedAt: '2024-01-10' }
    ],
    reviews: [
      { id: 1, restaurantName: 'Miami Kosher Market', rating: 5, comment: 'Great food!', date: '2024-01-12' }
    ],
    activity: {
      restaurantsVisited: 12,
      reviewsWritten: 8,
      favoritesSaved: 15,
      dealsClaimed: 5
    },
    exportDate: new Date().toISOString()
  };
};

export const mockDeleteAccount = async (password: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate password validation
  if (password !== 'password123') {
    throw new Error('Invalid password');
  }
  
  // Simulate successful deletion
  return Promise.resolve();
};

export const mockClaimDeal = async (dealId: number): Promise<any> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate random success/failure
  const success = Math.random() > 0.1; // 90% success rate
  
  if (!success) {
    throw new Error('Failed to claim deal. Please try again.');
  }
  
  return {
    success: true,
    dealId,
    claimedAt: new Date().toISOString(),
    message: 'Deal claimed successfully!'
  };
}; 