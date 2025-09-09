/**
 * Comprehensive Marketplace Dataset with 100+ Fields
 * Mock data for marketplace listings
 */

export interface MarketplaceDataField {
  field: string;
  value: 'Yes' | 'No' | string;
  notes?: string;
  category: string;
}

export interface MarketplaceDataset {
  id: number;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  condition: 'new' | 'used' | 'refurbished';
  category_name: string;
  city: string;
  state: string;
  zip_code: string;
  seller_name: string;
  seller_phone?: string;
  seller_email?: string;
  latitude?: number;
  longitude?: number;
  
  // Core marketplace information
  listing_type: 'Product' | 'Service' | 'Event' | 'Job' | 'Housing';
  status: 'active' | 'sold' | 'expired' | 'pending';
  
  // Yes/No/Notes fields (100+ fields as requested)
  data_fields: MarketplaceDataField[];
  
  // Additional metadata
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// Comprehensive list of marketplace data fields
export const MARKETPLACE_DATA_FIELDS: Omit<MarketplaceDataField, 'value' | 'notes'>[] = [
  // Product Information
  { field: 'Brand New', category: 'Product Information' },
  { field: 'Original Packaging', category: 'Product Information' },
  { field: 'Warranty Included', category: 'Product Information' },
  { field: 'Receipt Available', category: 'Product Information' },
  { field: 'Manual Included', category: 'Product Information' },
  { field: 'Accessories Included', category: 'Product Information' },
  { field: 'Battery Included', category: 'Product Information' },
  { field: 'Charger Included', category: 'Product Information' },
  { field: 'Cables Included', category: 'Product Information' },
  { field: 'Software Included', category: 'Product Information' },
  
  // Condition & Quality
  { field: 'Excellent Condition', category: 'Condition & Quality' },
  { field: 'Good Condition', category: 'Condition & Quality' },
  { field: 'Fair Condition', category: 'Condition & Quality' },
  { field: 'Minor Scratches', category: 'Condition & Quality' },
  { field: 'Minor Wear', category: 'Condition & Quality' },
  { field: 'No Damage', category: 'Condition & Quality' },
  { field: 'Fully Functional', category: 'Condition & Quality' },
  { field: 'Tested Working', category: 'Condition & Quality' },
  { field: 'Recently Serviced', category: 'Condition & Quality' },
  { field: 'Professional Grade', category: 'Condition & Quality' },
  
  // Shipping & Delivery
  { field: 'Free Shipping', category: 'Shipping & Delivery' },
  { field: 'Local Pickup Only', category: 'Shipping & Delivery' },
  { field: 'Shipping Available', category: 'Shipping & Delivery' },
  { field: 'Express Shipping', category: 'Shipping & Delivery' },
  { field: 'International Shipping', category: 'Shipping & Delivery' },
  { field: 'Insurance Included', category: 'Shipping & Delivery' },
  { field: 'Tracking Provided', category: 'Shipping & Delivery' },
  { field: 'Signature Required', category: 'Shipping & Delivery' },
  { field: 'Same Day Delivery', category: 'Shipping & Delivery' },
  { field: 'Weekend Delivery', category: 'Shipping & Delivery' },
  
  // Payment Options
  { field: 'Cash Only', category: 'Payment Options' },
  { field: 'PayPal Accepted', category: 'Payment Options' },
  { field: 'Venmo Accepted', category: 'Payment Options' },
  { field: 'Zelle Accepted', category: 'Payment Options' },
  { field: 'Credit Card Accepted', category: 'Payment Options' },
  { field: 'Check Accepted', category: 'Payment Options' },
  { field: 'Money Order Accepted', category: 'Payment Options' },
  { field: 'Cryptocurrency Accepted', category: 'Payment Options' },
  { field: 'Installment Plans', category: 'Payment Options' },
  { field: 'Trade Accepted', category: 'Payment Options' },
  
  // Seller Information
  { field: 'Verified Seller', category: 'Seller Information' },
  { field: 'Top Rated Seller', category: 'Seller Information' },
  { field: 'Fast Response', category: 'Seller Information' },
  { field: 'Reliable Seller', category: 'Seller Information' },
  { field: 'Local Business', category: 'Seller Information' },
  { field: 'Established Business', category: 'Seller Information' },
  { field: 'Family Owned', category: 'Seller Information' },
  { field: 'Community Member', category: 'Seller Information' },
  { field: 'References Available', category: 'Seller Information' },
  { field: 'Licensed Business', category: 'Seller Information' },
  
  // Special Features
  { field: 'Limited Edition', category: 'Special Features' },
  { field: 'Collector Item', category: 'Special Features' },
  { field: 'Vintage Item', category: 'Special Features' },
  { field: 'Antique Item', category: 'Special Features' },
  { field: 'Rare Item', category: 'Special Features' },
  { field: 'Custom Made', category: 'Special Features' },
  { field: 'Handmade', category: 'Special Features' },
  { field: 'Artisan Made', category: 'Special Features' },
  { field: 'One of a Kind', category: 'Special Features' },
  { field: 'Exclusive Item', category: 'Special Features' },
  
  // Availability
  { field: 'In Stock', category: 'Availability' },
  { field: 'Limited Quantity', category: 'Availability' },
  { field: 'Pre Order', category: 'Availability' },
  { field: 'Back Order', category: 'Availability' },
  { field: 'Seasonal Item', category: 'Availability' },
  { field: 'Holiday Item', category: 'Availability' },
  { field: 'Clearance Item', category: 'Availability' },
  { field: 'Discontinued Item', category: 'Availability' },
  { field: 'Closeout Item', category: 'Availability' },
  { field: 'Overstock Item', category: 'Availability' },
  
  // Services & Support
  { field: 'Installation Service', category: 'Services & Support' },
  { field: 'Setup Service', category: 'Services & Support' },
  { field: 'Training Provided', category: 'Services & Support' },
  { field: 'Technical Support', category: 'Services & Support' },
  { field: 'Warranty Service', category: 'Services & Support' },
  { field: 'Repair Service', category: 'Services & Support' },
  { field: 'Maintenance Service', category: 'Services & Support' },
  { field: 'Consultation Service', category: 'Services & Support' },
  { field: 'Customization Service', category: 'Services & Support' },
  { field: 'After Sales Support', category: 'Services & Support' },
  
  // Safety & Security
  { field: 'Authenticity Guaranteed', category: 'Safety & Security' },
  { field: 'No Scams', category: 'Safety & Security' },
  { field: 'Secure Transaction', category: 'Safety & Security' },
  { field: 'Privacy Protected', category: 'Safety & Security' },
  { field: 'Identity Verified', category: 'Safety & Security' },
  { field: 'Background Checked', category: 'Safety & Security' },
  { field: 'Licensed Professional', category: 'Safety & Security' },
  { field: 'Bonded', category: 'Safety & Security' },
  { field: 'Insured', category: 'Safety & Security' },
  { field: 'References Checked', category: 'Safety & Security' },
  
  // Community & Values
  { field: 'Kosher Certified', category: 'Community & Values' },
  { field: 'Jewish Owned', category: 'Community & Values' },
  { field: 'Community Supporting', category: 'Community & Values' },
  { field: 'Charity Supporting', category: 'Community & Values' },
  { field: 'Environmentally Friendly', category: 'Community & Values' },
  { field: 'Ethically Sourced', category: 'Community & Values' },
  { field: 'Fair Trade', category: 'Community & Values' },
  { field: 'Local Sourcing', category: 'Community & Values' },
  { field: 'Sustainable', category: 'Community & Values' },
  { field: 'Socially Responsible', category: 'Community & Values' }
];

// Generate random Yes/No/Notes data for a marketplace listing
export function generateMarketplaceDataFields(): MarketplaceDataField[] {
  return MARKETPLACE_DATA_FIELDS.map(field => {
    const randomValue = Math.random();
    let value: 'Yes' | 'No' | string;
    let notes: string | undefined;
    
    if (randomValue < 0.3) {
      value = 'Yes';
      notes = randomValue < 0.1 ? 'Subject to availability' : undefined;
    } else if (randomValue < 0.6) {
      value = 'No';
      notes = randomValue < 0.4 ? 'Not applicable' : undefined;
    } else {
      // Custom value (40% chance)
      const customValues = ['Available', 'Upon Request', 'Varies', 'Contact Seller', 'Negotiable'];
      value = customValues[Math.floor(Math.random() * customValues.length)];
      notes = 'Please contact seller for details';
    }
    
    return {
      ...field,
      value,
      notes
    };
  });
}

// Sample marketplace data with comprehensive Yes/No/Notes fields
export const SAMPLE_MARKETPLACE_DATASET: MarketplaceDataset[] = [
  {
    id: 1,
    title: "Vintage Menorah - Silver Plated",
    description: "Beautiful vintage silver-plated menorah in excellent condition. Perfect for Hanukkah celebrations. Includes original box and care instructions.",
    price_cents: 12500, // $125.00
    currency: "USD",
    condition: "used",
    category_name: "Judaica",
    city: "Miami",
    state: "FL",
    zip_code: "33101",
    seller_name: "Sarah Cohen",
    seller_phone: "(305) 555-4000",
    seller_email: "sarah@example.com",
    latitude: 25.7617,
    longitude: -80.1918,
    listing_type: "Product",
    status: "active",
    data_fields: generateMarketplaceDataFields(),
    created_at: "2024-09-01T10:00:00Z",
    updated_at: "2024-09-09T12:30:00Z",
    expires_at: "2024-10-01T10:00:00Z"
  },
  {
    id: 2,
    title: "Kosher Catering Services",
    description: "Professional kosher catering for weddings, bar mitzvahs, and special events. Full service including setup, serving, and cleanup.",
    price_cents: 5000, // $50.00 per person
    currency: "USD",
    condition: "new",
    category_name: "Services",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    seller_name: "Miami Kosher Catering",
    seller_phone: "(305) 555-5000",
    seller_email: "info@miamikoshercatering.com",
    latitude: 25.7907,
    longitude: -80.1300,
    listing_type: "Service",
    status: "active",
    data_fields: generateMarketplaceDataFields(),
    created_at: "2024-09-05T14:00:00Z",
    updated_at: "2024-09-09T15:45:00Z",
    expires_at: "2024-12-05T14:00:00Z"
  },
  {
    id: 3,
    title: "Shabbat Dinner Set - 12 Pieces",
    description: "Complete Shabbat dinner set including plates, bowls, cups, and serving dishes. All items are kosher and dishwasher safe.",
    price_cents: 8500, // $85.00
    currency: "USD",
    condition: "new",
    category_name: "Home & Kitchen",
    city: "Aventura",
    state: "FL",
    zip_code: "33180",
    seller_name: "David Levy",
    seller_phone: "(305) 555-6000",
    seller_email: "david@example.com",
    latitude: 25.9565,
    longitude: -80.1390,
    listing_type: "Product",
    status: "active",
    data_fields: generateMarketplaceDataFields(),
    created_at: "2024-09-08T16:00:00Z",
    updated_at: "2024-09-09T17:20:00Z",
    expires_at: "2024-10-08T16:00:00Z"
  }
];

// Utility functions
export function getMarketplaceListingsByType(type: string): MarketplaceDataset[] {
  return SAMPLE_MARKETPLACE_DATASET.filter(listing => 
    listing.listing_type.toLowerCase() === type.toLowerCase()
  );
}

export function getMarketplaceListingsByFieldValue(fieldName: string, value: string): MarketplaceDataset[] {
  return SAMPLE_MARKETPLACE_DATASET.filter(listing =>
    listing.data_fields.some(field => 
      field.field === fieldName && field.value === value
    )
  );
}

export function searchMarketplaceListingsByNotes(searchTerm: string): MarketplaceDataset[] {
  const term = searchTerm.toLowerCase();
  return SAMPLE_MARKETPLACE_DATASET.filter(listing =>
    listing.data_fields.some(field => 
      field.notes?.toLowerCase().includes(term)
    )
  );
}
