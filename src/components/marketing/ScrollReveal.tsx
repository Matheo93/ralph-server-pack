"use client"

import { useRef } from "react"
import { motion, useInView, type Variants } from "framer-motion"

type Direction = "up" | "down" | "left" | "right"

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
}

const getVariants = (
  direction: Direction,
  distance: number,
  scale?: boolean,
  fadeOnly?: boolean
): Variants => {
  if (fadeOnly) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    }
  }

  const offset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance }
  }

  return {
    hidden: {
      opacity: 0,
      ...offset[direction],
      ...(scale && { scale: 0.9 })
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      ...(scale && { scale: 1 })
    }
  }
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  distance = 40,
  once = true,
  className,
  scale,
  fadeOnly,
  stagger
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: "-50px" })

  const variants = getVariants(direction, distance, scale, fadeOnly)

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // Smooth ease-out-cubic
        ...(stagger && {
          staggerChildren: stagger,
          delayChildren: delay
        })
      }}
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
}

export function StaggerItem({
  children,
  direction = "up",
  distance = 30,
  className
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
        hidden: { opacity: 0, ...offset[direction] },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Parallax effect for background elements
interface ParallaxProps {
  children: React.ReactNode
  speed?: number // 0.5 = half speed, 1.5 = 1.5x speed
  className?: string
}

export function Parallax({ children, speed = 0.5, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: "100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ y: 0 }}
      animate={isInView ? { y: -20 * speed } : { y: 20 * speed }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Counter animation for stats
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

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isInView ? end : 0}
      </motion.span>
      {suffix}
    </motion.span>
  )
}
