export const getKosherCategoryBadgeClasses = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'glatt kosher':
    case 'glatt':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'kosher':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'kosher style':
    case 'kosher-style':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'vegetarian':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'vegan':
      return 'bg-teal-100 text-teal-800 border border-teal-200';
    case 'dairy':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'meat':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'parve':
    case 'pareve':
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};
