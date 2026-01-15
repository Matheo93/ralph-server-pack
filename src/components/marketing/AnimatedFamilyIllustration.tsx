"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"

/**
 * AnimatedFamilyIllustration
 *
 * Duolingo-style animated SVG family illustration for the Hero section.
 * Features:
 * - Eye blinking (random)
 * - Gentle breathing animation
 * - Child bouncing with excitement
 * - Floating hearts
 * - Hover reactions
 */

// Animated Eye Component with random blinking
function AnimatedEye({
  cx,
  cy,
  r,
  delay = 0
}: {
  cx: number
  cy: number
  r: number
  delay?: number
}) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    const blink = () => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 120)
    }

    // Initial delay to stagger eye blinks
    const initialTimeout = setTimeout(() => {
      blink()
    }, delay)

    // Random blink every 2-5 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        blink()
      }
    }, 400)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [delay])

  return (
    <motion.ellipse
      cx={cx}
      cy={cy}
      rx={r}
      ry={r}
      fill="#3d2817"
      animate={{ scaleY: isBlinking ? 0.1 : 1 }}
      transition={{ duration: 0.08 }}
    />
  )
}

// Eye highlight (white reflection)
function EyeHighlight({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <circle cx={cx + r * 0.4} cy={cy - r * 0.4} r={r * 0.4} fill="white" />
}

// Floating Heart Animation
function FloatingHeart({
  startX,
  delay,
  size = 0.6
}: {
  startX: number
  delay: number
  size?: number
}) {
  return (
    <motion.path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="#f97316"
      initial={{
        x: startX,
        y: 280,
        opacity: 0,
        scale: size * 0.5
      }}
      animate={{
        y: -30,
        opacity: [0, 0.7, 0.7, 0],
        scale: [size * 0.5, size, size * 0.9, size * 0.7]
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        delay,
        ease: "easeOut"
      }}
    />
  )
}

export function AnimatedFamilyIllustration() {
  const [isHovered, setIsHovered] = useState<"parent1" | "parent2" | "child" | null>(null)

  return (
    <svg
      viewBox="0 0 400 320"
      className="w-full h-auto"
      onMouseLeave={() => setIsHovered(null)}
    >
      {/* Background circle */}
      <motion.circle
        cx="200"
        cy="160"
        r="140"
        fill="url(#bgGradient)"
        opacity="0.3"
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.25, 0.35, 0.25]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Gradients */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
        </linearGradient>
        <linearGradient id="skinTone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fcd5b8"/>
          <stop offset="100%" stopColor="#e8b896"/>
        </linearGradient>
        <linearGradient id="hairBrown" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5c4033"/>
          <stop offset="100%" stopColor="#3d2817"/>
        </linearGradient>
        <linearGradient id="coralShirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#ea580c"/>
        </linearGradient>
        <linearGradient id="blueShirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#2563eb"/>
        </linearGradient>
        <linearGradient id="greenShirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e"/>
          <stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
      </defs>

      {/* Floating hearts */}
      <FloatingHeart startX={50} delay={0} size={0.5} />
      <FloatingHeart startX={320} delay={1.5} size={0.4} />
      <FloatingHeart startX={180} delay={2.5} size={0.35} />
      <FloatingHeart startX={100} delay={3.5} size={0.45} />
      <FloatingHeart startX={280} delay={4} size={0.5} />

      {/* Parent 1 (left) - with breathing and hover */}
      <motion.g
        transform="translate(80, 80)"
        onMouseEnter={() => setIsHovered("parent1")}
        style={{ cursor: "pointer" }}
        animate={{
          y: isHovered === "parent1" ? -5 : 0,
          scale: isHovered === "parent1" ? 1.03 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Body with breathing */}
        <motion.ellipse
          cx="50"
          cy="180"
          rx="35"
          ry="50"
          fill="url(#coralShirt)"
          animate={{
            scaleY: [1, 1.02, 1],
            y: [0, -1, 0]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Neck */}
        <rect x="40" y="110" width="20" height="25" fill="url(#skinTone)"/>

        {/* Head with gentle bob */}
        <motion.g
          animate={{
            rotate: [-0.5, 0.5, -0.5],
            y: [0, -1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <circle cx="50" cy="80" r="45" fill="url(#skinTone)"/>
          {/* Hair */}
          <ellipse cx="50" cy="55" rx="42" ry="30" fill="url(#hairBrown)"/>
          {/* Animated Eyes */}
          <AnimatedEye cx={35} cy={80} r={5} delay={0} />
          <AnimatedEye cx={65} cy={80} r={5} delay={200} />
          <EyeHighlight cx={35} cy={80} r={5} />
          <EyeHighlight cx={65} cy={80} r={5} />
          {/* Smile */}
          <motion.path
            d="M35 100 Q50 115 65 100"
            stroke="#d97706"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{
              scaleY: isHovered === "parent1" ? 1.15 : 1,
              y: isHovered === "parent1" ? -2 : 0
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Cheeks */}
          <motion.circle
            cx="25"
            cy="95"
            r="8"
            fill="#fca5a5"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: isHovered === "parent1" ? 0.6 : 0.4 }}
          />
          <motion.circle
            cx="75"
            cy="95"
            r="8"
            fill="#fca5a5"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: isHovered === "parent1" ? 0.6 : 0.4 }}
          />
        </motion.g>
      </motion.g>

      {/* Parent 2 (right) - with breathing and hover */}
      <motion.g
        transform="translate(220, 80)"
        onMouseEnter={() => setIsHovered("parent2")}
        style={{ cursor: "pointer" }}
        animate={{
          y: isHovered === "parent2" ? -5 : 0,
          scale: isHovered === "parent2" ? 1.03 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Body with breathing (slightly offset timing) */}
        <motion.ellipse
          cx="50"
          cy="180"
          rx="35"
          ry="50"
          fill="url(#blueShirt)"
          animate={{
            scaleY: [1, 1.03, 1],
            y: [0, -1.5, 0]
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Neck */}
        <rect x="40" y="110" width="20" height="25" fill="url(#skinTone)"/>

        {/* Head with gentle bob */}
        <motion.g
          animate={{
            rotate: [0.5, -0.5, 0.5],
            y: [0, -1.5, 0]
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <circle cx="50" cy="80" r="45" fill="url(#skinTone)"/>
          {/* Hair (shorter) */}
          <ellipse cx="50" cy="50" rx="38" ry="25" fill="url(#hairBrown)"/>
          {/* Animated Eyes */}
          <AnimatedEye cx={35} cy={80} r={5} delay={500} />
          <AnimatedEye cx={65} cy={80} r={5} delay={600} />
          <EyeHighlight cx={35} cy={80} r={5} />
          <EyeHighlight cx={65} cy={80} r={5} />
          {/* Smile */}
          <motion.path
            d="M35 100 Q50 115 65 100"
            stroke="#d97706"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{
              scaleY: isHovered === "parent2" ? 1.15 : 1,
              y: isHovered === "parent2" ? -2 : 0
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Cheeks */}
          <motion.circle
            cx="25"
            cy="95"
            r="8"
            fill="#fca5a5"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: isHovered === "parent2" ? 0.6 : 0.4 }}
          />
          <motion.circle
            cx="75"
            cy="95"
            r="8"
            fill="#fca5a5"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: isHovered === "parent2" ? 0.6 : 0.4 }}
          />
        </motion.g>
      </motion.g>

      {/* Child (center, front) - bouncing with excitement */}
      <motion.g
        transform="translate(160, 150)"
        onMouseEnter={() => setIsHovered("child")}
        style={{ cursor: "pointer" }}
        animate={{
          y: isHovered === "child" ? [-8, 0] : [0, -6, 0],
          scale: isHovered === "child" ? 1.05 : [1, 1.015, 1]
        }}
        transition={{
          y: {
            duration: isHovered === "child" ? 0.3 : 0.7,
            repeat: isHovered === "child" ? 0 : Infinity,
            repeatDelay: 2.5,
            ease: "easeOut"
          },
          scale: {
            duration: isHovered === "child" ? 0.3 : 0.7,
            repeat: isHovered === "child" ? 0 : Infinity,
            repeatDelay: 2.5
          }
        }}
      >
        {/* Body */}
        <ellipse cx="40" cy="130" rx="25" ry="35" fill="url(#greenShirt)"/>
        {/* Neck */}
        <rect x="32" y="85" width="16" height="18" fill="url(#skinTone)"/>

        {/* Head */}
        <motion.g
          animate={{
            rotate: isHovered === "child" ? [0, -3, 3, 0] : [-1, 1, -1]
          }}
          transition={{
            duration: isHovered === "child" ? 0.4 : 2,
            repeat: isHovered === "child" ? 0 : Infinity
          }}
        >
          <circle cx="40" cy="60" r="35" fill="url(#skinTone)"/>
          {/* Hair (pigtails style) */}
          <ellipse cx="40" cy="40" rx="30" ry="22" fill="url(#hairBrown)"/>
          <motion.circle
            cx="10"
            cy="45"
            r="12"
            fill="url(#hairBrown)"
            animate={{
              y: [0, -2, 0],
              rotate: [-5, 5, -5]
            }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              repeatDelay: 2.5
            }}
          />
          <motion.circle
            cx="70"
            cy="45"
            r="12"
            fill="url(#hairBrown)"
            animate={{
              y: [0, -2, 0],
              rotate: [5, -5, 5]
            }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              repeatDelay: 2.5,
              delay: 0.1
            }}
          />
          {/* Animated Eyes */}
          <AnimatedEye cx={28} cy={58} r={4} delay={300} />
          <AnimatedEye cx={52} cy={58} r={4} delay={400} />
          <EyeHighlight cx={28} cy={58} r={4} />
          <EyeHighlight cx={52} cy={58} r={4} />
          {/* Big smile */}
          <motion.path
            d="M28 75 Q40 88 52 75"
            stroke="#d97706"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            animate={{
              scaleY: isHovered === "child" ? 1.2 : 1,
              y: isHovered === "child" ? -2 : 0
            }}
            transition={{ duration: 0.2 }}
          />
          {/* Cheeks - more prominent for child */}
          <motion.circle
            cx="18"
            cy="70"
            r="6"
            fill="#fca5a5"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: isHovered === "child" ? 0.7 : 0.5 }}
          />
          <motion.circle
            cx="62"
            cy="70"
            r="6"
            fill="#fca5a5"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: isHovered === "child" ? 0.7 : 0.5 }}
          />
        </motion.g>
      </motion.g>

      {/* Static heart decorations */}
      <g fill="#f97316" opacity="0.6">
        <motion.path
          transform="translate(60, 50) scale(0.8)"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          animate={{
            scale: [0.8, 0.85, 0.8],
            rotate: [-5, 5, -5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.path
          transform="translate(320, 60) scale(0.6)"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          animate={{
            scale: [0.6, 0.65, 0.6],
            rotate: [5, -5, 5]
          }}
          transition={{
            duration: 2.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.path
          transform="translate(340, 200) scale(0.5)"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          animate={{
            scale: [0.5, 0.55, 0.5]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </g>

      {/* Animated sparkles/stars */}
      <g fill="#f59e0b">
        <motion.polygon
          transform="translate(45, 100)"
          points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5"
          opacity="0.7"
          animate={{
            scale: [0.8, 1.1, 0.8],
            rotate: [0, 15, 0],
            opacity: [0.5, 0.9, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.polygon
          transform="translate(335, 120)"
          points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5"
          opacity="0.5"
          animate={{
            scale: [0.6, 0.9, 0.6],
            rotate: [0, -20, 0],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.7
          }}
        />
        <motion.polygon
          transform="translate(25, 180)"
          points="6,0 7.5,4.5 12,4.5 8.5,7.5 10,12 6,9 2,12 3.5,7.5 0,4.5 4.5,4.5"
          opacity="0.4"
          animate={{
            scale: [0.5, 0.75, 0.5],
            rotate: [0, 10, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2
          }}
        />
      </g>
    </svg>
  )
}
