'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Phone, Globe2, Heart } from 'lucide-react';

interface StickyCTAProps {
  restaurant?: {
    name: string;
    phone_number?: string;
    website?: string;
  };
  onOrderClick?: () => void;
  onCallClick?: () => void;
  onWebsiteClick?: () => void;
  onFavoriteClick?: () => void;
  isFavorite?: boolean;
  className?: string;
}

const StickyCTA: React.FC<StickyCTAProps> = ({
  restaurant, onOrderClick, onCallClick, onWebsiteClick, onFavoriteClick, isFavorite = false, className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show CTA after scrolling down 200px
      if (currentScrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3 
          }}
          className={`fixed bottom-20 left-0 right-0 z-40 px-4 ${className}`}
        >
          <div className="max-w-screen-md mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                {/* Restaurant Name - Truncated */}
                {restaurant && (
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-gray-500">Ready to order?</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Order Button - Primary CTA */}
                  <motion.button
                    onClick={onOrderClick}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline">Order Now</span>
                    <span className="sm:hidden">Order</span>
                  </motion.button>

                  {/* Secondary Actions */}
                  <div className="flex items-center gap-1">
                    {/* Call Button */}
                    {restaurant?.phone_number && (
                      <motion.button
                        onClick={onCallClick}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center justify-center transition-all duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Call restaurant"
                      >
                        <Phone className="w-4 h-4" />
                      </motion.button>
                    )}

                    {/* Website Button */}
                    {restaurant?.website && (
                      <motion.button
                        onClick={onWebsiteClick}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center justify-center transition-all duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Visit website"
                      >
                        <Globe2 className="w-4 h-4" />
                      </motion.button>
                    )}

                    {/* Favorite Button */}
                    <motion.button
                      onClick={onFavoriteClick}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isFavorite 
                          ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart 
                        className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} 
                      />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTA; 