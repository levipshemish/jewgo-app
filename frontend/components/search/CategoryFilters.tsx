import React from 'react';
import FilterBase, { FilterOption } from './FilterBase';

interface CategoryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

const CATEGORY_OPTIONS: FilterOption[] = [
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️', color: 'bg-blue-500', description: 'Full-service restaurants' },
  { id: 'bakery', name: 'Bakeries', icon: '🥖', color: 'bg-yellow-500', description: 'Bread and pastries' },
  { id: 'catering', name: 'Catering', icon: '🎉', color: 'bg-purple-500', description: 'Event catering services' },
  { id: 'grocery', name: 'Grocery', icon: '🛒', color: 'bg-green-500', description: 'Kosher grocery stores' },
  { id: 'deli', name: 'Deli', icon: '🥪', color: 'bg-amber-500', description: 'Deli and sandwiches' },
  { id: 'pizza', name: 'Pizza', icon: '🍕', color: 'bg-red-500', description: 'Pizza restaurants' },
  { id: 'ice-cream', name: 'Ice Cream', icon: '🍦', color: 'bg-blue-300', description: 'Ice cream shops' },
  { id: 'coffee', name: 'Coffee', icon: '☕', color: 'bg-brown-500', description: 'Coffee shops' }
];

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  selectedCategory, onCategoryChange, categoryCounts, totalCount
}) => {
  const icon = (
    <svg className="w-4 h-4 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );

  const optionsWithCounts = CATEGORY_OPTIONS.map(option => ({
    ...option,
    count: categoryCounts?.[option.id] || 0
  }));

  return (
    <FilterBase
      title="Business Categories"
      icon={icon}
      options={optionsWithCounts}
      selectedValue={selectedCategory}
      onValueChange={onCategoryChange}
      variant="grid"
      showCounts={true}
      totalCount={totalCount}
    />
  );
};
