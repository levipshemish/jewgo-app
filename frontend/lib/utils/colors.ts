/**
 * JewGo Brand Colors
 * 
 * This file defines the official JewGo color palette and provides
 * utility functions for consistent color usage across the application.
 */

// JewGo Brand Colors
export const JEWGO_COLORS = {
  // Light Blue (#ADD8E6) - ORB, Kosher Miami, DAIRY, MEN
  lightBlue: {
    hex: '#ADD8E6',
    bg: 'bg-[#ADD8E6]',
    text: 'text-[#ADD8E6]',
    border: 'border-[#ADD8E6]',
    bgLight: 'bg-[#ADD8E6]/10',
    textDark: 'text-[#1a4a5a]',
  },
  
  // Green (#74E1A0) - CHABAD, ASHKENAZI, SEFARDIC, CHASSIDISH, ISRAELI
  green: {
    hex: '#74E1A0',
    bg: 'bg-[#74E1A0]',
    text: 'text-[#74E1A0]',
    border: 'border-[#74E1A0]',
    bgLight: 'bg-[#74E1A0]/10',
    textDark: 'text-[#1a4a2a]',
  },
  
  // Dark Red (#A70000) - MEAT
  darkRed: {
    hex: '#A70000',
    bg: 'bg-[#A70000]',
    text: 'text-[#A70000]',
    border: 'border-[#A70000]',
    bgLight: 'bg-[#A70000]/10',
    textLight: 'text-white',
  },
  
  // Gray (#BBBBBB) - CHALAV STAM
  gray: {
    hex: '#BBBBBB',
    bg: 'bg-[#BBBBBB]',
    text: 'text-[#BBBBBB]',
    border: 'border-[#BBBBBB]',
    bgLight: 'bg-[#BBBBBB]/10',
    textDark: 'text-[#4a4a4a]',
  },
  
  // Yellow (#FFCE6D) - PAREVE, KEILIM
  yellow: {
    hex: '#FFCE6D',
    bg: 'bg-[#FFCE6D]',
    text: 'text-[#FFCE6D]',
    border: 'border-[#FFCE6D]',
    bgLight: 'bg-[#FFCE6D]/10',
    textDark: 'text-[#8a5a1a]',
  },
  
  // Light Pink (#FCC0C5) - WOMEN, CHALAV YISROEL
  lightPink: {
    hex: '#FCC0C5',
    bg: 'bg-[#FCC0C5]',
    text: 'text-[#FCC0C5]',
    border: 'border-[#FCC0C5]',
    bgLight: 'bg-[#FCC0C5]/10',
    textDark: 'text-[#8a4a4a]',
  },
} as const;

// Kosher Category Color Mapping
export const KOSHER_CATEGORY_COLORS = {
  meat: {
    bg: JEWGO_COLORS.darkRed.bg,
    text: JEWGO_COLORS.darkRed.textLight,
    bgLight: JEWGO_COLORS.darkRed.bgLight,
    textDark: JEWGO_COLORS.darkRed.text,
    border: JEWGO_COLORS.darkRed.border,
  },
  dairy: {
    bg: JEWGO_COLORS.lightBlue.bg,
    text: JEWGO_COLORS.lightBlue.textDark,
    bgLight: JEWGO_COLORS.lightBlue.bgLight,
    textDark: JEWGO_COLORS.lightBlue.textDark,
    border: JEWGO_COLORS.lightBlue.border,
  },
  pareve: {
    bg: JEWGO_COLORS.yellow.bg,
    text: JEWGO_COLORS.yellow.textDark,
    bgLight: JEWGO_COLORS.yellow.bgLight,
    textDark: JEWGO_COLORS.yellow.textDark,
    border: JEWGO_COLORS.yellow.border,
  },
} as const;

// Certifying Agency Color Mapping
export const CERTIFYING_AGENCY_COLORS = {
  // Light Blue (#ADD8E6)
  'ORB': JEWGO_COLORS.lightBlue,
  'KM': JEWGO_COLORS.lightBlue,

  'DIAMOND-K': JEWGO_COLORS.lightBlue,
  'DAIRY': JEWGO_COLORS.lightBlue,
  'MEN': JEWGO_COLORS.lightBlue,
  
  // Green (#74E1A0)
  'CHABAD': JEWGO_COLORS.green,
  'ASHKENAZI': JEWGO_COLORS.green,
  'SEFARDIC': JEWGO_COLORS.green,
  'CHASSIDISH': JEWGO_COLORS.green,
  'ISRAELI': JEWGO_COLORS.green,
  
  // Gray (#BBBBBB)
  'CHALAV STAM': JEWGO_COLORS.gray,
  
  // Yellow (#FFCE6D)
  'PAREVE': JEWGO_COLORS.yellow,
  'KEILIM': JEWGO_COLORS.yellow,
  
  // Light Pink (#FCC0C5)
  'WOMEN': JEWGO_COLORS.lightPink,
  'CHALAV YISROEL': JEWGO_COLORS.lightPink,
} as const;

// Utility Functions
export const getKosherCategoryColors = (category: 'meat' | 'dairy' | 'pareve') => {
  return KOSHER_CATEGORY_COLORS[category] || KOSHER_CATEGORY_COLORS.pareve;
};

export const getCertifyingAgencyColors = (agency: string) => {
  const upperAgency = agency.toUpperCase();
  return CERTIFYING_AGENCY_COLORS[upperAgency as keyof typeof CERTIFYING_AGENCY_COLORS] || JEWGO_COLORS.gray;
};

export const getKosherCategoryBadgeClasses = (category: 'meat' | 'dairy' | 'pareve', variant: 'solid' | 'light' = 'solid') => {
  const colors = getKosherCategoryColors(category);
  
  if (variant === 'light') {
    return `${colors.bgLight} ${colors.textDark} ${colors.border} border`;
  }
  
  return `${colors.bg} ${colors.text} shadow-md`;
};

export const getCertifyingAgencyBadgeClasses = (agency: string, variant: 'solid' | 'light' = 'solid') => {
  const colors = getCertifyingAgencyColors(agency);
  
  if (variant === 'light') {
    return `${colors.bgLight} ${colors.textDark} ${colors.border} border`;
  }
  
  return `${colors.bg} ${colors.text} shadow-md`;
}; 