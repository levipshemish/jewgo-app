'use client';

import React from 'react';
import { RestaurantSpecial } from '@/lib/types/restaurant';
import { safeFilter } from '@/lib/utils/validation';
import { commonTypography } from '@/lib/utils/typography';
import { commonSpacing } from '@/lib/utils/spacing';

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

  return (
    <div className={commonSpacing.marginTopLarge}>
      <div className={`flex items-center space-x-2 ${commonSpacing.marginBottomMedium}`}>
        <span className="text-lg">🎯</span>
        <h3 className={commonTypography.specialsTitle}>Our Specials</h3>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {displaySpecials.map((special) => (
          <div
            key={special.id}
            className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-48"
          >
            {/* Food Image - Better visuals with fallback icons */}
            <div className="h-32 bg-gray-200 relative">
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                {/* Better food icons based on special type */}
                {special.special_type === 'discount' && (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🍔</div>
                    <div className="text-2xl">🍟</div>
                  </div>
                )}
                {special.special_type === 'promotion' && (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🍣</div>
                    <div className="text-2xl">🥒</div>
                  </div>
                )}
                {special.special_type === 'event' && (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🍹</div>
                    <div className="text-2xl">🍋</div>
                  </div>
                )}
              </div>
            </div>
            <div className={commonSpacing.cardContent}>
              <h4 className={`${commonTypography.specialsItem} ${commonSpacing.marginBottomSmall} line-clamp-1 leading-tight`}>
                {special.title}
              </h4>
              {formatDiscount(special) && (
                <p className="text-red-600 font-bold text-xs">{formatDiscount(special)}</p>
              )}
              {special.description && (
                <p className={`${commonTypography.specialsDescription} ${commonSpacing.marginTopSmall} line-clamp-2`}>
                  {special.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 