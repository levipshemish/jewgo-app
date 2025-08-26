'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, X, Plus, Upload, Star, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import MultipleImageUpload from './MultipleImageUpload';
import AddressAutofill from './AddressAutofill';
import CustomHoursSelector from './CustomHoursSelector';

import { 
  restaurantFormSchema, 
  defaultFormData, 
  type RestaurantFormData,
  validateStep,
  isDairyCategory,
  isMeatOrPareveCategory,
  isPasYisroelCategory,
  isOwnerSubmission
} from '@/lib/validations/restaurant-form-schema';
import { cn } from '@/lib/utils/classNames';

interface FilterOptions {
  agencies: string[];
  kosherCategories: string[];
  listingTypes: string[];
  priceRanges: string[];
}

interface EnhancedAddEateryFormProps {
  onClose?: () => void;
  className?: string;
}

export default function EnhancedAddEateryForm({ onClose, className = '' }: EnhancedAddEateryFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agencies: [],
    kosherCategories: [],
    listingTypes: [],
    priceRanges: []
  });

  // Form setup with React Hook Form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger,
    reset
  } = useForm<RestaurantFormData>({
    resolver: zodResolver(restaurantFormSchema) as any,
    defaultValues: defaultFormData,
    mode: 'onChange'
  });

  const watchedValues = watch();

  // Phone number formatting function
  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Handle address selection from autofill
  const handleAddressSelect = (address: { street: string; city: string; state: string; zipCode: string }) => {
    setValue('city', address.city);
    setValue('state', address.state);
    setValue('zip_code', address.zipCode);
  };

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/restaurants/filter-options');
        const data = await response.json();
        if (data.success) {
                            setFilterOptions({
            agencies: data.data.agencies || ['ORB', 'Kosher Miami', 'KM'],
            kosherCategories: data.data.kosherCategories || ['Dairy', 'Meat', 'Pareve'],
            listingTypes: data.data.listingTypes || ['Restaurant', 'Bakery', 'Catering', 'Cafe', 'Deli'],
            priceRanges: data.data.priceRanges || ['$', '$$', '$$$', '$$$$']
          });
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
        // Set default options
        setFilterOptions({
          agencies: ['ORB', 'Kosher Miami', 'KM'],
          kosherCategories: ['Dairy', 'Meat', 'Pareve'],
          listingTypes: ['Restaurant', 'Bakery', 'Catering', 'Cafe', 'Deli'],
          priceRanges: ['$', '$$', '$$$', '$$$$']
        });
      }
    };

    fetchFilterOptions();
  }, []);

  // Step validation
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepFields = getStepFields(currentStep);
    const isValid = await trigger(stepFields);
    return isValid;
  };

  const getStepFields = (step: number): (keyof RestaurantFormData)[] => {
    switch (step) {
      case 1:
        return ['is_owner_submission', 'name', 'address', 'phone', 'business_email', 'website', 'listing_type', 'owner_name', 'owner_email', 'owner_phone'];
      case 2:
        return ['kosher_category', 'certifying_agency', 'is_cholov_yisroel', 'is_pas_yisroel'];
      case 3:
        return ['short_description', 'description', 'hours_of_operation', 'google_listing_url', 'instagram_link', 'facebook_link', 'tiktok_link'];
      case 4:
        return ['business_images'];
      case 5:
        return [];
      default:
        return [];
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    if (currentStep < 5) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  // Form submission
  const onSubmit = async (data: RestaurantFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          submission_status: 'pending_approval',
          submission_date: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success message and redirect
        alert('Thank you! Your restaurant submission has been received and is pending approval. We will review it and get back to you soon.');
        router.push('/');
      } else {
        throw new Error(result.message || 'Failed to submit restaurant');
      }
    } catch (error) {
      console.error('Error submitting restaurant:', error);
      alert('Failed to submit restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image upload handler
  const handleImagesUpload = (imageUrls: string[]) => {
    setValue('business_images', imageUrls);
  };

  // Progress calculation
  const progress = (currentStep / 5) * 100;

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Add Your Restaurant</h1>
              <p className="text-sm text-gray-600">Step {currentStep} of 5</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Business Ownership & Basic Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
                  <p className="text-gray-600">Tell us about your business and ownership</p>
                </div>

                {/* Owner/Manager Selection */}
                <div className="bg-white rounded-lg p-6 border">
                  <h3 className="text-lg font-semibold mb-4">Are you the owner or manager of this business?</h3>
                  <div className="flex gap-4">
                    <Controller
                      name="is_owner_submission"
                      control={control}
                      render={({ field }) => (
                        <>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              {...field}
                              value="true"
                              checked={field.value === true}
                              onChange={() => field.onChange(true)}
                              className="mr-2"
                            />
                            <span>Yes, I own or manage this business</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              {...field}
                              value="false"
                              checked={field.value === false}
                              onChange={() => field.onChange(false)}
                              className="mr-2"
                            />
                            <span>No, I'm submitting for someone else</span>
                          </label>
                        </>
                      )}
                    />
                  </div>
                  {errors.is_owner_submission && (
                    <p className="text-red-500 text-sm mt-1">{errors.is_owner_submission.message}</p>
                  )}
                </div>

                {/* Basic Business Info */}
                <div className="bg-white rounded-lg p-6 border space-y-4">
                  <h3 className="text-lg font-semibold">Basic Business Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name *
                      </label>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.name ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                            placeholder="Enter business name"
                          />
                        )}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Listing Type *
                      </label>
                      <Controller
                        name="listing_type"
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.listing_type ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                          >
                            <option value="">Select listing type</option>
                            {filterOptions.listingTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.listing_type && (
                        <p className="text-red-500 text-sm mt-1">{errors.listing_type.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <AddressAutofill
                          value={field.value}
                          onChange={field.onChange}
                          onAddressSelect={handleAddressSelect}
                          placeholder="Start typing your address to auto-fill city, state, and ZIP code..."
                          error={errors.address?.message}
                        />
                      )}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select an address from the dropdown to automatically fill city, state, and ZIP code.
                    </p>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <div className="relative">
                            <input
                              {...field}
                              type="tel"
                              value={formatPhoneNumber(field.value)}
                              onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                field.onChange(formatted);
                              }}
                              className={cn(
                                "w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2",
                                errors.phone ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                              )}
                              placeholder="(555) 123-4567"
                              maxLength={14}
                            />
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Email
                      </label>
                      <Controller
                        name="business_email"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="email"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.business_email ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                            placeholder="business@example.com"
                          />
                        )}
                      />
                      {errors.business_email && (
                        <p className="text-red-500 text-sm mt-1">{errors.business_email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Controller
                      name="website"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="url"
                          className={cn(
                            "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                            errors.website ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                          )}
                          placeholder="https://www.example.com"
                        />
                      )}
                    />
                    {errors.website && (
                      <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
                    )}
                  </div>

                  {/* Owner Information (conditional) */}
                  {watchedValues.is_owner_submission && (
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold mb-4 text-blue-900">Owner Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Owner Name *
                          </label>
                          <Controller
                            name="owner_name"
                            control={control}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="text"
                                className={cn(
                                  "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                                  errors.owner_name ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                                )}
                                placeholder="Owner name"
                              />
                            )}
                          />
                          {errors.owner_name && (
                            <p className="text-red-500 text-sm mt-1">{errors.owner_name.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Owner Email *
                          </label>
                          <Controller
                            name="owner_email"
                            control={control}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="email"
                                className={cn(
                                  "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                                  errors.owner_email ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                                )}
                                placeholder="owner@example.com"
                              />
                            )}
                          />
                          {errors.owner_email && (
                            <p className="text-red-500 text-sm mt-1">{errors.owner_email.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Owner Phone *
                          </label>
                          <Controller
                            name="owner_phone"
                            control={control}
                            render={({ field }) => (
                              <div className="relative">
                                <input
                                  {...field}
                                  type="tel"
                                  value={formatPhoneNumber(field.value)}
                                  onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    field.onChange(formatted);
                                  }}
                                  className={cn(
                                    "w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2",
                                    errors.owner_phone ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                                  )}
                                  placeholder="(555) 123-4567"
                                  maxLength={14}
                                />
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          />
                          {errors.owner_phone && (
                            <p className="text-red-500 text-sm mt-1">{errors.owner_phone.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Kosher Certification */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Kosher Certification</h2>
                  <p className="text-gray-600">Tell us about your kosher certification</p>
                </div>

                <div className="bg-white rounded-lg p-6 border space-y-6">
                  {/* Kosher Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Kosher Category *
                    </label>
                    <Controller
                      name="kosher_category"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          {filterOptions.kosherCategories.map((category) => (
                            <label key={category} className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value={category.toLowerCase()}
                                checked={field.value === category.toLowerCase()}
                                className="mr-3"
                              />
                              <span className="capitalize">{category}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    />
                    {errors.kosher_category && (
                      <p className="text-red-500 text-sm mt-1">{errors.kosher_category.message}</p>
                    )}
                  </div>

                  {/* Certifying Agency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certifying Agency *
                    </label>
                    <Controller
                      name="certifying_agency"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                            errors.certifying_agency ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                          )}
                        >
                          <option value="">Select certifying agency</option>
                          {filterOptions.agencies.map((agency) => (
                            <option key={agency} value={agency}>{agency}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.certifying_agency && (
                      <p className="text-red-500 text-sm mt-1">{errors.certifying_agency.message}</p>
                    )}
                  </div>

                  {/* Conditional Fields */}
                  {isDairyCategory(watchedValues.kosher_category) && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-900 mb-3">Dairy Kosher Status *</h3>
                      <Controller
                        name="is_cholov_yisroel"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value="true"
                                checked={field.value === true}
                                onChange={() => field.onChange(true)}
                                className="mr-3"
                              />
                              <span>Cholov Yisroel</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value="false"
                                checked={field.value === false}
                                onChange={() => field.onChange(false)}
                                className="mr-3"
                              />
                              <span>Cholov Stam</span>
                            </label>
                          </div>
                        )}
                      />
                      {errors.is_cholov_yisroel && (
                        <p className="text-red-500 text-sm mt-1">{errors.is_cholov_yisroel.message}</p>
                      )}
                    </div>
                  )}

                  {isPasYisroelCategory(watchedValues.kosher_category) && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-900 mb-3">Pas Yisroel Status *</h3>
                      <Controller
                        name="is_pas_yisroel"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value="true"
                                checked={field.value === true}
                                onChange={() => field.onChange(true)}
                                className="mr-3"
                              />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                {...field}
                                value="false"
                                checked={field.value === false}
                                onChange={() => field.onChange(false)}
                                className="mr-3"
                              />
                              <span>No</span>
                            </label>
                          </div>
                        )}
                      />
                      {errors.is_pas_yisroel && (
                        <p className="text-red-500 text-sm mt-1">{errors.is_pas_yisroel.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Business Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
                  <p className="text-gray-600">Tell us more about your business</p>
                </div>

                <div className="bg-white rounded-lg p-6 border space-y-6">
                  {/* Short Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Description * (max 80 characters)
                    </label>
                    <Controller
                      name="short_description"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <textarea
                            {...field}
                            rows={3}
                            maxLength={80}
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.short_description ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                            placeholder="Brief description of your restaurant..."
                          />
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {field.value?.length || 0}/80 characters
                            </span>
                          </div>
                        </div>
                      )}
                    />
                    {errors.short_description && (
                      <p className="text-red-500 text-sm mt-1">{errors.short_description.message}</p>
                    )}
                  </div>

                  {/* Long Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Long Description (optional)
                    </label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <textarea
                            {...field}
                            rows={5}
                            maxLength={2000}
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.description ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                            placeholder="Detailed description of your restaurant, menu highlights, special features..."
                          />
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {field.value?.length || 0}/2000 characters
                            </span>
                          </div>
                        </div>
                      )}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Hours of Operation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours of Operation (optional)
                    </label>
                    <Controller
                      name="hours_of_operation"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                            errors.hours_of_operation ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                          )}
                        >
                          <option value="">Select hours of operation</option>
                          <option value="Monday: 10:00 AM – 10:00 PM\nTuesday: 10:00 AM – 10:00 PM\nWednesday: 10:00 AM – 10:00 PM\nThursday: 10:00 AM – 10:00 PM\nFriday: 10:00 AM – 3:00 PM\nSaturday: Closed\nSunday: 10:00 AM – 9:00 PM">Standard Kosher Hours (Mon-Thu 10AM-10PM, Fri 10AM-3PM, Sat Closed, Sun 10AM-9PM)</option>
                          <option value="Monday: 10:00 AM – 11:00 PM\nTuesday: 10:00 AM – 11:00 PM\nWednesday: 10:00 AM – 11:00 PM\nThursday: 10:00 AM – 11:00 PM\nFriday: 10:00 AM – 4:00 PM\nSaturday: 9:00 PM – 1:00 AM\nSunday: 10:00 AM – 11:00 PM">Extended Hours (Mon-Thu 10AM-11PM, Fri 10AM-4PM, Sat 9PM-1AM, Sun 10AM-11PM)</option>
                          <option value="Monday: 10:00 AM – 7:00 PM\nTuesday: 10:00 AM – 7:00 PM\nWednesday: 10:00 AM – 7:00 PM\nThursday: 10:00 AM – 7:00 PM\nFriday: Closed\nSaturday: Closed\nSunday: 10:00 AM – 7:00 PM">Weekday Only (Mon-Thu 10AM-7PM, Fri-Sat Closed, Sun 10AM-7PM)</option>
                          <option value="Monday: 10:00 AM – 8:00 PM\nTuesday: 10:00 AM – 8:00 PM\nWednesday: 10:00 AM – 8:00 PM\nThursday: 10:00 AM – 8:00 PM\nFriday: 10:00 AM – 4:00 PM\nSaturday: Closed\nSunday: 10:00 AM – 8:00 PM">Moderate Hours (Mon-Thu 10AM-8PM, Fri 10AM-4PM, Sat Closed, Sun 10AM-8PM)</option>
                          <option value="Monday: 10:00 AM – 9:00 PM\nTuesday: 10:00 AM – 9:00 PM\nWednesday: 10:00 AM – 9:00 PM\nThursday: 10:00 AM – 9:00 PM\nFriday: 10:00 AM – 3:30 PM\nSaturday: Closed\nSunday: 10:00 AM – 9:00 PM">Evening Hours (Mon-Thu 10AM-9PM, Fri 10AM-3:30PM, Sat Closed, Sun 10AM-9PM)</option>
                          <option value="Monday: 10:30 AM – 10:30 PM\nTuesday: 10:30 AM – 10:30 PM\nWednesday: 10:30 AM – 10:30 PM\nThursday: 10:30 AM – 10:30 PM\nFriday: 10:30 AM – 3:00 PM\nSaturday: Closed\nSunday: 10:30 AM – 10:30 PM">Late Start Hours (Mon-Thu 10:30AM-10:30PM, Fri 10:30AM-3PM, Sat Closed, Sun 10:30AM-10:30PM)</option>
                          <option value="custom">Custom Hours (I'll enter manually)</option>
                        </select>
                      )}
                    />
                    {watchedValues.hours_of_operation === 'custom' && (
                      <div className="mt-3">
                        <CustomHoursSelector
                          value={watchedValues.hours_of_operation}
                          onChange={(value) => setValue('hours_of_operation', value)}
                          error={errors.hours_of_operation?.message}
                        />
                      </div>
                    )}
                    {errors.hours_of_operation && (
                      <p className="text-red-500 text-sm mt-1">{errors.hours_of_operation.message}</p>
                    )}
                  </div>

                  {/* Social Media Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Social Media Links</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Google Listing Link
                      </label>
                      <Controller
                        name="google_listing_url"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                              errors.google_listing_url ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                            )}
                            placeholder="https://maps.google.com/..."
                          />
                        )}
                      />
                      {errors.google_listing_url && (
                        <p className="text-red-500 text-sm mt-1">{errors.google_listing_url.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instagram
                        </label>
                        <Controller
                          name="instagram_link"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="url"
                              className={cn(
                                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                                errors.instagram_link ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                              )}
                              placeholder="https://instagram.com/..."
                            />
                          )}
                        />
                        {errors.instagram_link && (
                          <p className="text-red-500 text-sm mt-1">{errors.instagram_link.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Facebook
                        </label>
                        <Controller
                          name="facebook_link"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="url"
                              className={cn(
                                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                                errors.facebook_link ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                              )}
                              placeholder="https://facebook.com/..."
                            />
                          )}
                        />
                        {errors.facebook_link && (
                          <p className="text-red-500 text-sm mt-1">{errors.facebook_link.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          TikTok
                        </label>
                        <Controller
                          name="tiktok_link"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="url"
                              className={cn(
                                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
                                errors.tiktok_link ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-400"
                              )}
                              placeholder="https://tiktok.com/@..."
                            />
                          )}
                        />
                        {errors.tiktok_link && (
                          <p className="text-red-500 text-sm mt-1">{errors.tiktok_link.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Images */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Images</h2>
                  <p className="text-gray-600">Upload 2-5 images of your restaurant</p>
                </div>

                <div className="bg-white rounded-lg p-6 border">
                  <div className="space-y-4">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">Upload Restaurant Images</p>
                      <p className="text-sm text-gray-500 mb-4">
                        We recommend 3 images of the location (inside & outside) and 2 images of the food
                      </p>
                      
                      {/* Multiple image upload component */}
                      <MultipleImageUpload
                        onImagesUpload={handleImagesUpload}
                        currentImageUrls={watchedValues.business_images || []}
                        maxImages={5}
                        minImages={2}
                      />

                      {errors.business_images && (
                        <p className="text-red-500 text-sm">{errors.business_images.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Preview */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Submission</h2>
                  <p className="text-gray-600">Please review all information before submitting</p>
                </div>

                <div className="bg-white rounded-lg p-6 border">
                  <div className="space-y-6">
                    {/* Business Info Preview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Business Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Name:</span> {watchedValues.name}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {watchedValues.listing_type}
                        </div>
                        <div>
                          <span className="font-medium">Address:</span> {watchedValues.address}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {watchedValues.phone}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {
                            watchedValues.city && watchedValues.state && watchedValues.zip_code 
                              ? `${watchedValues.city}, ${watchedValues.state} ${watchedValues.zip_code}`
                              : watchedValues.city && watchedValues.state
                                ? `${watchedValues.city}, ${watchedValues.state}`
                                : watchedValues.city || watchedValues.state || watchedValues.zip_code || 'Not provided'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {watchedValues.business_email || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    {/* Kosher Info Preview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Kosher Certification</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Category:</span> {watchedValues.kosher_category}
                        </div>
                        <div>
                          <span className="font-medium">Agency:</span> {watchedValues.certifying_agency}
                        </div>
                        {isDairyCategory(watchedValues.kosher_category) && (
                          <div>
                            <span className="font-medium">Dairy Status:</span> {watchedValues.is_cholov_yisroel ? 'Cholov Yisroel' : 'Cholov Stam'}
                          </div>
                        )}
                                            {isPasYisroelCategory(watchedValues.kosher_category) && (
                      <div>
                        <span className="font-medium">Pas Yisroel:</span> {watchedValues.is_pas_yisroel ? 'Yes' : 'No'}
                      </div>
                    )}
                      </div>
                    </div>

                    {/* Description Preview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Description</h3>
                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="font-medium">Short Description:</span>
                          <p className="mt-1">{watchedValues.short_description}</p>
                        </div>
                        {watchedValues.description && (
                          <div>
                            <span className="font-medium">Long Description:</span>
                            <p className="mt-1">{watchedValues.description}</p>
                          </div>
                        )}
                        {watchedValues.hours_of_operation && (
                          <div>
                            <span className="font-medium">Hours of Operation:</span>
                            <pre className="mt-1 text-xs whitespace-pre-wrap">{watchedValues.hours_of_operation}</pre>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Images Preview */}
                    {watchedValues.business_images && watchedValues.business_images.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Images ({watchedValues.business_images.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {watchedValues.business_images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Owner Info Preview */}
                    {watchedValues.is_owner_submission && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Owner Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Name:</span> {watchedValues.owner_name}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {watchedValues.owner_email}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {watchedValues.owner_phone}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={cn(
                "px-6 py-2 rounded-md font-medium transition-colors",
                currentStep === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:text-gray-900"
              )}
            >
              Back
            </button>

            <div className="flex gap-4">
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Restaurant'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
