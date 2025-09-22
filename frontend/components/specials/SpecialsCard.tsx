'use client';

import React from 'react';

import { RestaurantSpecial } from '@/lib/types/restaurant';
import { commonSpacing } from '@/lib/utils/spacing';
import { commonTypography } from '@/lib/utils/typography';
import { safeFilter } from '@/lib/utils/validation';
import Card, { type CardData } from '@/components/core/cards/Card';

interface SpecialsCardProps {
  specials: RestaurantSpecial[];
  maxDisplay?: number;
}

export default function SpecialsCard({ specials, maxDisplay = 3 }: SpecialsCardProps) {
  // Only show paid specials
  const paidSpecials = safeFilter(specials, (special: any) => special.is_paid && special.is_active);
  
  if (paidSpecials.length === 0) {
    return null;
  }

  // Limit to maxDisplay
  const displaySpecials = paidSpecials.slice(0, maxDisplay);

  const formatDiscount = (special: RestaurantSpecial) => {
    if (special.discount_percent) {
      return `${special.discount_percent}% OFF`;
    }
    if (special.discount_amount) {
      return `$${special.discount_amount} OFF`;
    }
    return '';
  };

  const createCardData = (special: RestaurantSpecial): CardData => ({
    id: special.id.toString(),
    imageUrl: undefined, // RestaurantSpecial doesn't have image_url property
    title: special.title,
    badge: formatDiscount(special) || undefined,
    subtitle: special.description || '',
    showHeart: false,
  });

  return (
    <div className={commonSpacing.marginTopLarge}>
      <div className={`flex items-center space-x-2 ${commonSpacing.marginBottomMedium}`}>
        <span className="text-lg">🎯</span>
        <h3 className={commonTypography.specialsTitle}>Our Specials</h3>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {displaySpecials.map((special) => (
          <Card
            key={special.id}
            data={createCardData(special)}
            variant="minimal"
            className="flex-shrink-0 w-48"
          />
        ))}
      </div>
    </div>
  );
} 