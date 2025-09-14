import React, { useState, useRef, useCallback, useEffect } from 'react';

interface UseScrollSnapCarouselOptions {
  totalSlides: number;
  debounceMs?: number;
  onSlideChange?: (index: number) => void;
}

interface UseScrollSnapCarouselReturn {
  currentIndex: number;
  isDragging: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerLeave: (e: React.PointerEvent) => void;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export const useScrollSnapCarousel = ({
  totalSlides,
  debounceMs = 50,
  onSlideChange
}: UseScrollSnapCarouselOptions): UseScrollSnapCarouselReturn => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartScrollLeft, setDragStartScrollLeft] = useState(0);
  const [isHorizontalDrag, setIsHorizontalDrag] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update current index based on scroll position
  const updateCurrentIndex = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / containerWidth);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalSlides) {
      setCurrentIndex(newIndex);
      onSlideChange?.(newIndex);
    }
  }, [currentIndex, totalSlides, onSlideChange]);

  // Debounced scroll handler with improved performance
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isScrolling = false;
    
    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(() => {
          isScrolling = false;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(updateCurrentIndex, debounceMs);
        });
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [updateCurrentIndex, debounceMs]);

  // Pointer Events for better touch handling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!scrollContainerRef.current) {
      return;
    }
    
    setIsDragging(true);
    setIsHorizontalDrag(false);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setDragStartScrollLeft(scrollContainerRef.current.scrollLeft);
    
    // Set pointer capture for better touch handling
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !scrollContainerRef.current) {
      return;
    }
    
    const container = scrollContainerRef.current;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // Determine if this is a horizontal drag (threshold: 8px)
    if (!isHorizontalDrag && Math.abs(deltaX) > 8) {
      setIsHorizontalDrag(true);
    }
    
    // Only handle horizontal drags to prevent interference with vertical scrolling
    if (isHorizontalDrag || Math.abs(deltaX) > Math.abs(deltaY)) {
      const newScrollLeft = dragStartScrollLeft - deltaX;
      container.scrollLeft = newScrollLeft;
      
      // Prevent default to avoid text selection and other browser behaviors
      e.preventDefault();
    }
  }, [isDragging, isHorizontalDrag, dragStartX, dragStartY, dragStartScrollLeft]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!scrollContainerRef.current) {
      return;
    }
    
    setIsDragging(false);
    setIsHorizontalDrag(false);
    
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (!scrollContainerRef.current) {
      return;
    }
    
    setIsDragging(false);
    setIsHorizontalDrag(false);
    
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    if (!scrollContainerRef.current || index < 0 || index >= totalSlides) {
      return;
    }
    
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth;
    
    // Use instant scroll to prevent flickering during smooth scroll
    container.scrollTo({
      left: index * containerWidth,
      behavior: 'auto'
    });
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    const nextIndex = (currentIndex + 1) % totalSlides;
    goToSlide(nextIndex);
  }, [currentIndex, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    goToSlide(prevIndex);
  }, [currentIndex, totalSlides, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return {
    currentIndex,
    isDragging,
    scrollContainerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    goToSlide,
    nextSlide,
    prevSlide
  };
};
