import { describe, it, expect } from "vitest"
import {
  durations,
  easings,
  defaultTransition,
  fadeIn,
  fadeInUp,
  fadeInDown,
  slideInLeft,
  slideInRight,
  scaleIn,
  scaleInBounce,
  popIn,
  staggerContainer,
  staggerItem,
  taskCardVariants,
  taskCompleteVariants,
  modalBackdrop,
  modalContent,
  pulseAnimation,
  recordingRing,
  waveformBar,
  shimmer,
  skeletonPulse,
  createStaggerContainer,
  createFadeInUp,
  createSlideX,
  createSlideY,
  cssAnimations,
} from "@/lib/animations"
import type { Variants } from "framer-motion"

// Helper to safely access variant properties
function getVariantProp(variants: Variants, state: string, prop: string): unknown {
  const stateVariant = variants[state] as Record<string, unknown> | undefined
  return stateVariant?.[prop]
}

function getTransitionProp(variants: Variants, state: string, prop: string): unknown {
  const stateVariant = variants[state] as Record<string, unknown> | undefined
  const transition = stateVariant?.["transition"] as Record<string, unknown> | undefined
  return transition?.[prop]
}

describe("Animation Durations", () => {
  it("should have correct duration values", () => {
    expect(durations.fast).toBe(0.15)
    expect(durations.normal).toBe(0.2)
    expect(durations.slow).toBe(0.3)
    expect(durations.verySlow).toBe(0.5)
  })

  it("should have durations in ascending order", () => {
    expect(durations.fast).toBeLessThan(durations.normal)
    expect(durations.normal).toBeLessThan(durations.slow)
    expect(durations.slow).toBeLessThan(durations.verySlow)
  })
})

describe("Easings", () => {
  it("should have easeOut defined", () => {
    expect(easings.easeOut).toEqual([0.0, 0.0, 0.2, 1])
  })

  it("should have easeIn defined", () => {
    expect(easings.easeIn).toEqual([0.4, 0.0, 1, 1])
  })

  it("should have spring easing with correct properties", () => {
    expect(easings.spring.type).toBe("spring")
    expect(easings.spring.stiffness).toBe(400)
    expect(easings.spring.damping).toBe(30)
  })

  it("should have bounce easing with correct properties", () => {
    expect(easings.bounce.type).toBe("spring")
    expect(easings.bounce.stiffness).toBe(600)
    expect(easings.bounce.damping).toBe(15)
  })
})

describe("Default Transition", () => {
  it("should use normal duration", () => {
    expect(defaultTransition.duration).toBe(durations.normal)
  })

  it("should use easeOut easing", () => {
    expect(defaultTransition.ease).toEqual(easings.easeOut)
  })
})

describe("Fade Animations", () => {
  it("fadeIn should start with opacity 0", () => {
    expect(getVariantProp(fadeIn, "initial", "opacity")).toBe(0)
  })

  it("fadeIn should animate to opacity 1", () => {
    expect(getVariantProp(fadeIn, "animate", "opacity")).toBe(1)
  })

  it("fadeInUp should include y offset", () => {
    expect(getVariantProp(fadeInUp, "initial", "y")).toBe(10)
    expect(getVariantProp(fadeInUp, "animate", "y")).toBe(0)
  })

  it("fadeInDown should include negative y offset", () => {
    expect(getVariantProp(fadeInDown, "initial", "y")).toBe(-10)
  })
})

describe("Slide Animations", () => {
  it("slideInLeft should start from left", () => {
    expect(getVariantProp(slideInLeft, "initial", "x")).toBe(-20)
  })

  it("slideInRight should start from right", () => {
    expect(getVariantProp(slideInRight, "initial", "x")).toBe(20)
  })

  it("slides should animate to x: 0", () => {
    expect(getVariantProp(slideInLeft, "animate", "x")).toBe(0)
    expect(getVariantProp(slideInRight, "animate", "x")).toBe(0)
  })
})

describe("Scale Animations", () => {
  it("scaleIn should start at 95% scale", () => {
    expect(getVariantProp(scaleIn, "initial", "scale")).toBe(0.95)
  })

  it("scaleInBounce should start at 80% scale", () => {
    expect(getVariantProp(scaleInBounce, "initial", "scale")).toBe(0.8)
  })

  it("popIn should start at 50% scale", () => {
    expect(getVariantProp(popIn, "initial", "scale")).toBe(0.5)
  })

  it("all scale animations should animate to scale 1", () => {
    expect(getVariantProp(scaleIn, "animate", "scale")).toBe(1)
    expect(getVariantProp(scaleInBounce, "animate", "scale")).toBe(1)
    expect(getVariantProp(popIn, "animate", "scale")).toBe(1)
  })
})

describe("Stagger Animations", () => {
  it("staggerContainer should have staggerChildren in animate", () => {
    expect(getTransitionProp(staggerContainer, "animate", "staggerChildren")).toBe(0.05)
    expect(getTransitionProp(staggerContainer, "animate", "delayChildren")).toBe(0.1)
  })

  it("staggerItem should have y offset", () => {
    expect(getVariantProp(staggerItem, "initial", "y")).toBe(10)
    expect(getVariantProp(staggerItem, "animate", "y")).toBe(0)
  })
})

describe("Task Card Variants", () => {
  it("should have initial state with opacity 0", () => {
    expect(getVariantProp(taskCardVariants, "initial", "opacity")).toBe(0)
  })

  it("should have y and scale in initial", () => {
    expect(getVariantProp(taskCardVariants, "initial", "y")).toBe(20)
    expect(getVariantProp(taskCardVariants, "initial", "scale")).toBe(0.95)
  })

  it("should exit to the right (x: 100)", () => {
    expect(getVariantProp(taskCardVariants, "exit", "x")).toBe(100)
  })

  it("taskCompleteVariants should have scale keyframes", () => {
    const scale = getVariantProp(taskCompleteVariants, "complete", "scale")
    expect(Array.isArray(scale)).toBe(true)
    expect((scale as number[]).length).toBe(4)
  })
})

describe("Modal Animations", () => {
  it("modalBackdrop should fade in and out", () => {
    expect(getVariantProp(modalBackdrop, "initial", "opacity")).toBe(0)
    expect(getVariantProp(modalBackdrop, "animate", "opacity")).toBe(1)
    expect(getVariantProp(modalBackdrop, "exit", "opacity")).toBe(0)
  })

  it("modalContent should scale and fade", () => {
    expect(getVariantProp(modalContent, "initial", "opacity")).toBe(0)
    expect(getVariantProp(modalContent, "initial", "scale")).toBe(0.95)
    expect(getVariantProp(modalContent, "initial", "y")).toBe(10)
  })
})

describe("Vocal Button Animations", () => {
  it("pulseAnimation should scale during pulse", () => {
    const scale = getVariantProp(pulseAnimation, "pulse", "scale")
    expect(Array.isArray(scale)).toBe(true)
    expect(getTransitionProp(pulseAnimation, "pulse", "repeat")).toBe(Infinity)
  })

  it("recordingRing should have infinite repeat", () => {
    expect(getTransitionProp(recordingRing, "recording", "repeat")).toBe(Infinity)
  })

  it("waveformBar animate should be a function", () => {
    const animate = waveformBar["animate"]
    expect(typeof animate).toBe("function")
    if (typeof animate === "function") {
      // waveformBar.animate takes a custom parameter (i: number)
      const result = (animate as (i: number) => Record<string, unknown>)(0)
      expect(Array.isArray(result["scaleY"])).toBe(true)
    }
  })
})

describe("Loading Animations", () => {
  it("shimmer should animate background position", () => {
    expect(getVariantProp(shimmer, "animate", "backgroundPosition")).toBe("200% 0")
    expect(getTransitionProp(shimmer, "animate", "repeat")).toBe(Infinity)
  })

  it("skeletonPulse should have opacity keyframes", () => {
    const opacity = getVariantProp(skeletonPulse, "animate", "opacity")
    expect(Array.isArray(opacity)).toBe(true)
    expect(getTransitionProp(skeletonPulse, "animate", "repeat")).toBe(Infinity)
  })
})

describe("Utility Functions", () => {
  describe("createStaggerContainer", () => {
    it("should create stagger container with default delay", () => {
      const container = createStaggerContainer()
      expect(getTransitionProp(container, "animate", "staggerChildren")).toBe(0.05)
    })

    it("should create stagger container with custom delay", () => {
      const container = createStaggerContainer(0.1)
      expect(getTransitionProp(container, "animate", "staggerChildren")).toBe(0.1)
    })
  })

  describe("createFadeInUp", () => {
    it("should create fade in up with default offset", () => {
      const variant = createFadeInUp()
      expect(getVariantProp(variant, "initial", "y")).toBe(10)
    })

    it("should create fade in up with custom offset", () => {
      const variant = createFadeInUp(20)
      expect(getVariantProp(variant, "initial", "y")).toBe(20)
    })
  })

  describe("createSlideX", () => {
    it("should create slide from left", () => {
      const slide = createSlideX("left")
      expect(getVariantProp(slide, "initial", "x")).toBe(-20)
    })

    it("should create slide from right", () => {
      const slide = createSlideX("right")
      expect(getVariantProp(slide, "initial", "x")).toBe(20)
    })

    it("should use custom distance", () => {
      const slide = createSlideX("left", 50)
      expect(getVariantProp(slide, "initial", "x")).toBe(-50)
    })
  })

  describe("createSlideY", () => {
    it("should create slide from up", () => {
      const slide = createSlideY("up")
      expect(getVariantProp(slide, "initial", "y")).toBe(-20)
    })

    it("should create slide from down", () => {
      const slide = createSlideY("down")
      expect(getVariantProp(slide, "initial", "y")).toBe(20)
    })
  })
})

describe("CSS Animation Classes", () => {
  it("should have fadeIn class", () => {
    expect(cssAnimations.fadeIn).toContain("animate-in")
    expect(cssAnimations.fadeIn).toContain("fade-in")
  })

  it("should have slide classes", () => {
    expect(cssAnimations.slideInFromTop).toContain("slide-in-from-top")
    expect(cssAnimations.slideInFromBottom).toContain("slide-in-from-bottom")
    expect(cssAnimations.slideInFromLeft).toContain("slide-in-from-left")
    expect(cssAnimations.slideInFromRight).toContain("slide-in-from-right")
  })

  it("should have scale classes", () => {
    expect(cssAnimations.scaleIn).toContain("zoom-in")
    expect(cssAnimations.scaleOut).toContain("zoom-out")
  })

  it("should have utility animation classes", () => {
    expect(cssAnimations.spin).toBe("animate-spin")
    expect(cssAnimations.pulse).toBe("animate-pulse")
    expect(cssAnimations.bounce).toBe("animate-bounce")
  })
})
