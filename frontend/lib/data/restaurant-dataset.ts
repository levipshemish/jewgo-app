/**
 * Comprehensive Restaurant Dataset with Yes/No/Notes Format
 * Based on the Normalized_Dataset__Yes_No___Notes_.numbers file
 */

export interface RestaurantDataField {
  field: string;
  value: 'Yes' | 'No' | string;
  notes?: string;
  category: string;
}

export interface RestaurantDataset {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  
  // Core kosher information
  kosher_category: string;
  certifying_agency: string;
  
  // Yes/No/Notes fields (100+ fields as requested)
  data_fields: RestaurantDataField[];
  
  // Additional metadata
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'pending';
}

// Comprehensive list of restaurant data fields in Yes/No/Notes format
export const RESTAURANT_DATA_FIELDS: Omit<RestaurantDataField, 'value' | 'notes'>[] = [
  // Kosher Certification Fields
  { field: 'Has Valid Kosher Certificate', category: 'Kosher Certification' },
  { field: 'Certificate Displayed', category: 'Kosher Certification' },
  { field: 'Certificate Expired', category: 'Kosher Certification' },
  { field: 'Certificate Expires Soon', category: 'Kosher Certification' },
  { field: 'Multiple Certifying Agencies', category: 'Kosher Certification' },
  { field: 'Cholov Yisroel', category: 'Kosher Certification' },
  { field: 'Pas Yisroel', category: 'Kosher Certification' },
  { field: 'Yoshon', category: 'Kosher Certification' },
  { field: 'Chalav Yisroel', category: 'Kosher Certification' },
  { field: 'Bishul Yisroel', category: 'Kosher Certification' },
  
  // Food Categories
  { field: 'Serves Meat', category: 'Food Categories' },
  { field: 'Serves Dairy', category: 'Food Categories' },
  { field: 'Serves Pareve', category: 'Food Categories' },
  { field: 'Serves Fish', category: 'Food Categories' },
  { field: 'Serves Poultry', category: 'Food Categories' },
  { field: 'Serves Beef', category: 'Food Categories' },
  { field: 'Serves Lamb', category: 'Food Categories' },
  { field: 'Serves Seafood', category: 'Food Categories' },
  { field: 'Serves Vegetarian', category: 'Food Categories' },
  { field: 'Serves Vegan', category: 'Food Categories' },
  
  // Dietary Restrictions
  { field: 'Gluten Free Options', category: 'Dietary Restrictions' },
  { field: 'Nut Free', category: 'Dietary Restrictions' },
  { field: 'Soy Free', category: 'Dietary Restrictions' },
  { field: 'Dairy Free Options', category: 'Dietary Restrictions' },
  { field: 'Low Sodium Options', category: 'Dietary Restrictions' },
  { field: 'Sugar Free Options', category: 'Dietary Restrictions' },
  { field: 'Keto Friendly', category: 'Dietary Restrictions' },
  { field: 'Paleo Friendly', category: 'Dietary Restrictions' },
  { field: 'Halal Options', category: 'Dietary Restrictions' },
  { field: 'Allergen Information Available', category: 'Dietary Restrictions' },
  
  // Service Types
  { field: 'Dine In Available', category: 'Service Types' },
  { field: 'Takeout Available', category: 'Service Types' },
  { field: 'Delivery Available', category: 'Service Types' },
  { field: 'Catering Available', category: 'Service Types' },
  { field: 'Private Events', category: 'Service Types' },
  { field: 'Outdoor Seating', category: 'Service Types' },
  { field: 'Bar Service', category: 'Service Types' },
  { field: 'Wine Service', category: 'Service Types' },
  { field: 'Coffee Service', category: 'Service Types' },
  { field: 'Dessert Menu', category: 'Service Types' },
  
  // Payment & Pricing
  { field: 'Accepts Cash', category: 'Payment & Pricing' },
  { field: 'Accepts Credit Cards', category: 'Payment & Pricing' },
  { field: 'Accepts Debit Cards', category: 'Payment & Pricing' },
  { field: 'Accepts Mobile Payments', category: 'Payment & Pricing' },
  { field: 'Accepts Checks', category: 'Payment & Pricing' },
  { field: 'Offers Senior Discounts', category: 'Payment & Pricing' },
  { field: 'Offers Student Discounts', category: 'Payment & Pricing' },
  { field: 'Offers Group Discounts', category: 'Payment & Pricing' },
  { field: 'Has Happy Hour', category: 'Payment & Pricing' },
  { field: 'Has Daily Specials', category: 'Payment & Pricing' },
  
  // Accessibility
  { field: 'Wheelchair Accessible', category: 'Accessibility' },
  { field: 'Accessible Parking', category: 'Accessibility' },
  { field: 'Accessible Restrooms', category: 'Accessibility' },
  { field: 'Elevator Available', category: 'Accessibility' },
  { field: 'Ramp Access', category: 'Accessibility' },
  { field: 'Wide Doorways', category: 'Accessibility' },
  { field: 'Accessible Seating', category: 'Accessibility' },
  { field: 'Braille Menu', category: 'Accessibility' },
  { field: 'Large Print Menu', category: 'Accessibility' },
  { field: 'Hearing Loop', category: 'Accessibility' },
  
  // Technology & Amenities
  { field: 'Free WiFi', category: 'Technology & Amenities' },
  { field: 'Charging Stations', category: 'Technology & Amenities' },
  { field: 'TV Screens', category: 'Technology & Amenities' },
  { field: 'Music System', category: 'Technology & Amenities' },
  { field: 'Air Conditioning', category: 'Technology & Amenities' },
  { field: 'Heating', category: 'Technology & Amenities' },
  { field: 'Parking Available', category: 'Technology & Amenities' },
  { field: 'Valet Parking', category: 'Technology & Amenities' },
  { field: 'Street Parking', category: 'Technology & Amenities' },
  { field: 'Garage Parking', category: 'Technology & Amenities' },
  
  // Family & Children
  { field: 'Child Friendly', category: 'Family & Children' },
  { field: 'High Chairs Available', category: 'Family & Children' },
  { field: 'Booster Seats Available', category: 'Family & Children' },
  { field: 'Kids Menu', category: 'Family & Children' },
  { field: 'Changing Table', category: 'Family & Children' },
  { field: 'Play Area', category: 'Family & Children' },
  { field: 'Stroller Accessible', category: 'Family & Children' },
  { field: 'Family Restrooms', category: 'Family & Children' },
  { field: 'Quiet Area', category: 'Family & Children' },
  { field: 'Nursing Friendly', category: 'Family & Children' },
  
  // Atmosphere & Ambiance
  { field: 'Casual Dining', category: 'Atmosphere & Ambiance' },
  { field: 'Fine Dining', category: 'Atmosphere & Ambiance' },
  { field: 'Fast Casual', category: 'Atmosphere & Ambiance' },
  { field: 'Quiet Atmosphere', category: 'Atmosphere & Ambiance' },
  { field: 'Lively Atmosphere', category: 'Atmosphere & Ambiance' },
  { field: 'Romantic Setting', category: 'Atmosphere & Ambiance' },
  { field: 'Business Friendly', category: 'Atmosphere & Ambiance' },
  { field: 'Date Night Friendly', category: 'Atmosphere & Ambiance' },
  { field: 'Group Friendly', category: 'Atmosphere & Ambiance' },
  { field: 'Solo Dining Friendly', category: 'Atmosphere & Ambiance' },
  
  // Special Features
  { field: 'Live Music', category: 'Special Features' },
  { field: 'Entertainment', category: 'Special Features' },
  { field: 'Sports Viewing', category: 'Special Features' },
  { field: 'Gaming', category: 'Special Features' },
  { field: 'Pool Table', category: 'Special Features' },
  { field: 'Dart Board', category: 'Special Features' },
  { field: 'Arcade Games', category: 'Special Features' },
  { field: 'Karaoke', category: 'Special Features' },
  { field: 'Dancing', category: 'Special Features' },
  { field: 'Private Rooms', category: 'Special Features' },
  
  // Health & Safety
  { field: 'Hand Sanitizer Available', category: 'Health & Safety' },
  { field: 'Masks Required', category: 'Health & Safety' },
  { field: 'Social Distancing', category: 'Health & Safety' },
  { field: 'Contactless Payment', category: 'Health & Safety' },
  { field: 'Temperature Checks', category: 'Health & Safety' },
  { field: 'Vaccination Required', category: 'Health & Safety' },
  { field: 'Outdoor Dining', category: 'Health & Safety' },
  { field: 'Ventilation System', category: 'Health & Safety' },
  { field: 'Regular Sanitization', category: 'Health & Safety' },
  { field: 'Staff Health Checks', category: 'Health & Safety' },
  
  // Additional Services
  { field: 'Gift Cards Available', category: 'Additional Services' },
  { field: 'Loyalty Program', category: 'Additional Services' },
  { field: 'Reservations Required', category: 'Additional Services' },
  { field: 'Walk Ins Welcome', category: 'Additional Services' },
  { field: 'Online Ordering', category: 'Additional Services' },
  { field: 'Mobile App', category: 'Additional Services' },
  { field: 'Rewards Program', category: 'Additional Services' },
  { field: 'Newsletter Signup', category: 'Additional Services' },
  { field: 'Social Media Active', category: 'Additional Services' },
  { field: 'Customer Reviews', category: 'Additional Services' }
];

// Generate random Yes/No/Notes data for a restaurant
export function generateRestaurantDataFields(): RestaurantDataField[] {
  return RESTAURANT_DATA_FIELDS.map(field => {
    const randomValue = Math.random();
    let value: 'Yes' | 'No' | string;
    let notes: string | undefined;
    
    if (randomValue < 0.3) {
      value = 'Yes';
      notes = randomValue < 0.1 ? 'Verified by staff' : undefined;
    } else if (randomValue < 0.6) {
      value = 'No';
      notes = randomValue < 0.4 ? 'Not available' : undefined;
    } else {
      // Custom value (30% chance)
      const customValues = ['Sometimes', 'Limited', 'Seasonal', 'Upon Request', 'Varies'];
      value = customValues[Math.floor(Math.random() * customValues.length)];
      notes = 'Please call ahead to confirm';
    }
    
    return {
      ...field,
      value,
      notes
    };
  });
}

// Sample restaurant data with comprehensive Yes/No/Notes fields
export const SAMPLE_RESTAURANT_DATASET: RestaurantDataset[] = [
  {
    id: 1,
    name: "Kosher Corner Bistro",
    address: "123 Main Street",
    city: "Miami",
    state: "FL",
    zip_code: "33101",
    phone_number: "(305) 555-0123",
    website: "https://koshercorner.com",
    latitude: 25.7617,
    longitude: -80.1918,
    kosher_category: "Meat",
    certifying_agency: "Orthodox Union",
    data_fields: generateRestaurantDataFields(),
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-09-09T15:30:00Z",
    status: "active"
  },
  {
    id: 2,
    name: "Dairy Delight Cafe",
    address: "456 Ocean Drive",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-0456",
    website: "https://dairydelight.com",
    latitude: 25.7907,
    longitude: -80.1300,
    kosher_category: "Dairy",
    certifying_agency: "Kosher Miami",
    data_fields: generateRestaurantDataFields(),
    created_at: "2024-02-20T14:00:00Z",
    updated_at: "2024-09-09T16:45:00Z",
    status: "active"
  },
  {
    id: 3,
    name: "Pareve Paradise",
    address: "789 Lincoln Road",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-0789",
    website: "https://pareveparadise.com",
    latitude: 25.7907,
    longitude: -80.1300,
    kosher_category: "Pareve",
    certifying_agency: "Star-K",
    data_fields: generateRestaurantDataFields(),
    created_at: "2024-03-10T09:00:00Z",
    updated_at: "2024-09-09T17:20:00Z",
    status: "active"
  }
];

// Utility function to get restaurants by category
export function getRestaurantsByCategory(category: string): RestaurantDataset[] {
  return SAMPLE_RESTAURANT_DATASET.filter(restaurant => 
    restaurant.kosher_category.toLowerCase() === category.toLowerCase()
  );
}

// Utility function to get restaurants by field value
export function getRestaurantsByFieldValue(fieldName: string, value: string): RestaurantDataset[] {
  return SAMPLE_RESTAURANT_DATASET.filter(restaurant =>
    restaurant.data_fields.some(field => 
      field.field === fieldName && field.value === value
    )
  );
}

// Utility function to search restaurants by notes
export function searchRestaurantsByNotes(searchTerm: string): RestaurantDataset[] {
  const term = searchTerm.toLowerCase();
  return SAMPLE_RESTAURANT_DATASET.filter(restaurant =>
    restaurant.data_fields.some(field => 
      field.notes?.toLowerCase().includes(term)
    )
  );
}
