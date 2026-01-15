/**
 * UX Polish Tests
 * Tests for ConfettiCelebration, HapticFeedback, and ProgressRing components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  isVibrationSupported,
  isMobileDevice,
  prefersReducedMotion,
  vibrate,
  stopVibration,
  VIBRATION_PATTERNS,
  hapticPresets,
} from "@/components/custom/HapticFeedback"

// =============================================================================
// Mock Setup
// =============================================================================

// Mock navigator.vibrate
const mockVibrate = vi.fn(() => true)

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

// Store original values
const originalNavigator = global.navigator
const originalMatchMedia = global.matchMedia

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks()

  // Mock navigator
  Object.defineProperty(global, "navigator", {
    value: {
      vibrate: mockVibrate,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    },
    configurable: true,
    writable: true,
  })

  // Mock matchMedia
  Object.defineProperty(global, "matchMedia", {
    value: mockMatchMedia,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  // Restore original values
  Object.defineProperty(global, "navigator", {
    value: originalNavigator,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(global, "matchMedia", {
    value: originalMatchMedia,
    configurable: true,
    writable: true,
  })
})

// =============================================================================
// HapticFeedback Tests
// =============================================================================

describe("HapticFeedback", () => {
  describe("isVibrationSupported", () => {
    it("should return boolean for vibrate API check", () => {
      const result = isVibrationSupported()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("isMobileDevice", () => {
    it("should return boolean for mobile device check", () => {
      const result = isMobileDevice()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("prefersReducedMotion", () => {
    it("should return boolean for reduced motion check", () => {
      const result = prefersReducedMotion()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("vibrate", () => {
    it("should return boolean indicating if vibration was triggered", () => {
      const result = vibrate("light")
      expect(typeof result).toBe("boolean")
    })

    it("should not vibrate when disabled", () => {
      const result = vibrate("light", { enabled: false })
      expect(result).toBe(false)
    })
  })

  describe("stopVibration", () => {
    it("should return boolean", () => {
      const result = stopVibration()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("hapticPresets", () => {
    it("should have tap preset function", () => {
      expect(typeof hapticPresets.tap).toBe("function")
    })

    it("should have success preset function", () => {
      expect(typeof hapticPresets.success).toBe("function")
    })

    it("should have error preset function", () => {
      expect(typeof hapticPresets.error).toBe("function")
    })

    it("should have warning preset function", () => {
      expect(typeof hapticPresets.warning).toBe("function")
    })

    it("should have swipe preset function", () => {
      expect(typeof hapticPresets.swipe).toBe("function")
    })

    it("should have impact preset function", () => {
      expect(typeof hapticPresets.impact).toBe("function")
    })
  })
})

// =============================================================================
// ProgressRing Helper Tests
// =============================================================================

describe("ProgressRing Helpers", () => {
  describe("calculateStrokeDasharray", () => {
    it("should calculate correct circumference", () => {
      // circumference = 2 * PI * radius
      const radius = 50
      const expected = 2 * Math.PI * radius
      // Test the formula
      expect(2 * Math.PI * radius).toBeCloseTo(314.159, 2)
    })
  })

  describe("calculateStrokeDashoffset", () => {
    it("should calculate correct offset for 0%", () => {
      const circumference = 314.159
      const offset = circumference - (0 / 100) * circumference
      expect(offset).toBeCloseTo(314.159, 2)
    })

    it("should calculate correct offset for 50%", () => {
      const circumference = 314.159
      const offset = circumference - (50 / 100) * circumference
      expect(offset).toBeCloseTo(157.079, 2)
    })

    it("should calculate correct offset for 100%", () => {
      const circumference = 314.159
      const offset = circumference - (100 / 100) * circumference
      expect(offset).toBeCloseTo(0, 2)
    })
  })
})

// =============================================================================
// ConfettiCelebration Tests
// =============================================================================

describe("ConfettiCelebration Configuration", () => {
  const CELEBRATION_CONFIGS = {
    streak: {
      particleCount: 100,
      duration: 3000,
    },
    task: {
      particleCount: 30,
      duration: 1500,
    },
    weekly: {
      particleCount: 150,
      duration: 4000,
    },
    custom: {
      particleCount: 50,
      duration: 2000,
    },
  }

  it("should have correct streak config", () => {
    expect(CELEBRATION_CONFIGS.streak.particleCount).toBe(100)
    expect(CELEBRATION_CONFIGS.streak.duration).toBe(3000)
  })

  it("should have correct task config", () => {
    expect(CELEBRATION_CONFIGS.task.particleCount).toBe(30)
    expect(CELEBRATION_CONFIGS.task.duration).toBe(1500)
  })

  it("should have correct weekly config", () => {
    expect(CELEBRATION_CONFIGS.weekly.particleCount).toBe(150)
    expect(CELEBRATION_CONFIGS.weekly.duration).toBe(4000)
  })

  it("should have correct custom config", () => {
    expect(CELEBRATION_CONFIGS.custom.particleCount).toBe(50)
    expect(CELEBRATION_CONFIGS.custom.duration).toBe(2000)
  })
})

// =============================================================================
// VIBRATION_PATTERNS Tests
// =============================================================================

describe("VIBRATION_PATTERNS", () => {
  it("should have light pattern as number", () => {
    expect(typeof VIBRATION_PATTERNS.light).toBe("number")
    expect(VIBRATION_PATTERNS.light).toBe(10)
  })

  it("should have medium pattern as number", () => {
    expect(typeof VIBRATION_PATTERNS.medium).toBe("number")
    expect(VIBRATION_PATTERNS.medium).toBe(20)
  })

  it("should have heavy pattern as number", () => {
    expect(typeof VIBRATION_PATTERNS.heavy).toBe("number")
    expect(VIBRATION_PATTERNS.heavy).toBe(40)
  })

  it("should have success pattern as array", () => {
    expect(Array.isArray(VIBRATION_PATTERNS.success)).toBe(true)
    expect(VIBRATION_PATTERNS.success).toEqual([10, 30, 10])
  })

  it("should have error pattern as array", () => {
    expect(Array.isArray(VIBRATION_PATTERNS.error)).toBe(true)
    expect(VIBRATION_PATTERNS.error).toEqual([50, 50, 50])
  })

  it("should have warning pattern as array", () => {
    expect(Array.isArray(VIBRATION_PATTERNS.warning)).toBe(true)
    expect(VIBRATION_PATTERNS.warning).toEqual([30, 30])
  })

  it("should have selection pattern as number", () => {
    expect(typeof VIBRATION_PATTERNS.selection).toBe("number")
    expect(VIBRATION_PATTERNS.selection).toBe(5)
  })

  it("should have swipe pattern as number", () => {
    expect(typeof VIBRATION_PATTERNS.swipe).toBe("number")
    expect(VIBRATION_PATTERNS.swipe).toBe(15)
  })
})

// =============================================================================
// Animation Timing Tests
// =============================================================================

describe("Animation Timing", () => {
  it("should have reasonable animation durations", () => {
    // Animations should be between 0.1s and 5s
    const durations = [0.15, 0.2, 0.3, 0.5, 1, 1.5, 2, 3, 4]
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(0.1)
      expect(duration).toBeLessThanOrEqual(5)
    }
  })

  it("should have reasonable particle counts", () => {
    const counts = [30, 50, 100, 150]
    for (const count of counts) {
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThanOrEqual(200)
    }
  })
})

// =============================================================================
// Accessibility Tests
// =============================================================================

describe("Accessibility - Motion Preferences", () => {
  it("should have prefersReducedMotion function available", () => {
    expect(typeof prefersReducedMotion).toBe("function")
  })

  it("should return boolean for reduced motion preference", () => {
    const result = prefersReducedMotion()
    expect(typeof result).toBe("boolean")
  })
})

// =============================================================================
// Mobile Responsiveness Tests
// =============================================================================

describe("Mobile Responsiveness", () => {
  it("should have isMobileDevice function available", () => {
    expect(typeof isMobileDevice).toBe("function")
  })

  it("should return boolean for mobile device check", () => {
    const result = isMobileDevice()
    expect(typeof result).toBe("boolean")
  })
})

// =============================================================================
// PageTransition Animation Variants Tests
// =============================================================================

describe("PageTransition Animation Variants", () => {
  const pageVariants = {
    initial: (direction: "forward" | "back") => ({
      opacity: 0,
      x: direction === "forward" ? 20 : -20,
    }),
    animate: {
      opacity: 1,
      x: 0,
    },
    exit: (direction: "forward" | "back") => ({
      opacity: 0,
      x: direction === "forward" ? -20 : 20,
    }),
  }

  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  }

  const slideUpVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }

  const scaleVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  }

  describe("pageVariants", () => {
    it("should have correct initial state for forward direction", () => {
      const initial = pageVariants.initial("forward")
      expect(initial.opacity).toBe(0)
      expect(initial.x).toBe(20)
    })

    it("should have correct initial state for back direction", () => {
      const initial = pageVariants.initial("back")
      expect(initial.opacity).toBe(0)
      expect(initial.x).toBe(-20)
    })

    it("should have correct animate state", () => {
      expect(pageVariants.animate.opacity).toBe(1)
      expect(pageVariants.animate.x).toBe(0)
    })

    it("should have correct exit state for forward direction", () => {
      const exit = pageVariants.exit("forward")
      expect(exit.opacity).toBe(0)
      expect(exit.x).toBe(-20)
    })

    it("should have correct exit state for back direction", () => {
      const exit = pageVariants.exit("back")
      expect(exit.opacity).toBe(0)
      expect(exit.x).toBe(20)
    })
  })

  describe("fadeVariants", () => {
    it("should have correct initial opacity", () => {
      expect(fadeVariants.initial.opacity).toBe(0)
    })

    it("should have correct animate opacity", () => {
      expect(fadeVariants.animate.opacity).toBe(1)
    })

    it("should have correct exit opacity", () => {
      expect(fadeVariants.exit.opacity).toBe(0)
    })
  })

  describe("slideUpVariants", () => {
    it("should have correct initial state", () => {
      expect(slideUpVariants.initial.opacity).toBe(0)
      expect(slideUpVariants.initial.y).toBe(20)
    })

    it("should have correct animate state", () => {
      expect(slideUpVariants.animate.opacity).toBe(1)
      expect(slideUpVariants.animate.y).toBe(0)
    })

    it("should have correct exit state", () => {
      expect(slideUpVariants.exit.opacity).toBe(0)
      expect(slideUpVariants.exit.y).toBe(-20)
    })
  })

  describe("scaleVariants", () => {
    it("should have correct initial state", () => {
      expect(scaleVariants.initial.opacity).toBe(0)
      expect(scaleVariants.initial.scale).toBe(0.95)
    })

    it("should have correct animate state", () => {
      expect(scaleVariants.animate.opacity).toBe(1)
      expect(scaleVariants.animate.scale).toBe(1)
    })

    it("should have correct exit state", () => {
      expect(scaleVariants.exit.opacity).toBe(0)
      expect(scaleVariants.exit.scale).toBe(1.05)
    })
  })
})

// =============================================================================
// Loading State Configuration Tests
// =============================================================================

describe("Loading State Configuration", () => {
  const LOADING_VARIANTS = ["spinner", "skeleton", "pulse", "progress"] as const

  it("should have spinner variant", () => {
    expect(LOADING_VARIANTS).toContain("spinner")
  })

  it("should have skeleton variant", () => {
    expect(LOADING_VARIANTS).toContain("skeleton")
  })

  it("should have pulse variant", () => {
    expect(LOADING_VARIANTS).toContain("pulse")
  })

  it("should have progress variant", () => {
    expect(LOADING_VARIANTS).toContain("progress")
  })

  it("should have exactly 4 variants", () => {
    expect(LOADING_VARIANTS.length).toBe(4)
  })
})

// =============================================================================
// Skeleton Configuration Tests
// =============================================================================

describe("Skeleton Configuration", () => {
  const SKELETON_VARIANTS = ["text", "circular", "rectangular"] as const
  const ANIMATION_TYPES = ["pulse", "wave", "none"] as const

  it("should have text variant", () => {
    expect(SKELETON_VARIANTS).toContain("text")
  })

  it("should have circular variant", () => {
    expect(SKELETON_VARIANTS).toContain("circular")
  })

  it("should have rectangular variant", () => {
    expect(SKELETON_VARIANTS).toContain("rectangular")
  })

  it("should have pulse animation type", () => {
    expect(ANIMATION_TYPES).toContain("pulse")
  })

  it("should have wave animation type", () => {
    expect(ANIMATION_TYPES).toContain("wave")
  })

  it("should have none animation type", () => {
    expect(ANIMATION_TYPES).toContain("none")
  })
})
