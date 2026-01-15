/**
 * Load Chart Component
 *
 * Displays task load distribution between parents as a visual chart.
 */

"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ParentLoad } from "@/lib/distribution/calculator"

interface LoadChartProps {
  parents: ParentLoad[]
  totalWeight: number
  className?: string
  showDetails?: boolean
}

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
]

export function LoadChart({
  parents,
  totalWeight,
  className,
  showDetails = true,
}: LoadChartProps) {
  if (parents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Aucune donnée de distribution
        </CardContent>
      </Card>
    )
  }

  // Sort by percentage for consistent display
  const sortedParents = [...parents].sort((a, b) => b.percentage - a.percentage)

  return (
    <Card className={className} data-testid="load-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Répartition de la charge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar chart */}
        <div className="h-8 flex rounded-lg overflow-hidden bg-muted">
          {sortedParents.map((parent, index) => (
            <TooltipProvider key={parent.userId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-full transition-all",
                      COLORS[index % COLORS.length]
                    )}
                    style={{ width: `${parent.percentage}%` }}
                    data-testid={`load-bar-${parent.userId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{parent.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {parent.percentage}% ({parent.totalWeight} points)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Legend and details */}
        {showDetails && (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedParents.map((parent, index) => (
              <div
                key={parent.userId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full flex-shrink-0",
                    COLORS[index % COLORS.length]
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{parent.userName}</p>
                  <p className="text-sm text-muted-foreground">
                    {parent.percentage}% • {parent.taskCount} tâches
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{parent.totalWeight}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="pt-2 border-t flex justify-between text-sm text-muted-foreground">
          <span>Total</span>
          <span>{totalWeight} points</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple donut chart variant
interface DonutChartProps {
  parents: ParentLoad[]
  size?: number
  className?: string
}

export function DonutChart({
  parents,
  size = 120,
  className,
}: DonutChartProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let currentOffset = 0

  return (
    <div className={cn("relative", className)} data-testid="donut-chart">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />

        {/* Segments */}
        {parents.map((parent, index) => {
          const segmentLength = (parent.percentage / 100) * circumference
          const segment = (
            <circle
              key={parent.userId}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-currentOffset}
              className={cn(
                "transition-all",
                index === 0
                  ? "text-blue-500"
                  : index === 1
                  ? "text-green-500"
                  : index === 2
                  ? "text-purple-500"
                  : "text-orange-500"
              )}
            />
          )
          currentOffset += segmentLength
          return segment
        })}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">{parents.length}</p>
          <p className="text-xs text-muted-foreground">parents</p>
        </div>
      </div>
    </div>
  )
}
