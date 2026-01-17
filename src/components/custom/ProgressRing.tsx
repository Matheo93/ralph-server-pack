"use client"

/**
 * ProgressRing - Circular progress indicator with animations
 * Used for weekly completion, monthly stats, and goal tracking
 */

import { useState, useEffect, useMemo } from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  label?: string
  sublabel?: string
  showPercentage?: boolean
  animated?: boolean
  duration?: number
  className?: string
}

interface MultiRingProps {
  rings: Array<{
    progress: number
    color: string
    label?: string
  }>
  size?: number
  strokeWidth?: number
  gap?: number
  animated?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  background: "hsl(var(--muted))",
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStrokeDasharray(radius: number): number {
  return 2 * Math.PI * radius
}

function calculateStrokeDashoffset(
  circumference: number,
  progress: number
): number {
  return circumference - (progress / 100) * circumference
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = DEFAULT_COLORS.primary,
  backgroundColor = DEFAULT_COLORS.background,
  label,
  sublabel,
  showPercentage = true,
  animated = true,
  duration = 1,
  className,
}: ProgressRingProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const radius = (size - strokeWidth) / 2
  const circumference = calculateStrokeDasharray(radius)

  // Spring animation for smooth progress updates
  const springProgress = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  })

  useEffect(() => {
    if (mounted) {
      springProgress.set(progress)
    }
  }, [progress, mounted, springProgress])

  const strokeDashoffset = useTransform(
    springProgress,
    (value) => calculateStrokeDashoffset(circumference, value)
  )

  const displayProgress = useTransform(springProgress, Math.round)

  // Calculate color based on progress if using gradient
  const progressColor = useMemo(() => {
    if (typeof color === "string" && color.startsWith("gradient")) {
      if (progress < 33) return DEFAULT_COLORS.error
      if (progress < 66) return DEFAULT_COLORS.warning
      return DEFAULT_COLORS.success
    }
    return color
  }, [color, progress])

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          className="opacity-20"
        />

        {/* Progress Circle */}
        {animated ? (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            initial={{ strokeDashoffset: circumference }}
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={calculateStrokeDashoffset(circumference, progress)}
          />
        )}
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            className="text-2xl font-bold tabular-nums"
            style={{ color: progressColor }}
          >
            {animated ? (
              <motion.span>{displayProgress}</motion.span>
            ) : (
              Math.round(progress)
            )}
            <span className="text-sm">%</span>
          </motion.span>
        )}
        {label && (
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-muted-foreground/70">{sublabel}</span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Multi-Ring Component (for multiple metrics)
// ============================================================================

export function MultiProgressRing({
  rings,
  size = 150,
  strokeWidth = 8,
  gap = 4,
  animated = true,
  className,
}: MultiRingProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {rings.map((ring, index) => {
          const ringStrokeWidth = strokeWidth - index * 2
          const ringRadius = (size - ringStrokeWidth) / 2 - index * (strokeWidth + gap)
          const circumference = calculateStrokeDasharray(ringRadius)

          return (
            <g key={index}>
              {/* Background */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={ringRadius}
                fill="none"
                stroke={ring.color}
                strokeWidth={ringStrokeWidth}
                className="opacity-10"
              />

              {/* Progress */}
              {animated && mounted ? (
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ringStrokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{
                    strokeDashoffset: calculateStrokeDashoffset(
                      circumference,
                      ring.progress
                    ),
                  }}
                  transition={{
                    duration: 1,
                    delay: index * 0.2,
                    ease: "easeOut",
                  }}
                />
              ) : (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ringStrokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={calculateStrokeDashoffset(
                    circumference,
                    ring.progress
                  )}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ============================================================================
// Weekly Progress Ring
// ============================================================================

interface WeeklyProgressProps {
  completed: number
  total: number
  size?: number
  className?: string
}

export function WeeklyProgressRing({
  completed,
  total,
  size = 100,
  className,
}: WeeklyProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <ProgressRing
      progress={progress}
      size={size}
      label="Cette semaine"
      sublabel={`${completed}/${total} tâches`}
      color={progress >= 100 ? DEFAULT_COLORS.success : DEFAULT_COLORS.primary}
      className={className}
    />
  )
}

// ============================================================================
// Monthly Progress Ring
// ============================================================================

interface MonthlyProgressProps {
  tasksCompleted: number
  loadBalance: number // -100 to 100 (negative = overloaded)
  streakDays: number
  className?: string
}

export function MonthlyStatsRing({
  tasksCompleted,
  loadBalance,
  streakDays,
  className,
}: MonthlyProgressProps) {
  const normalizedBalance = Math.max(0, Math.min(100, loadBalance + 50))
  const streakProgress = Math.min(100, (streakDays / 30) * 100)

  const rings = [
    {
      progress: Math.min(100, tasksCompleted),
      color: DEFAULT_COLORS.primary,
      label: "Tâches",
    },
    {
      progress: normalizedBalance,
      color: DEFAULT_COLORS.success,
      label: "Équilibre",
    },
    {
      progress: streakProgress,
      color: "#f59e0b",
      label: "Streak",
    },
  ]

  return (
    <div className={cn("relative", className)}>
      <MultiProgressRing rings={rings} size={150} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{tasksCompleted}</span>
        <span className="text-xs text-muted-foreground">tâches ce mois</span>
      </div>
    </div>
  )
}

// ============================================================================
// Mini Progress Ring (for inline use)
// ============================================================================

interface MiniProgressProps {
  progress: number
  size?: number
  className?: string
}

export function MiniProgressRing({
  progress,
  size = 24,
  className,
}: MiniProgressProps) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = calculateStrokeDasharray(radius)

  const color = progress >= 100
    ? DEFAULT_COLORS.success
    : progress >= 50
    ? DEFAULT_COLORS.warning
    : DEFAULT_COLORS.error

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("transform -rotate-90", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-10"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{
          strokeDashoffset: calculateStrokeDashoffset(circumference, progress),
        }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  )
}
