'use client';

import React from 'react';

import { RestaurantSpecial } from '@/lib/types/restaurant';
import { getFallbackImages, getPlaceholderImage } from '@/lib/utils/imageValidation';

interface SpecialsSectionProps {
  specials: RestaurantSpecial[];
  title?: string;
}

const SpecialsSection: React.FC<SpecialsSectionProps> = ({ 
  specials, title = "Today's Specials" 
}) => {
  const getSpecialImage = (special: RestaurantSpecial, _index: number) => {
    // Use real restaurant images from your Cloudinary account
    const title = special.title.toLowerCase();
    
    // Get appropriate fallback images based on special type
    let fallbackImages: string[] = [];
    
    if (title.includes('burger') || title.includes('fries') || title.includes('steak') || title.includes('bbq')) {
      // Meat category
      fallbackImages = getFallbackImages('meat');
    } else if (title.includes('pizza') || title.includes('pasta') || title.includes('cheese') || title.includes('dairy')) {
      // Dairy category
      fallbackImages = getFallbackImages('dairy');
    } else if (title.includes('sushi') || title.includes('fish') || title.includes('salad') || title.includes('vegan')) {
      // Pareve category
      fallbackImages = getFallbackImages('pareve');
    } else {
      // General restaurant category
      fallbackImages = getFallbackImages('restaurant');
    }
    
    // Return a random image from the appropriate category
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)] || getPlaceholderImage();
  };

  if (!specials || specials.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {title}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specials.map((special, index) => (
            <div 
              key={`${special.title}-${index}`}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={getSpecialImage(special, index)}
                  alt={special.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {special.discount && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {special.discount}
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {special.title}
                </h3>
                
                {special.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {special.description}
                  </p>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {special.originalPrice && (
                      <span className="text-gray-500 line-through text-sm">
                        ${special.originalPrice}
                      </span>
                    )}
                    <span className="text-2xl font-bold text-orange-600">
                      ${special.price}
                    </span>
                  </div>
                  
                  {special.validUntil && (
                    <span className="text-sm text-gray-500">
                      Valid until {special.validUntil}
                    </span>
                  )}
                </div>
                
                {special.terms && (
                  <p className="text-xs text-gray-500 mt-2">
                    *{special.terms}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialsSection; 