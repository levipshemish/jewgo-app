/**
 * Comprehensive Mikvah Dataset with 100+ Fields
 * Mock data for mikvah facilities
 */

export interface MikvahDataField {
  field: string;
  value: 'Yes' | 'No' | string;
  notes?: string;
  category: string;
}

export interface MikvahDataset {
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
  
  // Core mikvah information
  mikvah_type: 'Women' | 'Men' | 'Both';
  certifying_agency: string;
  
  // Yes/No/Notes fields (100+ fields as requested)
  data_fields: MikvahDataField[];
  
  // Additional metadata
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'pending';
}

// Comprehensive list of mikvah data fields
export const MIKVAH_DATA_FIELDS: Omit<MikvahDataField, 'value' | 'notes'>[] = [
  // Basic Facilities
  { field: 'Separate Men and Women Areas', category: 'Basic Facilities' },
  { field: 'Private Changing Rooms', category: 'Basic Facilities' },
  { field: 'Lockers Available', category: 'Basic Facilities' },
  { field: 'Towels Provided', category: 'Basic Facilities' },
  { field: 'Soap Provided', category: 'Basic Facilities' },
  { field: 'Shampoo Provided', category: 'Basic Facilities' },
  { field: 'Hair Dryers Available', category: 'Basic Facilities' },
  { field: 'Mirrors Available', category: 'Basic Facilities' },
  { field: 'Benches Available', category: 'Basic Facilities' },
  { field: 'Hooks for Clothing', category: 'Basic Facilities' },
  
  // Mikvah Specific
  { field: 'Natural Spring Water', category: 'Mikvah Specific' },
  { field: 'Rain Water Collection', category: 'Mikvah Specific' },
  { field: 'Heated Water', category: 'Mikvah Specific' },
  { field: 'Temperature Control', category: 'Mikvah Specific' },
  { field: 'Water Filtration System', category: 'Mikvah Specific' },
  { field: 'Water Treatment System', category: 'Mikvah Specific' },
  { field: 'Regular Water Testing', category: 'Mikvah Specific' },
  { field: 'Chemical Free', category: 'Mikvah Specific' },
  { field: 'Chlorine Free', category: 'Mikvah Specific' },
  { field: 'Salt Water', category: 'Mikvah Specific' },
  
  // Accessibility
  { field: 'Wheelchair Accessible', category: 'Accessibility' },
  { field: 'Accessible Parking', category: 'Accessibility' },
  { field: 'Ramp Access', category: 'Accessibility' },
  { field: 'Elevator Available', category: 'Accessibility' },
  { field: 'Wide Doorways', category: 'Accessibility' },
  { field: 'Accessible Restrooms', category: 'Accessibility' },
  { field: 'Handrails Available', category: 'Accessibility' },
  { field: 'Non-slip Surfaces', category: 'Accessibility' },
  { field: 'Emergency Call Button', category: 'Accessibility' },
  { field: 'Assistance Available', category: 'Accessibility' },
  
  // Safety & Security
  { field: 'Security Cameras', category: 'Safety & Security' },
  { field: 'Alarm System', category: 'Safety & Security' },
  { field: 'Emergency Exit', category: 'Safety & Security' },
  { field: 'Fire Extinguisher', category: 'Safety & Security' },
  { field: 'First Aid Kit', category: 'Safety & Security' },
  { field: 'Emergency Phone', category: 'Safety & Security' },
  { field: 'Locked Doors', category: 'Safety & Security' },
  { field: 'Key Card Access', category: 'Safety & Security' },
  { field: 'Security Guard', category: 'Safety & Security' },
  { field: 'Visitor Log', category: 'Safety & Security' },
  
  // Hours & Scheduling
  { field: '24 Hour Access', category: 'Hours & Scheduling' },
  { field: 'Appointment Required', category: 'Hours & Scheduling' },
  { field: 'Walk-in Available', category: 'Hours & Scheduling' },
  { field: 'Online Booking', category: 'Hours & Scheduling' },
  { field: 'Phone Booking', category: 'Hours & Scheduling' },
  { field: 'Same Day Appointments', category: 'Hours & Scheduling' },
  { field: 'Weekend Hours', category: 'Hours & Scheduling' },
  { field: 'Holiday Hours', category: 'Hours & Scheduling' },
  { field: 'Extended Hours', category: 'Hours & Scheduling' },
  { field: 'Flexible Scheduling', category: 'Hours & Scheduling' },
  
  // Staff & Services
  { field: 'Mikvah Attendant', category: 'Staff & Services' },
  { field: 'Female Attendant', category: 'Staff & Services' },
  { field: 'Male Attendant', category: 'Staff & Services' },
  { field: 'Rabbinic Supervision', category: 'Staff & Services' },
  { field: 'Halachic Guidance', category: 'Staff & Services' },
  { field: 'Educational Programs', category: 'Staff & Services' },
  { field: 'Newcomer Orientation', category: 'Staff & Services' },
  { field: 'Support Groups', category: 'Staff & Services' },
  { field: 'Counseling Services', category: 'Staff & Services' },
  { field: 'Community Events', category: 'Staff & Services' },
  
  // Amenities
  { field: 'Waiting Room', category: 'Amenities' },
  { field: 'Reading Material', category: 'Amenities' },
  { field: 'Tea and Coffee', category: 'Amenities' },
  { field: 'Snacks Available', category: 'Amenities' },
  { field: 'WiFi Available', category: 'Amenities' },
  { field: 'Air Conditioning', category: 'Amenities' },
  { field: 'Heating', category: 'Amenities' },
  { field: 'Music System', category: 'Amenities' },
  { field: 'Prayer Books', category: 'Amenities' },
  { field: 'Candles Available', category: 'Amenities' },
  
  // Payment & Fees
  { field: 'Free Service', category: 'Payment & Fees' },
  { field: 'Suggested Donation', category: 'Payment & Fees' },
  { field: 'Fixed Fee', category: 'Payment & Fees' },
  { field: 'Sliding Scale', category: 'Payment & Fees' },
  { field: 'Membership Required', category: 'Payment & Fees' },
  { field: 'Community Funded', category: 'Payment & Fees' },
  { field: 'Insurance Accepted', category: 'Payment & Fees' },
  { field: 'Payment Plans', category: 'Payment & Fees' },
  { field: 'Scholarship Available', category: 'Payment & Fees' },
  { field: 'Financial Assistance', category: 'Payment & Fees' },
  
  // Special Features
  { field: 'Separate Mikvah Rooms', category: 'Special Features' },
  { field: 'Multiple Mikvah Pools', category: 'Special Features' },
  { field: 'Outdoor Mikvah', category: 'Special Features' },
  { field: 'Indoor Mikvah', category: 'Special Features' },
  { field: 'Natural Lighting', category: 'Special Features' },
  { field: 'Artistic Design', category: 'Special Features' },
  { field: 'Garden Setting', category: 'Special Features' },
  { field: 'Ocean View', category: 'Special Features' },
  { field: 'Mountain View', category: 'Special Features' },
  { field: 'Historic Building', category: 'Special Features' },
  
  // Health & Hygiene
  { field: 'Regular Cleaning', category: 'Health & Hygiene' },
  { field: 'Disinfectant Used', category: 'Health & Hygiene' },
  { field: 'Water Quality Testing', category: 'Health & Hygiene' },
  { field: 'PH Level Monitoring', category: 'Health & Hygiene' },
  { field: 'Bacterial Testing', category: 'Health & Hygiene' },
  { field: 'Chemical Testing', category: 'Health & Hygiene' },
  { field: 'Ventilation System', category: 'Health & Hygiene' },
  { field: 'Air Purification', category: 'Health & Hygiene' },
  { field: 'UV Sterilization', category: 'Health & Hygiene' },
  { field: 'Ozone Treatment', category: 'Health & Hygiene' }
];

// Generate random Yes/No/Notes data for a mikvah
export function generateMikvahDataFields(): MikvahDataField[] {
  return MIKVAH_DATA_FIELDS.map(field => {
    const randomValue = Math.random();
    let value: 'Yes' | 'No' | string;
    let notes: string | undefined;
    
    if (randomValue < 0.4) {
      value = 'Yes';
      notes = randomValue < 0.15 ? 'Available upon request' : undefined;
    } else if (randomValue < 0.7) {
      value = 'No';
      notes = randomValue < 0.5 ? 'Not available' : undefined;
    } else {
      // Custom value (30% chance)
      const customValues = ['Limited', 'Seasonal', 'Upon Request', 'Varies', 'Call for Details'];
      value = customValues[Math.floor(Math.random() * customValues.length)];
      notes = 'Please contact for more information';
    }
    
    return {
      ...field,
      value,
      notes
    };
  });
}

// Sample mikvah data with comprehensive Yes/No/Notes fields
export const SAMPLE_MIKVAH_DATASET: MikvahDataset[] = [
  {
    id: 1,
    name: "Miami Beach Mikvah",
    address: "123 Collins Avenue",
    city: "Miami Beach",
    state: "FL",
    zip_code: "33139",
    phone_number: "(305) 555-0100",
    website: "https://miamibeachmikvah.com",
    email: "info@miamibeachmikvah.com",
    latitude: 25.7907,
    longitude: -80.1300,
    mikvah_type: "Women",
    certifying_agency: "Orthodox Union",
    data_fields: generateMikvahDataFields(),
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-09-09T14:30:00Z",
    status: "active"
  },
  {
    id: 2,
    name: "Aventura Community Mikvah",
    address: "456 Aventura Boulevard",
    city: "Aventura",
    state: "FL",
    zip_code: "33180",
    phone_number: "(305) 555-0200",
    website: "https://aventuramikvah.org",
    email: "contact@aventuramikvah.org",
    latitude: 25.9565,
    longitude: -80.1390,
    mikvah_type: "Both",
    certifying_agency: "Kosher Miami",
    data_fields: generateMikvahDataFields(),
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-09-09T15:45:00Z",
    status: "active"
  },
  {
    id: 3,
    name: "Boca Raton Mikvah Center",
    address: "789 Glades Road",
    city: "Boca Raton",
    state: "FL",
    zip_code: "33431",
    phone_number: "(561) 555-0300",
    website: "https://bocamikvah.org",
    email: "info@bocamikvah.org",
    latitude: 26.3683,
    longitude: -80.1289,
    mikvah_type: "Women",
    certifying_agency: "Star-K",
    data_fields: generateMikvahDataFields(),
    created_at: "2024-03-20T12:00:00Z",
    updated_at: "2024-09-09T16:20:00Z",
    status: "active"
  }
];

// Utility functions
export function getMikvahsByType(type: string): MikvahDataset[] {
  return SAMPLE_MIKVAH_DATASET.filter(mikvah => 
    mikvah.mikvah_type.toLowerCase() === type.toLowerCase()
  );
}

export function getMikvahsByFieldValue(fieldName: string, value: string): MikvahDataset[] {
  return SAMPLE_MIKVAH_DATASET.filter(mikvah =>
    mikvah.data_fields.some(field => 
      field.field === fieldName && field.value === value
    )
  );
}

export function searchMikvahsByNotes(searchTerm: string): MikvahDataset[] {
  const term = searchTerm.toLowerCase();
  return SAMPLE_MIKVAH_DATASET.filter(mikvah =>
    mikvah.data_fields.some(field => 
      field.notes?.toLowerCase().includes(term)
    )
  );
}
