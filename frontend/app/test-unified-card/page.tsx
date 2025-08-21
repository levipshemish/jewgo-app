"use client"

import React from 'react';
import UnifiedCard from '@/components/ui/UnifiedCard';

export default function TestUnifiedCardPage() {
  const testCards = [
    {
      id: '1',
      title: 'Restaurant with both subtitle and additional text',
      subtitle: '$$$',
      additionalText: '4.5★',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      showHeart: true
    },
    {
      id: '2',
      title: 'Restaurant with only subtitle',
      subtitle: '$$',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
      showHeart: true
    },
    {
      id: '3',
      title: 'Restaurant with only additional text',
      additionalText: '3.8★',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      showHeart: true
    },
    {
      id: '4',
      title: 'Restaurant with neither subtitle nor additional text',
      imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
      showHeart: true
    },
    {
      id: '5',
      title: 'Restaurant with long subtitle and short additional text',
      subtitle: 'Very Expensive $$$$',
      additionalText: '5★',
      imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
      showHeart: true
    },
    {
      id: '6',
      title: 'Restaurant with short subtitle and long additional text',
      subtitle: '$',
      additionalText: 'Excellent Rating 4.9★',
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      showHeart: true
    }
  ];

  const handleCardClick = (data: any) => {
    console.log('Card clicked:', data);
  };

  const handleLikeToggle = (id: string, isLiked: boolean) => {
    console.log('Like toggled:', id, isLiked);
  };

  const handleTagClick = (tagLink: string, event: React.MouseEvent) => {
    console.log('Tag clicked:', tagLink);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          UnifiedCard Layout Test
        </h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Testing Subtitle and Additional Text Positioning
          </h2>
          <p className="text-gray-600 mb-4">
            This test verifies that subtitle (left) and additional text (right) are properly positioned 
            and don't move when one is missing. Also checks that borders don't cover text content.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {testCards.map((card) => (
            <div key={card.id} className="flex flex-col items-center">
              <UnifiedCard
                data={card}
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
                onTagClick={handleTagClick}
                priority={false}
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                <div>ID: {card.id}</div>
                <div>Subtitle: {card.subtitle || 'none'}</div>
                <div>Additional: {card.additionalText || 'none'}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Different Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-medium mb-2">Default Variant</h3>
              <UnifiedCard
                data={testCards[0]}
                variant="default"
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
              />
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-medium mb-2">Minimal Variant</h3>
              <UnifiedCard
                data={testCards[1]}
                variant="minimal"
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
              />
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-medium mb-2">Enhanced Variant</h3>
              <UnifiedCard
                data={testCards[2]}
                variant="enhanced"
                onCardClick={handleCardClick}
                onLikeToggle={handleLikeToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
