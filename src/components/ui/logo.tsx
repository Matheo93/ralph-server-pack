"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  variant?: "full" | "icon" | "text"
  className?: string
  animated?: boolean
}

const sizeMap = {
  xs: { icon: 24, text: "text-sm", gap: "gap-1.5" },
  sm: { icon: 32, text: "text-base", gap: "gap-2" },
  md: { icon: 40, text: "text-xl", gap: "gap-2" },
  lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 64, text: "text-3xl", gap: "gap-3" },
  "2xl": { icon: 96, text: "text-5xl", gap: "gap-4" },
}

export function Logo({
  size = "md",
  variant = "full",
  className,
  animated = false,
}: LogoProps) {
  const { icon: iconSize, text: textSize, gap } = sizeMap[size]

  const LogoIcon = ({ className: iconClassName }: { className?: string }) => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "flex-shrink-0",
        animated && "transition-transform duration-300 hover:scale-110",
        iconClassName
      )}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0070F3" />
          <stop offset="100%" stopColor="#00DFD8" />
        </linearGradient>
        <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#FF8E53" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0070F3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main circle background */}
      <circle cx="32" cy="32" r="30" fill="url(#logoGradient)" filter="url(#shadow)" />

      {/* House shape - white */}
      <path
        d="M32 14L14 28V48C14 49.1 14.9 50 16 50H28V38H36V50H48C49.1 50 50 49.1 50 48V28L32 14Z"
        fill="white"
        fillOpacity="0.95"
      />

      {/* Heart in the center of the house */}
      <path
        d="M32 28C30.5 26 28 25 26 26C23 27.5 22.5 31 24 34C25.5 37 32 42 32 42C32 42 38.5 37 40 34C41.5 31 41 27.5 38 26C36 25 33.5 26 32 28Z"
        fill="url(#heartGradient)"
      />

      {/* Small figures representing family members */}
      {/* Parent 1 (left) */}
      <circle cx="22" cy="44" r="2.5" fill="#0070F3" />
      <ellipse cx="22" cy="48" rx="2" ry="2.5" fill="#0070F3" />

      {/* Child (center) */}
      <circle cx="32" cy="45" r="2" fill="#00DFD8" />
      <ellipse cx="32" cy="48.5" rx="1.5" ry="2" fill="#00DFD8" />

      {/* Parent 2 (right) */}
      <circle cx="42" cy="44" r="2.5" fill="#0070F3" />
      <ellipse cx="42" cy="48" rx="2" ry="2.5" fill="#0070F3" />

      {/* Checkmark badge (top right) - representing tasks completed */}
      <circle cx="50" cy="16" r="10" fill="#10B981" />
      <path
        d="M45 16L48 19L55 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  const LogoText = ({ className: textClassName }: { className?: string }) => (
    <div className={cn("flex flex-col", textClassName)}>
      <span
        className={cn(
          "font-bold tracking-tight bg-gradient-to-r from-[#0070F3] to-[#00DFD8] bg-clip-text text-transparent",
          textSize
        )}
      >
        FamilyLoad
      </span>
      {size !== "xs" && size !== "sm" && (
        <span className="text-[10px] text-muted-foreground -mt-0.5 font-medium">
          Charge mentale simplifiée
        </span>
      )}
    </div>
  )

  if (variant === "icon") {
    return <LogoIcon className={className} />
  }

  if (variant === "text") {
    return <LogoText className={className} />
  }

  return (
    <div className={cn("flex items-center", gap, className)}>
      <LogoIcon />
      <LogoText />
    </div>
  )
}

// Mini logo for favicons and small displays
export function LogoMini({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="miniLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0070F3" />
          <stop offset="100%" stopColor="#00DFD8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#miniLogoGradient)" />
      <path
        d="M32 16L16 28V46C16 47.1 16.9 48 18 48H46C47.1 48 48 47.1 48 46V28L32 16Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M32 28C30.5 26 28 25 26 26C23 27.5 22.5 31 24 34C25.5 37 32 42 32 42C32 42 38.5 37 40 34C41.5 31 41 27.5 38 26C36 25 33.5 26 32 28Z"
        fill="#FF6B9D"
      />
    </svg>
  )
}

// Animated logo for loading states and intro
export function LogoAnimated({ size = "xl" }: { size?: "lg" | "xl" | "2xl" }) {
  const iconSize = sizeMap[size].icon

  return (
    <div className="relative">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-pulse"
      >
        <defs>
          <linearGradient id="animLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0070F3">
              <animate
                attributeName="stop-color"
                values="#0070F3;#00DFD8;#0070F3"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#00DFD8">
              <animate
                attributeName="stop-color"
                values="#00DFD8;#0070F3;#00DFD8"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <linearGradient id="animHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B9D" />
            <stop offset="100%" stopColor="#FF8E53" />
          </linearGradient>
        </defs>

        <circle cx="32" cy="32" r="30" fill="url(#animLogoGradient)" />
        <path
          d="M32 14L14 28V48C14 49.1 14.9 50 16 50H28V38H36V50H48C49.1 50 50 49.1 50 48V28L32 14Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M32 28C30.5 26 28 25 26 26C23 27.5 22.5 31 24 34C25.5 37 32 42 32 42C32 42 38.5 37 40 34C41.5 31 41 27.5 38 26C36 25 33.5 26 32 28Z"
          fill="url(#animHeartGradient)"
          className="animate-[heartbeat_1.5s_ease-in-out_infinite]"
        />
      </svg>

      {/* Floating particles */}
      <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-[#00DFD8] animate-bounce opacity-60" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#FF6B9D] animate-bounce delay-300 opacity-60" />
    </div>
  )
}
