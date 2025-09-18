"use client"

import { useCallback, useMemo, useRef, useState, useEffect, memo } from "react"
import { ArrowLeft, Heart, Share, Eye, Flag } from "lucide-react"

// Spring physics hook
function useSpring(target: number, config: { stiffness?: number; damping?: number; mass?: number } = {}) {
  const { stiffness = 120, damping = 14, mass = 1 } = config;
  const [value, setValue] = useState(target);
  const velocity = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      const displacement = target - value;
      const force = displacement * stiffness;
      const dampingForce = velocity.current * damping;
      const acceleration = (force - dampingForce) / mass;
      
      velocity.current += acceleration * 0.016;
      const newValue = value + velocity.current * 0.016;
      setValue(newValue);

      if (Math.abs(displacement) > 0.01 || Math.abs(velocity.current) > 0.01) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, stiffness, damping, mass, value]);

  return value;
}

// Magnetic hover effect hook
function useMagneticHover(strength = 0.3) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const elementRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!elementRef.current) return;
    
    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    
    setMousePosition({ x: deltaX, y: deltaY });
  }, [strength]);

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setIsHovering(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return {
    elementRef,
    mousePosition,
    isHovering,
    magneticProps: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    }
  };
}

// Particle system
function useParticleTrail() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
  }>>([]);
  const particleId = useRef(0);

  const addParticle = useCallback((x: number, y: number) => {
    const newParticle = {
      id: particleId.current++,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      size: Math.random() * 4 + 2,
    };
    
    setParticles(prev => [...prev, newParticle]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);
  }, []);

  const updateParticles = useCallback(() => {
    setParticles(prev => prev.map(particle => ({
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      life: particle.life - 0.02,
      vx: particle.vx * 0.98,
      vy: particle.vy * 0.98,
    })).filter(p => p.life > 0));
  }, []);

  useEffect(() => {
    const interval = setInterval(updateParticles, 16);
    return () => clearInterval(interval);
  }, [updateParticles]);

  return { particles, addParticle };
}

// Animated number hook
function useAnimatedNumber(target: number, duration = 400) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = value;
    const to = target;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      setValue(from + (to - from) * eased);
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration, value]);

  return Math.round(value);
}

// Haptic feedback utility
const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
  if (navigator.vibrate) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 10, 10]
    };
    navigator.vibrate(patterns[type] || patterns.light);
  }
};

// Enhanced button component
const SpringButton = memo(({ 
  onClick, 
  children, 
  className = "", 
  isActive = false,
  glowColor: _glowColor = 'white',
  'aria-label': ariaLabel,
  ...props 
}: {
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  glowColor?: string;
  'aria-label'?: string;
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { elementRef, mousePosition, magneticProps } = useMagneticHover(0.2);
  const { particles, addParticle } = useParticleTrail();
  
  const springX = useSpring(isPressed ? 0 : mousePosition.x, { stiffness: 100, damping: 15 });
  const springY = useSpring(isPressed ? 0 : mousePosition.y, { stiffness: 100, damping: 15 });
  const springScale = useSpring(isPressed ? 0.95 : 1, { stiffness: 200, damping: 20 });

  const handlePress = useCallback((e: React.MouseEvent) => {
    setIsPressed(true);
    hapticFeedback('light');
    setTimeout(() => setIsPressed(false), 150);
    onClick?.(e);
  }, [onClick]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const rect = elementRef.current?.getBoundingClientRect();
      if (rect) {
        addParticle(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }
    }
  }, [isDragging, addParticle]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      ref={elementRef}
      onClick={handlePress}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      className={`
        group relative backdrop-blur-md shadow-sm
        hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black/50
        transition-all duration-200 overflow-hidden
        ${isActive 
          ? `bg-gradient-to-br from-rose-100 to-rose-50 shadow-rose-200` 
          : 'hover:bg-gray-50'
        }
        ${className}
      `}
      style={{
        backgroundColor: isActive ? undefined : 'rgba(241, 241, 241, 0.6)',
        backdropFilter: 'blur(20px)',
        border: 'none',
        transform: `translate(${springX}px, ${springY}px) scale(${springScale})`,
      }}
      aria-label={ariaLabel}
      {...magneticProps}
      onMouseMove={(e) => {
        magneticProps.onMouseMove(e);
        handleDrag(e);
      }}
      {...props}
    >
      {/* Particle trail */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute pointer-events-none rounded-full bg-blue-400"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            opacity: particle.life,
            transform: `scale(${particle.life})`,
          }}
        />
      ))}
      
      {/* Glow effect when active */}
      {isActive && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-200/30 to-transparent animate-pulse pointer-events-none" />
      )}
      
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {children}
    </button>
  );
});
SpringButton.displayName = 'SpringButton';

// Report Modal Component
const ReportModal = memo(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedReason, 
  onReasonSelect, 
  isSubmitting 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  selectedReason: string;
  onReasonSelect: (reason: string) => void;
  isSubmitting: boolean;
}) => {
  const reportReasons = [
    'Spam or unwanted content',
    'Inappropriate or offensive content',
    'Misinformation or false information',
    'Copyright violation',
    'Privacy concerns',
    'Harassment or bullying',
    'Other'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
        style={{ animation: 'modalSlideIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Report Content</h2>
          <p className="text-sm text-gray-600">Help us understand what&apos;s wrong with this content</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
          {reportReasons.map((reason) => (
            <label 
              key={reason}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors duration-200"
            >
              <input
                type="radio"
                name="reportReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => onReasonSelect(e.target.value)}
                className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-800 leading-relaxed">{reason}</span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!selectedReason || isSubmitting}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors duration-200"
          >
            {isSubmitting ? 'Reporting...' : 'Report'}
          </button>
        </div>
      </div>
    </div>
  );
});
ReportModal.displayName = 'ReportModal';

// Toast Container Component
const ToastContainer = memo(({ toasts }: { toasts: Array<{ id: string; text: string }> }) => {
  const visibleToasts = toasts.slice(-3);
  
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {visibleToasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/95 backdrop-blur-sm
                     border border-black/10 rounded-full px-4 py-2 shadow-lg
                     text-sm font-medium text-gray-800"
          style={{
            animation: `slideInFromTop 0.3s ease-out ${index * 0.1}s both`,
            transform: `translateY(${index * 4}px)`,
          }}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
});
ToastContainer.displayName = 'ToastContainer';

interface ListingHeaderProps {
  shareCount?: number
  viewCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
  onShared?: () => void // optional hook to show a toast/snackbar upstream
  onReport?: () => void // optional report callback
}


function formatCount(n?: number): string {
  if (typeof n !== "number") return "0"
  const fmt = new Intl.NumberFormat(undefined, { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 })
  return fmt.format(n)
}

export function ListingHeader({
  shareCount,
  viewCount,
  onBack,
  onFavorite,
  isFavorited = false,
  onShared,
  onReport,
}: ListingHeaderProps) {
  // Internal state for enhanced interactions
  const [internalViewCount, setInternalViewCount] = useState(viewCount || 0);
  const [internalShareCount, setInternalShareCount] = useState(shareCount || 0);
  const [internalIsFavorited, setInternalIsFavorited] = useState(isFavorited);
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  // Toast state
  const [toasts, setToasts] = useState<Array<{ id: string; text: string }>>([]);
  const toastTimeoutsRef = useRef(new Map<string, NodeJS.Timeout>());

  // Animated numbers
  const animatedViews = useAnimatedNumber(internalViewCount);
  const animatedShares = useAnimatedNumber(internalShareCount);

  // Heart particles for favorite animation
  const heartParticles = useMemo(() => {
    if (!internalIsFavorited) return [];
    
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 30,
      y: -Math.random() * 25 - 5,
      rotation: (Math.random() - 0.5) * 60,
      duration: 0.6 + Math.random() * 0.4,
      size: 6 + Math.random() * 6,
      delay: i * 0.06
    }));
  }, [internalIsFavorited]);

  // Toast management
  const addToast = useCallback((text: string) => {
    const id = crypto.randomUUID?.() || `toast-${Date.now()}-${Math.random()}`;
    
    setToasts(prev => [...prev, { id, text }]);
    
    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
      toastTimeoutsRef.current.delete(id);
    }, 2500);
    
    toastTimeoutsRef.current.set(id, timeout);
  }, []);

  // Cleanup toasts on unmount
  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const handleReport = useCallback(() => {
    hapticFeedback('medium');
    setShowReportModal(true);
  }, []);

  const handleReportSubmit = useCallback(async () => {
    if (!selectedReportReason) return;
    
    setIsSubmittingReport(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call external report callback if provided
      onReport?.();
      
      setShowReportModal(false);
      setSelectedReportReason('');
      addToast("Content reported. Thank you for the feedback.");
    } catch (_error) {
      addToast("Report failed. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  }, [selectedReportReason, onReport, addToast]);

  const handleReportClose = useCallback(() => {
    setShowReportModal(false);
    setSelectedReportReason('');
  }, []);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    
    // Increment share count with animation
    setInternalShareCount(prev => prev + 1);
    hapticFeedback('medium');
    
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check this out", url })
        addToast("Shared successfully!");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        addToast("Link copied to clipboard");
      } else {
        // Ultimate fallback for ancient browsers
        const sel = document.createElement("input")
        sel.value = url
        document.body.appendChild(sel)
        sel.select()
        document.execCommand("copy")
        sel.remove()
        addToast("Link copied to clipboard");
      }
      onShared?.()
    } catch (error: any) {
      // Revert share count if sharing failed
      setInternalShareCount(prev => Math.max(0, prev - 1));
      if (error.name !== 'AbortError') {
        addToast("Share failed");
      }
    }
  }, [onShared, addToast])

  const handleFavorite = useCallback(async (_e: React.MouseEvent) => {
    const newFavoriteState = !internalIsFavorited;
    setInternalIsFavorited(newFavoriteState);
    hapticFeedback(newFavoriteState ? 'success' : 'light');
    
    addToast(newFavoriteState ? "Added to favorites" : "Removed from favorites");
    
    // Call original callback
    onFavorite?.();
  }, [internalIsFavorited, onFavorite, addToast]);

  const handleViewsClick = useCallback(() => {
    setInternalViewCount(prev => prev + Math.floor(1 + Math.random() * 3));
    hapticFeedback('light');
    addToast(`Total views: ${formatCount(internalViewCount + Math.floor(1 + Math.random() * 3))}`);
  }, [internalViewCount, addToast]);

  return (
    <div className="px-3">
      <div
        className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 rounded-full w-full overflow-hidden bg-background/80 dark:bg-background/60 border border-border/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur shadow-md"
        style={{
          // Match the image container width exactly
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Back */}
        {onBack && (
          <SpringButton
            onClick={onBack}
            aria-label="Go back"
            className="h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-black transition-all duration-200 group-hover:-translate-x-1" />
          </SpringButton>
        )}

        {/* Report Flag */}
        <SpringButton
          onClick={handleReport}
          aria-label="Report content"
          className="h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0 rounded-full flex items-center justify-center"
        >
          <Flag className="h-3 w-3 sm:h-4 sm:w-4 text-black transition-all duration-200 group-hover:-translate-y-1" />
        </SpringButton>

        {/* View count */}
        {typeof viewCount === "number" && viewCount >= 0 && (
          <SpringButton
            onClick={handleViewsClick}
            aria-label={`${formatCount(animatedViews)} views`}
            className="h-8 sm:h-10 px-2 sm:px-3 rounded-full flex items-center gap-1 sm:gap-1.5 min-w-0 flex-shrink-0"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 transition-all duration-200 group-hover:scale-125 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold tabular-nums text-black whitespace-nowrap">
              {formatCount(animatedViews)}
            </span>
          </SpringButton>
        )}

        {/* Share with count */}
          {typeof shareCount !== "undefined" && (
          <SpringButton
              onClick={handleShare}
            aria-label={`Share (${formatCount(animatedShares)} shares)`}
            className="h-8 sm:h-10 px-2 sm:px-3 rounded-full flex items-center gap-1 sm:gap-1.5 min-w-0 flex-shrink-0"
          >
            <Share className="h-3 w-3 sm:h-4 sm:w-4 text-black transition-all duration-200 group-hover:scale-125 group-hover:rotate-12 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold tabular-nums text-black whitespace-nowrap">
              {formatCount(animatedShares)}
            </span>
          </SpringButton>
        )}

        {/* Heart with favorite state */}
          {onFavorite && (
          <SpringButton
            onClick={handleFavorite}
            isActive={internalIsFavorited}
            aria-label={internalIsFavorited ? "Remove from favorites" : "Add to favorites"}
            className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-full flex items-center justify-center"
          >
            <div className="relative flex-shrink-0">
              <Heart
                className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 group-hover:scale-125
                           ${internalIsFavorited 
                             ? 'text-rose-600 fill-rose-500 animate-pulse' 
                             : 'text-black group-hover:text-rose-500'
                           }`} 
              />
              
              {internalIsFavorited && heartParticles.map(particle => (
                <div
                  key={particle.id}
                  className="absolute left-1/2 top-1/2 pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`,
                    animation: `heartBounce ${particle.duration}s ease-out ${particle.delay}s both`
                  }}
                >
                  <Heart 
                    className="text-rose-400 fill-rose-400" 
                    style={{ width: particle.size, height: particle.size }} 
                  />
                </div>
              ))}
            </div>
          </SpringButton>
        )}
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} />
      
      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={handleReportClose}
        onSubmit={handleReportSubmit}
        selectedReason={selectedReportReason}
        onReasonSelect={setSelectedReportReason}
        isSubmitting={isSubmittingReport}
      />
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes heartBounce {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(0px, 0px) rotate(0deg) scale(0.3);
          }
          50% {
            transform: translate(-50%, -50%) translate(var(--x, 0px), calc(var(--y, 0px) * 0.7)) rotate(var(--rotation, 0deg)) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) rotate(var(--rotation, 0deg)) scale(0.8);
          }
        }
        
        @keyframes slideInFromTop {
          from {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes modalSlideIn {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}