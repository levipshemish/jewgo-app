'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketplaceCategory } from '@/lib/types/marketplace';
import { useMobileTouch } from '@/lib/hooks/useMobileTouch';
import { titleCase } from '@/lib/utils/stringUtils';

interface CategoryCardProps {
  category: MarketplaceCategory;
  variant?: 'default' | 'compact' | 'featured';
  onClick?: (category: MarketplaceCategory) => void;
  className?: string;
}

export default function CategoryCard({ 
  category, 
  variant = 'default',
  onClick,
  className = ''
}: CategoryCardProps) {
  const router = useRouter();
  const { handleImmediateTouch, isMobile } = useMobileTouch();
  
  const isMobileDevice = isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768);

  const handleClick = handleImmediateTouch(() => {
    if (onClick) {
      onClick(category);
    } else {
      router.push(`/marketplace/category/${category.id}`);
    }
  });

  const getGradientStyle = () => {
    const color = category.color;
    return {
      background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
      borderColor: color
    };
  };

  // Use regular divs on mobile to avoid framer-motion conflicts
  const CardContainer = isMobileDevice ? 'div' : motion.div;

  // Default variant (matching EateryCard design)
  if (variant === 'default') {
    return (
      <CardContainer
        onClick={handleClick}
        className={`w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation category-card ${className}`}
        data-clickable="true"
        {...(isMobileDevice ? {} : {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3, ease: "easeOut" },
          whileHover: { 
            scale: 1.02,
            transition: { duration: 0.2 }
          },
          whileTap: { 
            scale: 0.98,
            transition: { duration: 0.1 }
          }
        })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
        aria-label={`Browse ${category.name} products`}
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
          position: 'relative',
          zIndex: 1,
          ...(isMobileDevice && {
            opacity: 1,
            transform: 'scale(1)'
          })
        }}
      >
        {/* Category Container - Using balanced aspect ratio like EateryCard */}
        <div className="relative aspect-[5/4] overflow-hidden rounded-3xl" style={getGradientStyle()}>
          {/* Category Icon - Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl text-gray-700">
              {category.icon}
            </div>
          </div>

          {/* Category Name - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2">
            <h3 className="text-sm font-medium text-gray-900 leading-tight text-center">
              {titleCase(category.name)}
            </h3>
            <p className="text-xs text-gray-500 text-center mt-0.5">
              {category.productCount} items
            </p>
          </div>
        </div>
      </CardContainer>
    );
  }

  // Compact variant - Even more compact for marketplace
  if (variant === 'compact') {
    return (
      <div 
        onClick={handleClick}
        className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
        role="button"
        tabIndex={0}
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl" style={getGradientStyle()}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl text-gray-700">
              {category.icon}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2">
            <h3 className="text-xs font-medium text-gray-900 leading-tight text-center">
              {titleCase(category.name)}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  // Featured variant - Slightly larger but still compact
  if (variant === 'featured') {
    return (
      <CardContainer
        onClick={handleClick}
        className={`w-full text-left bg-transparent border-0 p-0 m-0 transition-all duration-300 cursor-pointer touch-manipulation category-card ${className}`}
        data-clickable="true"
        {...(isMobileDevice ? {} : {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3, ease: "easeOut" },
          whileHover: { 
            scale: 1.02,
            transition: { duration: 0.2 }
          },
          whileTap: { 
            scale: 0.98,
            transition: { duration: 0.1 }
          }
        })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
        aria-label={`Browse ${category.name} products`}
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
          position: 'relative',
          zIndex: 1,
          ...(isMobileDevice && {
            opacity: 1,
            transform: 'scale(1)'
          })
        }}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl" style={getGradientStyle()}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-3xl text-gray-700">
              {category.icon}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-3">
            <h3 className="text-sm font-semibold text-gray-900 leading-tight text-center">
              {titleCase(category.name)}
            </h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              {category.productCount} items
            </p>
          </div>
        </div>
      </CardContainer>
    );
  }

  return null;
}
