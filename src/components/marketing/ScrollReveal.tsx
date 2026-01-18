"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion"

type Direction = "up" | "down" | "left" | "right"
type AnimationType = "slide" | "zoom" | "flip" | "blur" | "rotate" | "spring" | "elastic" | "cascade" | "wave" | "morph"

interface ScrollRevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  distance?: number
  once?: boolean
  className?: string
  /** Scale animation - element grows from smaller size */
  scale?: boolean
  /** Fade only - no movement */
  fadeOnly?: boolean
  /** Stagger children animations */
  stagger?: number
  /** Animation type for more variety */
  animationType?: AnimationType
  /** Add blur effect during reveal */
  blur?: boolean
  /** Rotate on reveal */
  rotate?: number
  /** Viewport threshold for triggering animation (0-1) */
  threshold?: number
}

const getVariants = (
  direction: Direction,
  distance: number,
  scale?: boolean,
  fadeOnly?: boolean,
  animationType?: AnimationType,
  blur?: boolean,
  rotate?: number
): Variants => {
  if (fadeOnly) {
    return {
      hidden: { opacity: 0, filter: blur ? "blur(10px)" : "blur(0px)" },
      visible: { opacity: 1, filter: "blur(0px)" }
    }
  }

  const offset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  }

  // Different animation styles
  if (animationType === "zoom") {
    return {
      hidden: {
        opacity: 0,
        scale: 0.8,
        filter: blur ? "blur(10px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)"
      }
    }
  }

  if (animationType === "flip") {
    return {
      hidden: {
        opacity: 0,
        rotateX: direction === "up" || direction === "down" ? 45 : 0,
        rotateY: direction === "left" || direction === "right" ? 45 : 0,
        filter: blur ? "blur(5px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        rotateX: 0,
        rotateY: 0,
        filter: "blur(0px)"
      }
    }
  }

  if (animationType === "blur") {
    return {
      hidden: {
        opacity: 0,
        filter: "blur(20px)",
        ...offset[direction]
      },
      visible: {
        opacity: 1,
        filter: "blur(0px)",
        x: 0,
        y: 0
      }
    }
  }

  if (animationType === "rotate") {
    return {
      hidden: {
        opacity: 0,
        rotate: rotate ?? -10,
        ...offset[direction],
        filter: blur ? "blur(5px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        rotate: 0,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      }
    }
  }

  // Spring animation - bouncy entrance
  if (animationType === "spring") {
    return {
      hidden: {
        opacity: 0,
        scale: 0.6,
        ...offset[direction],
        filter: blur ? "blur(8px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      }
    }
  }

  // Elastic animation - overshoot and settle
  if (animationType === "elastic") {
    return {
      hidden: {
        opacity: 0,
        scale: 0.5,
        rotate: direction === "left" ? -15 : direction === "right" ? 15 : 0,
        ...offset[direction],
        filter: blur ? "blur(12px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        x: 0,
        y: 0,
        filter: "blur(0px)"
      }
    }
  }

  // Cascade animation - dramatic entrance from far
  if (animationType === "cascade") {
    return {
      hidden: {
        opacity: 0,
        y: distance * 2,
        scale: 0.8,
        rotateX: 20,
        filter: "blur(15px)"
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        filter: "blur(0px)"
      }
    }
  }

  // Wave animation - subtle wave-like motion
  if (animationType === "wave") {
    return {
      hidden: {
        opacity: 0,
        y: distance * 0.5,
        x: direction === "left" ? distance * 0.3 : direction === "right" ? -distance * 0.3 : 0,
        skewY: direction === "left" ? 3 : direction === "right" ? -3 : 0,
        filter: blur ? "blur(6px)" : "blur(0px)"
      },
      visible: {
        opacity: 1,
        y: 0,
        x: 0,
        skewY: 0,
        filter: "blur(0px)"
      }
    }
  }

  // Morph animation - shape transformation feel
  if (animationType === "morph") {
    return {
      hidden: {
        opacity: 0,
        scale: 0.9,
        borderRadius: "50%",
        filter: "blur(20px)"
      },
      visible: {
        opacity: 1,
        scale: 1,
        borderRadius: "0%",
        filter: "blur(0px)"
      }
    }
  }

  return {
    hidden: {
      opacity: 0,
      ...offset[direction],
      ...(scale && { scale: 0.9 }),
      filter: blur ? "blur(10px)" : "blur(0px)"
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      ...(scale && { scale: 1 }),
      filter: "blur(0px)"
    }
  }
}

// Custom easing functions for different animation types
type CubicBezier = [number, number, number, number]

const getTransition = (animationType?: AnimationType, duration?: number, delay?: number, stagger?: number) => {
  const baseDelay = delay ?? 0
  const baseDuration = duration ?? 0.6

  const baseTransition = {
    duration: baseDuration,
    delay: baseDelay,
    ...(stagger && {
      staggerChildren: stagger,
      delayChildren: baseDelay
    })
  }

  switch (animationType) {
    case "spring":
      return {
        ...baseTransition,
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        mass: 1
      }
    case "elastic":
      return {
        ...baseTransition,
        type: "spring" as const,
        stiffness: 150,
        damping: 12,
        mass: 0.8
      }
    case "cascade":
      return {
        ...baseTransition,
        duration: baseDuration * 1.2,
        ease: [0.16, 1, 0.3, 1] as CubicBezier
      }
    case "wave":
      return {
        ...baseTransition,
        ease: [0.45, 0, 0.55, 1] as CubicBezier
      }
    case "morph":
      return {
        ...baseTransition,
        duration: baseDuration * 0.8,
        ease: [0.4, 0, 0.2, 1] as CubicBezier
      }
    default:
      return {
        ...baseTransition,
        ease: [0.22, 1, 0.36, 1] as CubicBezier
      }
  }
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  distance = 50,
  once = true,
  className,
  scale,
  fadeOnly,
  stagger,
  animationType,
  blur,
  rotate,
  threshold
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const margin = threshold ? `${-threshold * 100}px` : "-80px"
  const isInView = useInView(ref, { once, margin: margin as `${number}px` })

  const variants = getVariants(direction, distance, scale, fadeOnly, animationType, blur, rotate)
  const transition = getTransition(animationType, duration, delay, stagger)

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Container for staggered children
interface StaggerContainerProps {
  children: React.ReactNode
  stagger?: number
  delay?: number
  className?: string
}

export function StaggerContainer({
  children,
  stagger = 0.1,
  delay = 0,
  className
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Child item for use inside StaggerContainer
interface StaggerItemProps {
  children: React.ReactNode
  direction?: Direction
  distance?: number
  className?: string
  /** Add subtle scale animation */
  scale?: boolean
  /** Add blur effect */
  blur?: boolean
}

export function StaggerItem({
  children,
  direction = "up",
  distance = 40,
  className,
  scale,
  blur
}: StaggerItemProps) {
  const offset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  }

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          ...offset[direction],
          ...(scale && { scale: 0.9 }),
          filter: blur ? "blur(8px)" : "blur(0px)"
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          ...(scale && { scale: 1 }),
          filter: "blur(0px)",
          transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1]
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Parallax effect for background elements - scroll-based
interface ParallaxProps {
  children: React.ReactNode
  speed?: number // 0.5 = half speed, 1.5 = 1.5x speed
  className?: string
  /** Direction of parallax movement */
  direction?: "up" | "down"
}

export function Parallax({ children, speed = 0.3, className, direction = "up" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const multiplier = direction === "up" ? -1 : 1
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed * multiplier, -100 * speed * multiplier])

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Section wrapper with parallax background effect
interface ParallaxSectionProps {
  children: React.ReactNode
  className?: string
  bgClassName?: string
  speed?: number
}

export function ParallaxSection({ children, className, bgClassName, speed = 0.2 }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", `${30 * speed}%`])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        style={{ y: backgroundY, opacity }}
        className={`absolute inset-0 ${bgClassName ?? ""}`}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Text reveal animation - characters appear one by one
interface TextRevealProps {
  text: string
  className?: string
  delay?: number
}

export function TextReveal({ text, className, delay = 0 }: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const words = text.split(" ")

  return (
    <span ref={ref} className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block overflow-hidden mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: "100%" }}
            animate={isInView ? { y: 0 } : { y: "100%" }}
            transition={{
              duration: 0.5,
              delay: delay + wordIndex * 0.08,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

// Floating element with continuous animation
interface FloatingElementProps {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  amplitude?: number
}

export function FloatingElement({
  children,
  className,
  duration = 4,
  delay = 0,
  amplitude = 15
}: FloatingElementProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -amplitude, 0, amplitude * 0.5, 0],
        rotate: [0, 2, 0, -2, 0]
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  )
}

// Counter animation for stats - with real counting animation
interface CountUpProps {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}

export function CountUp({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
  className
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      const startTime = Date.now()
      const durationMs = duration * 1000

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / durationMs, 1)

        // Easing function for smoother animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentCount = Math.round(easeOutQuart * end)

        setCount(currentCount)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [isInView, end, duration])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      {prefix}
      <span>{count}</span>
      {suffix}
    </motion.span>
  )
}

// Line by line text reveal - great for headlines
interface LineRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  staggerDelay?: number
}

export function LineReveal({ children, className, delay = 0, staggerDelay = 0.1 }: LineRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Single line for LineReveal container
export function RevealLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        variants={{
          hidden: { y: "100%", opacity: 0 },
          visible: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Scroll-linked progress indicator
interface ScrollProgressProps {
  className?: string
  color?: string
}

export function ScrollProgress({ className, color = "bg-primary" }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 h-1 origin-left z-50 ${color} ${className ?? ""}`}
      style={{ scaleX }}
    />
  )
}

// Magnetic hover effect for buttons/cards
interface MagneticProps {
  children: React.ReactNode
  className?: string
  strength?: number
}

export function Magnetic({ children, className, strength = 0.3 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const element = ref.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = (clientX - centerX) * strength
    const deltaY = (clientY - centerY) * strength

    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
  }

  const handleMouseLeave = () => {
    const element = ref.current
    if (!element) return
    element.style.transform = "translate(0, 0)"
  }

  return (
    <motion.div
      ref={ref}
      className={`transition-transform duration-200 ${className ?? ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  )
}

// Gradient text with scroll-based animation
interface GradientTextProps {
  children: React.ReactNode
  className?: string
  gradientFrom?: string
  gradientTo?: string
  gradientVia?: string
}

export function GradientText({
  children,
  className,
  gradientFrom = "from-primary",
  gradientTo = "to-primary/60",
  gradientVia
}: GradientTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.span
      ref={ref}
      className={`bg-gradient-to-r ${gradientFrom} ${gradientVia ?? ""} ${gradientTo} bg-clip-text text-transparent ${className ?? ""}`}
      initial={{ opacity: 0, backgroundPosition: "200% center" }}
      animate={isInView ? { opacity: 1, backgroundPosition: "0% center" } : {}}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      style={{ backgroundSize: "200% auto" }}
    >
      {children}
    </motion.span>
  )
}

// Section divider with animated wave
export function WaveDivider({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden ${flip ? "rotate-180" : ""} ${className ?? ""}`}>
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="w-full h-16 md:h-24"
      >
        <motion.path
          d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
          fill="currentColor"
          className="text-background"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
    </div>
  )
}

// Animated highlight/underline for text
interface HighlightProps {
  children: React.ReactNode
  className?: string
  color?: string
  delay?: number
}

export function Highlight({ children, className, color = "bg-primary/20", delay = 0 }: HighlightProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-30px" })

  return (
    <span ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <motion.span
        className={`absolute inset-0 ${color} -z-10`}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0 }}
      />
      {children}
    </span>
  )
}

// Blur-in text animation
interface BlurInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}

export function BlurIn({ children, className, delay = 0, duration = 0.8 }: BlurInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: "blur(20px)", y: 20 }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)", y: 0 } : {}}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Scale reveal - element grows from center
interface ScaleRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}

export function ScaleReveal({ children, className, delay = 0, duration = 0.6 }: ScaleRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        duration,
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// ADVANCED SCROLL ANIMATIONS (style entraide-souverainiste)
// ============================================

// Horizontal wave animation - elements enter from alternating sides
interface HorizontalWaveProps {
  children: React.ReactNode
  className?: string
  delay?: number
  index?: number
}

export function HorizontalWave({ children, className, delay = 0, index = 0 }: HorizontalWaveProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const fromLeft = index % 2 === 0

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: fromLeft ? -100 : 100,
        rotateY: fromLeft ? -15 : 15
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        rotateY: 0
      } : {}}
      transition={{
        duration: 0.8,
        delay: delay + index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {children}
    </motion.div>
  )
}

// Slide from side with rotation (dramatic entrance)
interface SlideRotateProps {
  children: React.ReactNode
  className?: string
  direction?: "left" | "right"
  delay?: number
}

export function SlideRotate({ children, className, direction = "left", delay = 0 }: SlideRotateProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const xOffset = direction === "left" ? -150 : 150

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: xOffset,
        rotate: direction === "left" ? -10 : 10,
        scale: 0.9
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        rotate: 0,
        scale: 1
      } : {}}
      transition={{
        duration: 0.9,
        delay,
        type: "spring",
        stiffness: 80,
        damping: 15
      }}
    >
      {children}
    </motion.div>
  )
}

// 3D perspective reveal - card flips in
interface PerspectiveRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  axis?: "x" | "y"
}

export function PerspectiveReveal({ children, className, delay = 0, axis = "y" }: PerspectiveRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ perspective: 1000 }}
      initial={{
        opacity: 0,
        rotateX: axis === "x" ? 45 : 0,
        rotateY: axis === "y" ? 45 : 0,
        transformOrigin: "center center"
      }}
      animate={isInView ? {
        opacity: 1,
        rotateX: 0,
        rotateY: 0
      } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      {children}
    </motion.div>
  )
}

// Typewriter text effect
interface TypewriterProps {
  text: string
  className?: string
  delay?: number
  speed?: number
}

export function Typewriter({ text, className, delay = 0, speed = 50 }: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-30px" })
  const [displayText, setDisplayText] = useState("")
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      let i = 0
      const timeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (i < text.length) {
            setDisplayText(text.slice(0, i + 1))
            i++
          } else {
            clearInterval(interval)
          }
        }, speed)
      }, delay * 1000)
      return () => clearTimeout(timeout)
    }
  }, [isInView, text, delay, speed])

  return (
    <span ref={ref} className={className}>
      {displayText}
      {displayText.length < text.length && isInView && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </span>
  )
}

// Scroll-linked opacity and scale
interface ScrollLinkedProps {
  children: React.ReactNode
  className?: string
}

export function ScrollLinked({ children, className }: ScrollLinkedProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.9, 1, 1, 0.9])
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [50, 0, -50])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity, scale, y }}
    >
      {children}
    </motion.div>
  )
}

// Animated gradient background that moves on scroll
interface AnimatedGradientBgProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
}

export function AnimatedGradientBg({
  children,
  className,
  colors = ["from-primary/10", "via-accent/20", "to-secondary/10"]
}: AnimatedGradientBgProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const backgroundPosition = useTransform(
    scrollYProgress,
    [0, 1],
    ["0% 0%", "100% 100%"]
  )

  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colors.join(" ")}`}
        style={{
          backgroundSize: "200% 200%",
          backgroundPosition
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Split text animation - each word animates separately
interface SplitTextProps {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
}

export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05
}: SplitTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const words = text.split(" ")

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay
          }
        }
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className={`inline-block mr-[0.25em] ${wordClassName ?? ""}`}
          variants={{
            hidden: {
              opacity: 0,
              y: 30,
              rotateX: -45
            },
            visible: {
              opacity: 1,
              y: 0,
              rotateX: 0,
              transition: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
              }
            }
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Curtain reveal - content reveals as if a curtain is lifting
interface CurtainRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right"
}

export function CurtainReveal({ children, className, delay = 0, direction = "up" }: CurtainRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const clipPathStart = {
    up: "inset(100% 0 0 0)",
    down: "inset(0 0 100% 0)",
    left: "inset(0 100% 0 0)",
    right: "inset(0 0 0 100%)"
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ clipPath: clipPathStart[direction], opacity: 0 }}
      animate={isInView ? { clipPath: "inset(0 0 0 0)", opacity: 1 } : {}}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.65, 0, 0.35, 1]
      }}
    >
      {children}
    </motion.div>
  )
}

// Marquee-style infinite scroll
interface MarqueeProps {
  children: React.ReactNode
  className?: string
  speed?: number
  direction?: "left" | "right"
  pauseOnHover?: boolean
}

export function Marquee({
  children,
  className,
  speed = 30,
  direction = "left",
  pauseOnHover = true
}: MarqueeProps) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}
    >
      <motion.div
        className={`flex gap-8 ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
        animate={{ x: direction === "left" ? "-50%" : "50%" }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ width: "fit-content" }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

// Glow on hover with animated gradient
interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
}

export function GlowCard({ children, className, glowColor = "rgba(var(--primary), 0.3)" }: GlowCardProps) {
  return (
    <motion.div
      className={`relative group ${className ?? ""}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
        style={{ background: glowColor }}
      />
      <div className="relative">
        {children}
      </div>
    </motion.div>
  )
}

// Bounce in from different corners
interface BounceInProps {
  children: React.ReactNode
  className?: string
  from?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  delay?: number
}

export function BounceIn({ children, className, from = "bottom-left", delay = 0 }: BounceInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const initialPosition = {
    "top-left": { x: -100, y: -100 },
    "top-right": { x: 100, y: -100 },
    "bottom-left": { x: -100, y: 100 },
    "bottom-right": { x: 100, y: 100 }
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...initialPosition[from],
        scale: 0.5,
        rotate: from.includes("left") ? -15 : 15
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0
      } : {}}
      transition={{
        duration: 0.7,
        delay,
        type: "spring",
        stiffness: 120,
        damping: 14
      }}
    >
      {children}
    </motion.div>
  )
}
