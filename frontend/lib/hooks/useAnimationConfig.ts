import { useMemo, useEffect, useState, useCallback } from 'react';

export interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
  stagger?: number;
}

export interface AnimationPresets {
  fast: AnimationConfig;
  normal: AnimationConfig;
  slow: AnimationConfig;
  spring: AnimationConfig;
  bounce: AnimationConfig;
  elastic: AnimationConfig;
}

export interface UseAnimationConfigOptions {
  /**
   * Whether to respect user's reduced motion preference
   */
  respectReducedMotion?: boolean;
  /**
   * Whether animations are enabled
   */
  enabled?: boolean;
  /**
   * Custom animation presets
   */
  customPresets?: Partial<AnimationPresets>;
  /**
   * Default preset to use
   */
  defaultPreset?: keyof AnimationPresets;
}

export interface UseAnimationConfigReturn {
  /**
   * Animation presets
   */
  presets: AnimationPresets;
  /**
   * Whether animations are enabled
   */
  enabled: boolean;
  /**
   * Whether reduced motion is preferred
   */
  prefersReducedMotion: boolean;
  /**
   * Get animation config for a preset
   */
  getConfig: (preset: keyof AnimationPresets) => AnimationConfig;
  /**
   * Get responsive animation config
   */
  getResponsiveConfig: (configs: Partial<Record<'mobile' | 'tablet' | 'desktop', AnimationConfig>>) => AnimationConfig;
  /**
   * Check if animation should be disabled
   */
  shouldDisableAnimation: (preset?: keyof AnimationPresets) => boolean;
  /**
   * Get motion props for Framer Motion
   */
  getMotionProps: (preset: keyof AnimationPresets, customProps?: Partial<AnimationConfig>) => {
    initial: any;
    animate: any;
    exit: any;
    transition: any;
  };
}

const DEFAULT_PRESETS: AnimationPresets = {
  fast: {
    duration: 0.15,
    ease: 'easeOut',
  },
  normal: {
    duration: 0.3,
    ease: 'easeInOut',
  },
  slow: {
    duration: 0.5,
    ease: 'easeInOut',
  },
  spring: {
    duration: 0.6,
    ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  bounce: {
    duration: 0.8,
    ease: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  elastic: {
    duration: 1.2,
    ease: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

export function useAnimationConfig(options: UseAnimationConfigOptions = {}): UseAnimationConfigReturn {
  const {
    respectReducedMotion = true,
    enabled = true,
    customPresets = {},
    defaultPreset = 'normal',
  } = options;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check user's motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Merge custom presets with defaults
  const presets = useMemo(() => ({
    ...DEFAULT_PRESETS,
    ...customPresets,
  }), [customPresets]);

  // Check if animations should be disabled
  const shouldDisableAnimation = useCallback((_preset?: keyof AnimationPresets) => {
    if (!enabled) return true;
    if (respectReducedMotion && prefersReducedMotion) return true;
    return false;
  }, [enabled, respectReducedMotion, prefersReducedMotion]);

  // Get animation config for a preset
  const getConfig = useCallback((preset: keyof AnimationPresets): AnimationConfig => {
    return presets[preset] || presets[defaultPreset];
  }, [presets, defaultPreset]);

  // Get responsive animation config
  const getResponsiveConfig = useCallback((
    configs: Partial<Record<'mobile' | 'tablet' | 'desktop', AnimationConfig>>
  ): AnimationConfig => {
    if (typeof window === 'undefined') {
      return configs.desktop || presets[defaultPreset];
    }

    const width = window.innerWidth;
    
    if (width < 768 && configs.mobile) {
      return configs.mobile;
    } else if (width < 1024 && configs.tablet) {
      return configs.tablet;
    } else {
      return configs.desktop || presets[defaultPreset];
    }
  }, [presets, defaultPreset]);

  // Get motion props for Framer Motion
  const getMotionProps = useCallback((
    preset: keyof AnimationPresets,
    customProps?: Partial<AnimationConfig>
  ) => {
    const baseConfig = getConfig(preset);
    const config = { ...baseConfig, ...customProps };
    
    if (shouldDisableAnimation(preset)) {
      return {
        initial: false,
        animate: false,
        exit: false,
        transition: { duration: 0 },
      };
    }

    return {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: config,
    };
  }, [getConfig, shouldDisableAnimation]);

  return {
    presets,
    enabled,
    prefersReducedMotion,
    getConfig,
    getResponsiveConfig,
    shouldDisableAnimation,
    getMotionProps,
  };
}

// Specialized animation hooks
export function useFastAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('fast'),
    disabled: shouldDisableAnimation('fast'),
  };
}

export function useNormalAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('normal'),
    disabled: shouldDisableAnimation('normal'),
  };
}

export function useSlowAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('slow'),
    disabled: shouldDisableAnimation('slow'),
  };
}

export function useSpringAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('spring'),
    disabled: shouldDisableAnimation('spring'),
  };
}

export function useBounceAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('bounce'),
    disabled: shouldDisableAnimation('bounce'),
  };
}

export function useElasticAnimation() {
  const { getConfig, shouldDisableAnimation } = useAnimationConfig();
  return {
    config: getConfig('elastic'),
    disabled: shouldDisableAnimation('elastic'),
  };
}

// Utility function to create staggered animations
export function createStaggeredAnimation(
  items: any[],
  baseConfig: AnimationConfig,
  staggerDelay: number = 0.1
) {
  return items.map((_, index) => ({
    ...baseConfig,
    delay: (baseConfig.delay || 0) + (index * staggerDelay),
  }));
}

// Utility function to create entrance animations
export function createEntranceAnimation(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  config: AnimationConfig
) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 20, opacity: 0 };
      case 'down':
        return { y: -20, opacity: 0 };
      case 'left':
        return { x: 20, opacity: 0 };
      case 'right':
        return { x: -20, opacity: 0 };
      default:
        return { y: 20, opacity: 0 };
    }
  };

  return {
    initial: getInitialPosition(),
    animate: { x: 0, y: 0, opacity: 1 },
    exit: getInitialPosition(),
    transition: config,
  };
}
