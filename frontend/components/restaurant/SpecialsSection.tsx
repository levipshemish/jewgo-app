'use client';

import React from 'react';

import { RestaurantSpecial } from '@/lib/types/restaurant';
import { getFallbackImages, getPlaceholderImage } from '@/lib/utils/imageValidation';
import Card, { type CardData } from '@/components/core/cards/Card';

interface SpecialsSectionProps {
  specials: RestaurantSpecial[];
  title?: string;
}

const SpecialsSection: React.FC<SpecialsSectionProps> = ({ 
  specials, title = "Today's Specials" 
}) => {
  const getSpecialImage = (special: RestaurantSpecial, _index: number) => {
    // Use real restaurant images from your Cloudinary account
    const _title = special.title.toLowerCase();
    
    // Get appropriate fallback images based on special type
    let fallbackImages: string[] = [];
    
    if (_title.includes('burger') || _title.includes('fries') || _title.includes('steak') || _title.includes('bbq')) {
      // Meat category
      fallbackImages = getFallbackImages('meat');
    } else if (_title.includes('pizza') || _title.includes('pasta') || _title.includes('cheese') || _title.includes('dairy')) {
      // Dairy category
      fallbackImages = getFallbackImages('dairy');
    } else if (_title.includes('sushi') || _title.includes('fish') || _title.includes('salad') || _title.includes('vegan')) {
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

  const createCardData = (special: RestaurantSpecial, index: number): CardData => ({
    id: `${special.title}-${index}`,
    imageUrl: getSpecialImage(special, index),
    title: special.title,
    badge: special.discount || undefined,
    subtitle: special.description || '',
    additionalText: special.validUntil ? `Valid until ${special.validUntil}` : undefined,
    price: {
      original: special.originalPrice ? Number(special.originalPrice) : undefined,
      sale: special.price ? Number(special.price) : undefined,
      currency: 'USD'
    },
    showHeart: false,
  });

  return (
    <section className="py-8 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {title}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specials.map((special, index) => (
            <Card
              key={`${special.title}-${index}`}
              data={createCardData(special, index)}
              variant="default"
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialsSection; 