/**
 * Framer Motion animation variants for consistent UI animations
 * @fileoverview Centralized animation definitions for FamilyLoad
 */

import type { Variants, Transition } from "framer-motion"

// ============================================
// TIMING & EASING CONSTANTS
// ============================================

export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  verySlow: 0.5,
} as const

export const easings = {
  easeOut: [0.0, 0.0, 0.2, 1] as const,
  easeIn: [0.4, 0.0, 1, 1] as const,
  easeInOut: [0.4, 0.0, 0.2, 1] as const,
  spring: { type: "spring", stiffness: 400, damping: 30 } as const,
  bounce: { type: "spring", stiffness: 600, damping: 15 } as const,
} as const

// Default transition
export const defaultTransition: Transition = {
  duration: durations.normal,
  ease: easings.easeOut,
}

// ============================================
// FADE ANIMATIONS
// ============================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: defaultTransition },
  exit: { opacity: 0, transition: { duration: durations.fast } },
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.fast },
  },
}

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: durations.fast },
  },
}

// ============================================
// SLIDE ANIMATIONS
// ============================================

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: durations.fast },
  },
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: durations.fast },
  },
}

export const slideOutRight: Variants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: durations.normal, ease: easings.easeIn },
  },
}

export const slideOutLeft: Variants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: durations.normal, ease: easings.easeIn },
  },
}

// ============================================
// SCALE ANIMATIONS
// ============================================

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: durations.fast },
  },
}

export const scaleInBounce: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: easings.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: durations.fast },
  },
}

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: easings.bounce,
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: durations.fast },
  },
}

// ============================================
// LIST/STAGGER ANIMATIONS
// ============================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: durations.fast },
  },
}

export const staggerItemScale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: durations.fast },
  },
}

// ============================================
// TASK CARD SPECIFIC ANIMATIONS
// ============================================

export const taskCardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
}

export const taskCompleteVariants: Variants = {
  initial: { scale: 1 },
  complete: {
    scale: [1, 1.05, 0.95, 1],
    transition: {
      duration: durations.slow,
      times: [0, 0.2, 0.5, 1],
    },
  },
}

export const taskDeleteVariants: Variants = {
  initial: { opacity: 1, x: 0, height: "auto" },
  exit: {
    opacity: 0,
    x: -100,
    height: 0,
    marginBottom: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
}

// ============================================
// MODAL/DIALOG ANIMATIONS
// ============================================

export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: durations.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast },
  },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: durations.fast },
  },
}

export const sheetContent: Variants = {
  initial: { x: "100%" },
  animate: {
    x: 0,
    transition: {
      duration: durations.slow,
      ease: easings.easeOut,
    },
  },
  exit: {
    x: "100%",
    transition: {
      duration: durations.normal,
      ease: easings.easeIn,
    },
  },
}

// ============================================
// VOCAL BUTTON ANIMATIONS
// ============================================

export const pulseAnimation: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

export const recordingRing: Variants = {
  initial: { scale: 1, opacity: 0.5 },
  recording: {
    scale: [1, 1.3, 1],
    opacity: [0.5, 0, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

export const waveformBar: Variants = {
  initial: { scaleY: 0.3 },
  animate: (i: number) => ({
    scaleY: [0.3, 1, 0.3],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      delay: i * 0.1,
      ease: "easeInOut",
    },
  }),
}

export const successCheck: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: durations.slow, ease: easings.easeOut },
      opacity: { duration: durations.fast },
    },
  },
}

export const errorShake: Variants = {
  initial: { x: 0 },
  error: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  },
}

// ============================================
// LOADING ANIMATIONS
// ============================================

export const shimmer: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

export const skeletonPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a stagger container with custom stagger delay
 */
export function createStaggerContainer(staggerDelay = 0.05): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }
}

/**
 * Creates a custom fade-in-up animation with custom distance
 */
export function createFadeInUp(yOffset = 10): Variants {
  return {
    initial: { opacity: 0, y: yOffset },
    animate: {
      opacity: 1,
      y: 0,
      transition: defaultTransition,
    },
    exit: {
      opacity: 0,
      y: -yOffset,
      transition: { duration: durations.fast },
    },
  }
}

/**
 * Creates a custom slide animation
 */
export function createSlideX(
  direction: "left" | "right",
  distance = 20
): Variants {
  const sign = direction === "left" ? -1 : 1

  return {
    initial: { opacity: 0, x: sign * distance },
    animate: {
      opacity: 1,
      x: 0,
      transition: defaultTransition,
    },
    exit: {
      opacity: 0,
      x: sign * distance,
      transition: { duration: durations.fast },
    },
  }
}

/**
 * Creates a custom vertical slide animation
 */
export function createSlideY(
  direction: "up" | "down",
  distance = 20
): Variants {
  const sign = direction === "up" ? -1 : 1

  return {
    initial: { opacity: 0, y: sign * distance },
    animate: {
      opacity: 1,
      y: 0,
      transition: defaultTransition,
    },
    exit: {
      opacity: 0,
      y: sign * distance,
      transition: { duration: durations.fast },
    },
  }
}

// ============================================
// CSS ANIMATION CLASSES (for non-motion elements)
// ============================================

export const cssAnimations = {
  fadeIn: "animate-in fade-in duration-200",
  fadeOut: "animate-out fade-out duration-150",
  slideInFromTop: "animate-in slide-in-from-top duration-200",
  slideInFromBottom: "animate-in slide-in-from-bottom duration-200",
  slideInFromLeft: "animate-in slide-in-from-left duration-200",
  slideInFromRight: "animate-in slide-in-from-right duration-200",
  scaleIn: "animate-in zoom-in-95 duration-200",
  scaleOut: "animate-out zoom-out-95 duration-150",
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
} as const
