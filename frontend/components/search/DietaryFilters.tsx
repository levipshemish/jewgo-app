import React from 'react';
import FilterBase, { FilterOption } from './FilterBase';

interface DietaryFiltersProps {
  selectedDietary: string | undefined;
  onDietaryChange: (dietary: string) => void;
  dietaryCounts?: Record<string, number>;
  totalCount?: number;
}

const DIETARY_OPTIONS: FilterOption[] = [
  { id: 'meat', name: 'Meat', icon: '🥩', color: 'bg-red-500', description: 'Meat restaurants' },
  { id: 'dairy', name: 'Dairy', icon: '🥛', color: 'bg-blue-500', description: 'Dairy restaurants' },
  { id: 'pareve', name: 'Pareve', icon: '🥬', color: 'bg-green-500', description: 'Pareve restaurants' }
];

export const DietaryFilters: React.FC<DietaryFiltersProps> = ({
  selectedDietary, onDietaryChange, dietaryCounts, totalCount
}) => {
  const icon = (
    <svg className="w-4 h-4 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );

  const optionsWithCounts = DIETARY_OPTIONS.map(option => ({
    ...option,
    count: dietaryCounts?.[option.id] || 0
  }));

  return (
    <FilterBase
      title="Dietary Preferences"
      icon={icon}
      options={optionsWithCounts}
      selectedValue={selectedDietary || ''}
      onValueChange={onDietaryChange}
      variant="grid"
      showCounts={true}
      totalCount={totalCount}
      className="grid-cols-3"
    />
  );
}; 