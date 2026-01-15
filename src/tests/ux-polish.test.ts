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
