'use client';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useGuestProtection } from '@/lib/utils/guest-protection';

interface Restaurant {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  website?: string;
  kosher_category?: string;
  certifying_agency?: string;
  short_description?: string;
  description?: string;
  google_listing_url?: string;
  hours_open?: string;
  price_range?: string;
  photos?: string[];
}

interface FormData {
  // Step 1: Basic Info
  name: string;
  kosher_category: 'meat' | 'dairy' | 'pareve' | '';
  certifying_agency: string;
  short_description: string;
  description: string;
  
  // Step 2: Contact Info
  phone: string;
  email: string;
  address: string;
  google_listing_url: string;
  website: string;
  hours_open: string;
  price_range: string;
  
  // Step 3: Photos
  photos: string[];
  
  // Step 4: Review (no additional fields)
  
  // Step 5: Submit (no additional fields)
}

interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  priceRanges: string[];
}

export default function AddEateryPage() {
  const { isLoading, isGuest } = useGuestProtection('/add-eatery');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-4">Guest users must sign in to add eateries.</p>
          <p className="text-sm text-gray-500">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agencies: [],
    kosherCategories: [],
    priceRanges: []
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [isValidating, setIsValidating] = useState(false);
  const [requiredFieldErrors, setRequiredFieldErrors] = useState<{[key: string]: string}>({});
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    kosher_category: '',
    certifying_agency: '',
    short_description: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    google_listing_url: '',
    website: '',
    hours_open: '',
    price_range: '',
    photos: []
  });

  // Fetch filter options from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/restaurants/filter-options');
        const data = await response.json();
        if (data.success) {
          setFilterOptions({
            agencies: data.data.agencies || [],
            kosherCategories: data.data.kosherCategories || [],
            priceRanges: data.data.priceRanges || []
          });
        }
      } catch {
        // // console.error('Error fetching filter options:', error);
        // Use fallback options
        setFilterOptions({
          agencies: ['Kosher Miami', 'ORB'],
          kosherCategories: ['meat', 'dairy', 'pareve'],
          priceRanges: ['$', '$$', '$$$', '$$$$']
        });
      }
    };

    fetchFilterOptions();
  }, []);

  const validateField = async (fieldName: string, value: string) => {
    if (!value.trim()) {
      return;
    }
    
    setIsValidating(true);
    try {
      const response = await fetch('/api/restaurants?limit=1000');
      const data = await response.json();
      const existingRestaurants = data.restaurants || data.data || [];
      
      const errors: {[key: string]: string} = {};
      
      switch (fieldName) {
        case 'name':
          const duplicateName = existingRestaurants.find((restaurant: Restaurant) => 
            restaurant.name?.toLowerCase().trim() === value.toLowerCase().trim()
          );
          if (duplicateName) {
            errors['name'] = `A restaurant with this name already exists.`;
          }
          break;
          
        case 'phone':
          const normalizedPhone = value.replace(/\D/g, '');
          const duplicatePhone = existingRestaurants.find((restaurant: Restaurant) => {
            const existingPhone = restaurant.phone?.replace(/\D/g, '') || '';
            return existingPhone === normalizedPhone && normalizedPhone.length > 0;
          });
          if (duplicatePhone) {
            errors['phone'] = `A restaurant with this phone number already exists.`;
          }
          break;
          
        case 'address':
          const normalizedAddress = value.toLowerCase().trim().replace(/\s+/g, ' ');
          const duplicateAddress = existingRestaurants.find((restaurant: Restaurant) => {
            const existingAddress = restaurant.address?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
            return existingAddress === normalizedAddress && normalizedAddress.length > 0;
          });
          if (duplicateAddress) {
            errors['address'] = `A restaurant with this address already exists.`;
          }
          break;
      }
      
      setValidationErrors(prev => ({ ...prev, ...errors }));
    } catch {
      // Log error silently in production
      if (process.env.NODE_ENV === 'development') {
        // // console.error('Error validating field:', error);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear required field error when user starts typing
    if (requiredFieldErrors[name]) {
      setRequiredFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validate field after user stops typing (debounced)
    setTimeout(() => {
      if (['name', 'phone', 'address'].includes(name)) {
        validateField(name, value);
      }
    }, 1000);
  };

  // const handlePhotoUpload = (photoUrl: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     photos: [...prev.photos, photoUrl]
  //   }));
  // };

  const validateRequiredFields = (step: number): boolean => {
    const errors: {[key: string]: string} = {};
    
    switch (step) {
      case 1:
        // Step 1: Welcome screen - no validation required
        break;
        
      case 2:
        // Step 2: Basic Info
        if (!formData.name.trim()) {
          errors['name'] = 'Restaurant name is required';
        }
        if (!formData.kosher_category) {
          errors['kosher_category'] = 'Kosher category is required';
        }
        if (!formData.certifying_agency) {
          errors['certifying_agency'] = 'Certifying agency is required';
        }
        if (!formData.short_description.trim()) {
          errors['short_description'] = 'Short description is required';
        }
        break;
        
      case 3:
        // Step 3: Contact Info
        if (!formData.phone.trim()) {
          errors['phone'] = 'Phone number is required';
        }
        if (!formData.address.trim()) {
          errors['address'] = 'Address is required';
        }
        if (!formData.hours_open.trim()) {
          errors['hours_open'] = 'Hours are required';
        }
        break;
        
      case 4:
        // Step 4: Photos (optional)
        break;
        
      case 5:
        // Step 5: Review (no additional validation)
        break;
    }
    
    setRequiredFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    // Validate required fields before proceeding
    const isValid = validateRequiredFields(currentStep);
    
    if (!isValid) {
      return;
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateDuplicateData = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    
    try {
      // Fetch existing restaurants to check for duplicates
      const response = await fetch('/api/restaurants?limit=1000');
      const data = await response.json();
      const existingRestaurants = data.restaurants || data.data || [];
      
      // Check for duplicate name (case-insensitive)
      const duplicateName = existingRestaurants.find((restaurant: Restaurant) => 
        restaurant.name?.toLowerCase().trim() === formData.name.toLowerCase().trim()
      );
      if (duplicateName) {
        errors.push(`A restaurant with the name "${formData.name}" already exists in our database.`);
      }
      
      // Check for duplicate phone number (normalized)
      const normalizedPhone = formData.phone.replace(/\D/g, ''); // Remove non-digits
      const duplicatePhone = existingRestaurants.find((restaurant: Restaurant) => {
        const existingPhone = restaurant.phone?.replace(/\D/g, '') || '';
        return existingPhone === normalizedPhone && normalizedPhone.length > 0;
      });
      if (duplicatePhone) {
        errors.push(`A restaurant with the phone number "${formData.phone}" already exists in our database.`);
      }
      
      // Check for duplicate address (case-insensitive, normalized)
      const normalizedAddress = formData.address.toLowerCase().trim().replace(/\s+/g, ' ');
      const duplicateAddress = existingRestaurants.find((restaurant: Restaurant) => {
        const existingAddress = restaurant.address?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
        return existingAddress === normalizedAddress && normalizedAddress.length > 0;
      });
      if (duplicateAddress) {
        errors.push(`A restaurant with the address "${formData.address}" already exists in our database.`);
      }
      
    } catch {
      // Log error silently in production
      if (process.env.NODE_ENV === 'development') {
        // // console.error('Error checking for duplicates:', error);
      }
      // If we can't check for duplicates, we'll proceed but log the error
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSubmit = async () => {
    // Check for validation errors before submitting
    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      alert('Please fix the validation errors before submitting.');
      return;
    }
    
    // Check for required field errors before submitting
    if (Object.keys(requiredFieldErrors).some(key => requiredFieldErrors[key])) {
      alert('Please fill in all required fields before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First, validate for duplicates
      const duplicateValidation = await validateDuplicateData();
      if (!duplicateValidation.isValid) {
        alert(`Duplicate data found:\n${duplicateValidation.errors.join('\n')}\n\nPlease use different information or contact us if you believe this is an error.`);
        setIsSubmitting(false);
        return;
      }
      
      const submissionData = {
        ...formData,
        category: 'restaurant',
        user_type: 'community' as const, // Default to community submission
        image_url: formData.photos[0] || '', // Use first photo as main image
      };

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (result.success) {
        // Show success message and redirect
        alert('Thank you! Your submission has been received and will be reviewed by our team.');
        router.push('/eatery');
      } else {
        // Handle validation errors
        if (result.errors) {
          const errorMessages = result.errors.map((error: { message: string }) => error.message).join('\n');
          alert(`Please fix the following errors:\n${errorMessages}`);
        } else {
          alert('Failed to submit restaurant. Please try again.');
        }
      }
    } catch {
      // Log error silently in production
      if (process.env.NODE_ENV === 'development') {
        // // console.error('Submission error:', error);
      }
      alert('An error occurred while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/eatery');
  };

  return (
    <div className="min-h-screen bg-white">
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex flex-col justify-center items-center px-6 relative"
          >
            <button
              onClick={handleCancel}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Let&apos;s add your Eatery
            </h1>
            <button
              onClick={handleNext}
              className="bg-green-400 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-green-500 transition-colors"
            >
              Next
            </button>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex flex-col px-6 py-8 relative"
          >
            <button
              onClick={handleCancel}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 mb-8 text-center">
              Tell us about the Eatery
            </h1>
            
            <div className="space-y-4 flex-1">
              <div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name/Title *"
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors['name'] || requiredFieldErrors['name']
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {validationErrors["name"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {validationErrors["name"]}
                  </p>
                )}
                {requiredFieldErrors["name"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["name"]}
                  </p>
                )}
                {isValidating && !validationErrors["name"] && !requiredFieldErrors["name"] && formData.name && (
                  <p className="text-gray-500 text-sm mt-1">Checking availability...</p>
                )}
              </div>
              
              <div className="relative">
                <select
                  name="kosher_category"
                  value={formData.kosher_category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 pr-10 appearance-none ${
                    requiredFieldErrors["kosher_category"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                >
                  <option value="">Select Kosher Category *</option>
                  {filterOptions.kosherCategories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                {requiredFieldErrors["kosher_category"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["kosher_category"]}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <select
                  name="certifying_agency"
                  value={formData.certifying_agency}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 pr-10 appearance-none ${
                    requiredFieldErrors["certifying_agency"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                >
                  <option value="">Select Certifying Agency *</option>
                  {filterOptions.agencies.map((agency) => (
                    <option key={agency} value={agency}>
                      {agency}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                {requiredFieldErrors["certifying_agency"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["certifying_agency"]}
                  </p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  placeholder="Short Description *"
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    requiredFieldErrors["short_description"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {requiredFieldErrors["short_description"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["short_description"]}
                  </p>
                )}
              </div>
              
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Full description (optional)"
                rows={4}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handleBack}
                className="text-gray-700 underline"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="bg-green-400 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-500 transition-colors"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex flex-col px-6 py-8 relative"
          >
            <button
              onClick={handleCancel}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 mb-8 text-center">
              Tell us about the Eatery
            </h1>
            
            <div className="space-y-4 flex-1">
              <div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Phone number *"
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors["phone"] || requiredFieldErrors["phone"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {validationErrors["phone"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {validationErrors["phone"]}
                  </p>
                )}
                {requiredFieldErrors["phone"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["phone"]}
                  </p>
                )}
                {isValidating && !validationErrors["phone"] && !requiredFieldErrors["phone"] && formData.phone && (
                  <p className="text-gray-500 text-sm mt-1">Checking availability...</p>
                )}
              </div>
              
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              
              <div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Address *"
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors["address"] || requiredFieldErrors["address"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {validationErrors["address"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {validationErrors["address"]}
                  </p>
                )}
                {requiredFieldErrors["address"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["address"]}
                  </p>
                )}
                {isValidating && !validationErrors["address"] && !requiredFieldErrors["address"] && formData.address && (
                  <p className="text-gray-500 text-sm mt-1">Checking availability...</p>
                )}
              </div>
              
              <div>
                <input
                  type="text"
                  name="hours_open"
                  value={formData.hours_open}
                  onChange={handleInputChange}
                  placeholder="Hours (e.g., Mon-Fri 11AM-10PM) *"
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    requiredFieldErrors["hours_open"]
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-200 focus:ring-green-400'
                  }`}
                />
                {requiredFieldErrors["hours_open"] && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {requiredFieldErrors["hours_open"]}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <select
                  name="price_range"
                  value={formData.price_range}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 pr-10 appearance-none"
                >
                  <option value="">Select Price Range</option>
                  {filterOptions.priceRanges.map((range) => (
                    <option key={range} value={range}>
                      {range === '$' ? '$ (Under $15)' : 
                       range === '$$' ? '$$ ($15-$30)' :
                       range === '$$$' ? '$$$ ($30-$60)' :
                       range === '$$$$' ? '$$$$ (Over $60)' : range}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              
              <input
                type="url"
                name="google_listing_url"
                value={formData.google_listing_url}
                onChange={handleInputChange}
                placeholder="Google listing URL (optional)"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="Website (optional)"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handleBack}
                className="text-gray-700 underline"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="bg-green-400 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-500 transition-colors"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex flex-col px-6 py-8 relative"
          >
            <button
              onClick={handleCancel}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="w-full max-w-sm mx-auto">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                  <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700">Add photos</p>
                </div>
                
                <p className="text-sm text-gray-500 text-center leading-relaxed">
                  Quality photos make your eatery stand out. We recommend adding 2 to 5 clear, engaging images to maximize visibility and performance.
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={handleBack}
                className="text-gray-700 underline"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="bg-green-400 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-500 transition-colors"
              >
                Review listing
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex flex-col px-6 py-8 relative"
          >
            <button
              onClick={handleCancel}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 mb-8 text-center">
              Review your Listing
            </h1>
            
            <div className="flex-1">
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 min-h-64">
                <div className="text-center text-gray-500">
                  <p>Listing preview will appear here</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 text-center leading-relaxed mb-8">
                By tapping Submit listing, you agree to JewGo&apos;s{' '}
                <span className="text-green-500">Terms of Service</span>, and{' '}
                <span className="text-green-500">Privacy Policy</span>. All eatery&apos;s are manually reviewed. If your listing doesn&apos;t meet our guidelines and isn&apos;t approved, we will contact you to adjust.
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={handleBack}
                className="text-gray-700 underline"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-400 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit listing'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 