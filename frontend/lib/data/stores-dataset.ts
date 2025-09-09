/**
 * Comprehensive Stores Dataset with 100+ Fields
 * Mock data for kosher stores and markets
 */

export interface StoreDataField {
  field: string;
  value: 'Yes' | 'No' | string;
  notes?: string;
  category: string;
}

export interface StoreDataset {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone_number: string;
  website?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  
  // Core store information
  store_type: 'Grocery' | 'Butcher' | 'Bakery' | 'Deli' | 'Specialty' | 'Market';
  certifying_agency: string;
  
  // Yes/No/Notes fields (100+ fields as requested)
  data_fields: StoreDataField[];
  
  // Additional metadata
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'pending';
}

// Comprehensive list of store data fields
export const STORE_DATA_FIELDS: Omit<StoreDataField, 'value' | 'notes'>[] = [
  // Product Categories
  { field: 'Fresh Meat Available', category: 'Product Categories' },
  { field: 'Fresh Poultry Available', category: 'Product Categories' },
  { field: 'Fresh Fish Available', category: 'Product Categories' },
  { field: 'Dairy Products', category: 'Product Categories' },
  { field: 'Frozen Foods', category: 'Product Categories' },
  { field: 'Canned Goods', category: 'Product Categories' },
  { field: 'Dry Goods', category: 'Product Categories' },
  { field: 'Fresh Produce', category: 'Product Categories' },
  { field: 'Baked Goods', category: 'Product Categories' },
  { field: 'Prepared Foods', category: 'Product Categories' },
  
  // Kosher Certifications
  { field: 'OU Certified', category: 'Kosher Certifications' },
  { field: 'Star-K Certified', category: 'Kosher Certifications' },
  { field: 'Kof-K Certified', category: 'Kosher Certifications' },
  { field: 'CRC Certified', category: 'Kosher Certifications' },
  { field: 'Local Rabbi Certified', category: 'Kosher Certifications' },
  { field: 'Cholov Yisroel', category: 'Kosher Certifications' },
  { field: 'Pas Yisroel', category: 'Kosher Certifications' },
  { field: 'Yoshon', category: 'Kosher Certifications' },
  { field: 'Glatt Kosher', category: 'Kosher Certifications' },
  { field: 'Mehadrin', category: 'Kosher Certifications' },
  
  // Services
  { field: 'Butcher Service', category: 'Services' },
  { field: 'Custom Cutting', category: 'Services' },
  { field: 'Catering', category: 'Services' },
  { field: 'Delivery Service', category: 'Services' },
  { field: 'Online Ordering', category: 'Services' },
  { field: 'Phone Orders', category: 'Services' },
  { field: 'Special Orders', category: 'Services' },
  { field: 'Bulk Orders', category: 'Services' },
  { field: 'Wholesale', category: 'Services' },
  { field: 'Gift Baskets', category: 'Services' },
  
  // Payment Options
  { field: 'Accepts Cash', category: 'Payment Options' },
  { field: 'Accepts Credit Cards', category: 'Payment Options' },
  { field: 'Accepts Debit Cards', category: 'Payment Options' },
  { field: 'Accepts Checks', category: 'Payment Options' },
  { field: 'Accepts Mobile Payments', category: 'Payment Options' },
  { field: 'Store Credit', category: 'Payment Options' },
  { field: 'Layaway', category: 'Payment Options' },
  { field: 'Payment Plans', category: 'Payment Options' },
  { field: 'Corporate Accounts', category: 'Payment Options' },
  { field: 'Student Discounts', category: 'Payment Options' },
  
  // Store Features
  { field: 'Parking Available', category: 'Store Features' },
  { field: 'Wheelchair Accessible', category: 'Store Features' },
  { field: 'Shopping Carts', category: 'Store Features' },
  { field: 'Shopping Baskets', category: 'Store Features' },
  { field: 'Bagging Service', category: 'Store Features' },
  { field: 'Carry Out Service', category: 'Store Features' },
  { field: 'Loading Assistance', category: 'Store Features' },
  { field: 'Customer Service Desk', category: 'Store Features' },
  { field: 'Restrooms', category: 'Store Features' },
  { field: 'ATM Available', category: 'Store Features' },
  
  // Technology
  { field: 'Barcode Scanning', category: 'Technology' },
  { field: 'Digital Receipts', category: 'Technology' },
  { field: 'Loyalty Program', category: 'Technology' },
  { field: 'Mobile App', category: 'Technology' },
  { field: 'Online Inventory', category: 'Technology' },
  { field: 'Price Checker', category: 'Technology' },
  { field: 'Self Checkout', category: 'Technology' },
  { field: 'Digital Coupons', category: 'Technology' },
  { field: 'Email Receipts', category: 'Technology' },
  { field: 'SMS Notifications', category: 'Technology' },
  
  // Special Products
  { field: 'Passover Products', category: 'Special Products' },
  { field: 'High Holiday Items', category: 'Special Products' },
  { field: 'Shabbat Items', category: 'Special Products' },
  { field: 'Kosher Wine', category: 'Special Products' },
  { field: 'Kosher Spirits', category: 'Special Products' },
  { field: 'Israeli Products', category: 'Special Products' },
  { field: 'European Products', category: 'Special Products' },
  { field: 'Organic Products', category: 'Special Products' },
  { field: 'Gluten Free Products', category: 'Special Products' },
  { field: 'Sugar Free Products', category: 'Special Products' },
  
  // Store Hours
  { field: 'Open Sundays', category: 'Store Hours' },
  { field: 'Open Saturdays', category: 'Store Hours' },
  { field: 'Extended Hours', category: 'Store Hours' },
  { field: '24 Hour Service', category: 'Store Hours' },
  { field: 'Early Morning Hours', category: 'Store Hours' },
  { field: 'Late Evening Hours', category: 'Store Hours' },
  { field: 'Holiday Hours', category: 'Store Hours' },
  { field: 'Seasonal Hours', category: 'Store Hours' },
  { field: 'Emergency Hours', category: 'Store Hours' },
  { field: 'Appointment Only', category: 'Store Hours' },
  
  // Community Services
  { field: 'Community Events', category: 'Community Services' },
  { field: 'Educational Programs', category: 'Community Services' },
  { field: 'Cooking Classes', category: 'Community Services' },
  { field: 'Kosher Certification Help', category: 'Community Services' },
  { field: 'Rabbinic Consultation', category: 'Community Services' },
  { field: 'Charity Programs', category: 'Community Services' },
  { field: 'Food Bank Support', category: 'Community Services' },
  { field: 'Senior Discounts', category: 'Community Services' },
  { field: 'Family Discounts', category: 'Community Services' },
  { field: 'Newcomer Assistance', category: 'Community Services' },
  
  // Quality & Freshness
  { field: 'Daily Fresh Delivery', category: 'Quality & Freshness' },
  { field: 'Local Suppliers', category: 'Quality & Freshness' },
  { field: 'Organic Options', category: 'Quality & Freshness' },
  { field: 'Farm to Table', category: 'Quality & Freshness' },
  { field: 'Seasonal Products', category: 'Quality & Freshness' },
  { field: 'Artisan Products', category: 'Quality & Freshness' },
  { field: 'Premium Quality', category: 'Quality & Freshness' },
  { field: 'Freshness Guarantee', category: 'Quality & Freshness' },
  { field: 'Quality Control', category: 'Quality & Freshness' },
  { field: 'Temperature Controlled', category: 'Quality & Freshness' }
];

// Generate random Yes/No/Notes data for a store
export function generateStoreDataFields(): StoreDataField[] {
  return STORE_DATA_FIELDS.map(field => {
    const randomValue = Math.random();
    let value: 'Yes' | 'No' | string;
    let notes: string | undefined;
    
    if (randomValue < 0.35) {
      value = 'Yes';
      notes = randomValue < 0.12 ? 'Available seasonally' : undefined;
    } else if (randomValue < 0.65) {
      value = 'No';
      notes = randomValue < 0.45 ? 'Not currently available' : undefined;
    } else {
      // Custom value (35% chance)
      const customValues = ['Limited', 'Upon Request', 'Seasonal', 'Varies', 'Call for Availability'];
      value = customValues[Math.floor(Math.random() * customValues.length)];
      notes = 'Please call to confirm availability';
    }
    
    return {
      ...field,
      value,
      notes
    };
  });
}

// Sample store data with comprehensive Yes/No/Notes fields
export const SAMPLE_STORE_DATASET: StoreDataset[] = [
  {
    id: 1,
    name: "Kosher Market Miami",
    address: "123 Lincoln Road",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-1000",
    website: "https://koshermarketmiami.com",
    email: "info@koshermarketmiami.com",
    latitude: 25.7907,
    longitude: -80.1300,
    store_type: "Grocery",
    certifying_agency: "Orthodox Union",
    data_fields: generateStoreDataFields(),
    created_at: "2024-01-05T09:00:00Z",
    updated_at: "2024-09-09T13:15:00Z",
    status: "active"
  },
  {
    id: 2,
    name: "Glatt Kosher Butcher",
    address: "456 Collins Avenue",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-2000",
    website: "https://glattkosherbutcher.com",
    email: "orders@glattkosherbutcher.com",
    latitude: 25.7907,
    longitude: -80.1300,
    store_type: "Butcher",
    certifying_agency: "Kosher Miami",
    data_fields: generateStoreDataFields(),
    created_at: "2024-02-10T11:00:00Z",
    updated_at: "2024-09-09T14:30:00Z",
    status: "active"
  },
  {
    id: 3,
    name: "Challah Corner Bakery",
    address: "789 Washington Avenue",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-3000",
    website: "https://challahcorner.com",
    email: "orders@challahcorner.com",
    latitude: 25.7907,
    longitude: -80.1300,
    store_type: "Bakery",
    certifying_agency: "Star-K",
    data_fields: generateStoreDataFields(),
    created_at: "2024-03-15T07:00:00Z",
    updated_at: "2024-09-09T15:45:00Z",
    status: "active"
  }
];

// Utility functions
export function getStoresByType(type: string): StoreDataset[] {
  return SAMPLE_STORE_DATASET.filter(store => 
    store.store_type.toLowerCase() === type.toLowerCase()
  );
}

export function getStoresByFieldValue(fieldName: string, value: string): StoreDataset[] {
  return SAMPLE_STORE_DATASET.filter(store =>
    store.data_fields.some(field => 
      field.field === fieldName && field.value === value
    )
  );
}

export function searchStoresByNotes(searchTerm: string): StoreDataset[] {
  const term = searchTerm.toLowerCase();
  return SAMPLE_STORE_DATASET.filter(store =>
    store.data_fields.some(field => 
      field.notes?.toLowerCase().includes(term)
    )
  );
}
