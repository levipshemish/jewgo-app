'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { BottomNavigation } from '@/components/navigation/ui';
import { CheckCircle, Trophy } from 'lucide-react';

// Step components
import WelcomeStep from '@/components/shtel/setup/WelcomeStep';
import StoreInfoStep from '@/components/shtel/setup/StoreInfoStep';
import LocationStep from '@/components/shtel/setup/LocationStep';
import ProductsStep from '@/components/shtel/setup/ProductsStep';
import CustomizeStep from '@/components/shtel/setup/CustomizeStep';
import ReviewStep from '@/components/shtel/setup/ReviewStep';

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';

// Types
interface StoreSetupData {
  // Step 1: Welcome
  storeType: string;
  plan: 'free' | 'basic' | 'premium';
  
  // Step 2: Store Information
  storeName: string;
  description: string;
  category: string;
  subcategory: string;
  
  // Step 3: Location & Delivery
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  deliveryEnabled: boolean;
  deliveryRadius: number;
  deliveryFee: number;
  businessHours: string;
  
  // Step 4: Products
  products: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
    condition: 'new' | 'like_new' | 'good' | 'fair';
    images: string[];
  }>;
  
  // Step 5: Customize
  logo: string;
  banner: string;
  colorScheme: string;
  kosherCert: string;
  kosherAgency: string;
  shabbosOrders: boolean;
  
  // Step 6: Review
  isActive: boolean;
  isApproved: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

const STEPS = [
  { id: 1, name: 'Welcome', component: WelcomeStep, points: 100 },
  { id: 2, name: 'Store Information', component: StoreInfoStep, points: 200 },
  { id: 3, name: 'Location & Delivery', component: LocationStep, points: 150 },
  { id: 4, name: 'Add Your Products', component: ProductsStep, points: 300 },
  { id: 5, name: 'Customize Your Store', component: CustomizeStep, points: 150 },
  { id: 6, name: 'Review & Launch', component: ReviewStep, points: 100 }
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'store_creator',
    name: 'Store Creator',
    description: 'Created your first store',
    icon: '🏪',
    points: 500,
    unlocked: false
  },
  {
    id: 'product_master',
    name: 'Product Master',
    description: 'Added 5 products to your store',
    icon: '📦',
    points: 200,
    unlocked: false
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Completed 100% of your store profile',
    icon: '⭐',
    points: 300,
    unlocked: false
  },
  {
    id: 'open_for_business',
    name: 'Open for Business',
    description: 'Made your first sale',
    icon: '💰',
    points: 1000,
    unlocked: false
  },
  {
    id: 'community_favorite',
    name: 'Community Favorite',
    description: 'Received 10 positive reviews',
    icon: '❤️',
    points: 500,
    unlocked: false
  }
];

export default function ShtelSetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [storeData, setStoreData] = useState<StoreSetupData>({
    storeType: '',
    plan: 'free',
    storeName: '',
    description: '',
    category: '',
    subcategory: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    deliveryEnabled: false,
    deliveryRadius: 5,
    deliveryFee: 0,
    businessHours: '',
    products: [],
    logo: '',
    banner: '',
    colorScheme: 'blue',
    kosherCert: '',
    kosherAgency: '',
    shabbosOrders: false,
    isActive: false,
    isApproved: false
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate progress percentage
  const progressPercentage = (currentStep / STEPS.length) * 100;

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < STEPS.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      
      // Award points for completing step
      const stepPoints = STEPS[currentStep - 1].points;
      setTotalPoints(prev => prev + stepPoints);
      
      // Check for achievements
      checkAchievements(newStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  };

  // Check for achievements
  const checkAchievements = (step: number) => {
    const newAchievements = [...achievements];
    
    // Store Creator achievement
    if (step === 2 && !newAchievements[0].unlocked) {
      newAchievements[0].unlocked = true;
      newAchievements[0].unlockedAt = new Date();
      setShowAchievement(newAchievements[0]);
    }
    
    // Product Master achievement
    if (step === 4 && storeData.products.length >= 5 && !newAchievements[1].unlocked) {
      newAchievements[1].unlocked = true;
      newAchievements[1].unlockedAt = new Date();
      setShowAchievement(newAchievements[1]);
    }
    
    // Professional achievement
    if (step === 6 && !newAchievements[2].unlocked) {
      newAchievements[2].unlocked = true;
      newAchievements[2].unlockedAt = new Date();
      setShowAchievement(newAchievements[2]);
    }
    
    setAchievements(newAchievements);
  };

  // Handle store data updates
  const updateStoreData = (updates: Partial<StoreSetupData>) => {
    setStoreData(prev => ({ ...prev, ...updates }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Submit store data to backend
      const response = await fetch('/api/shtel/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeData),
      });

      if (response.ok) {
        // Navigate to store dashboard
        router.push(`/shtel/dashboard`);
      } else {
        throw new Error('Failed to create store');
      }
    } catch (error) {
      console.error('Error creating store:', error);
      // Handle error (show error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current step component
  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Create Your Shtel Store
            </h1>
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">
                {totalPoints} points
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex flex-col items-center space-y-1 ${
                  step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep 
                    ? 'bg-green-500 text-white' 
                    : step.id === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.id < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-xs font-medium">{step.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Step Content */}
          <div className="p-6">
            <CurrentStepComponent
              storeData={storeData}
              updateStoreData={updateStoreData}
              onNext={nextStep}
              onPrev={prevStep}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              currentStep={currentStep}
              totalSteps={STEPS.length}
            />
          </div>
        </div>

        {/* Achievement Notification */}
        {showAchievement && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{showAchievement.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{showAchievement.name}</h3>
                <p className="text-sm text-gray-600">{showAchievement.description}</p>
                <p className="text-xs text-blue-600 font-medium">+{showAchievement.points} points</p>
              </div>
            </div>
            <button
              onClick={() => setShowAchievement(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
