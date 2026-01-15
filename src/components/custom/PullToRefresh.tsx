"use client"

import { ReactNode } from "react"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"
import { cn } from "@/lib/utils"
import { Loader2, ArrowDown } from "lucide-react"

interface PullToRefreshProps {
  children: ReactNode
  onRefresh?: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isPulling, handlers } = usePullToRefresh({
    onRefresh,
    disabled,
    threshold: 80,
  })

  const progress = Math.min(pullDistance / 80, 1)
  const showIndicator = pullDistance > 10 || isRefreshing

  return (
    <div
      className={cn("relative", className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 transition-all duration-200",
          "flex items-center justify-center",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(0, pullDistance - 40),
          transform: `translateX(-50%) rotate(${progress * 180}deg)`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-background border shadow-md",
            isRefreshing && "animate-pulse"
          )}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={cn(
                "h-5 w-5 transition-colors",
                progress >= 1 ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: isPulling || isRefreshing
            ? `translateY(${pullDistance}px)`
            : "translateY(0)",
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  )
}
