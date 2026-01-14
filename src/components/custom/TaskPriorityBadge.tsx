"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"

interface TaskPriorityBadgeProps {
  priority: string
  className?: string
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: {
    label: "Critique",
    className: "bg-red-500 text-white hover:bg-red-500",
  },
  high: {
    label: "Haute",
    className: "bg-orange-500 text-white hover:bg-orange-500",
  },
  normal: {
    label: "Normale",
    className: "bg-blue-500 text-white hover:bg-blue-500",
  },
  low: {
    label: "Basse",
    className: "bg-gray-400 text-white hover:bg-gray-400",
  },
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority] ?? priorityConfig.normal

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
