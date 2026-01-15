/**
 * Task Template Card Component
 *
 * Displays a single task template with action buttons.
 */

"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Clock,
  Star,
  AlertCircle,
  Plus,
  Repeat,
  Calendar,
  GraduationCap,
  Heart,
  FileText,
  Home,
  Users,
  Music,
  Car,
} from "lucide-react"
import { TaskTemplate, TaskCategory, getCategoryDisplayName } from "@/lib/catalog/types"

interface TaskTemplateCardProps {
  template: TaskTemplate
  onAdd?: (template: TaskTemplate) => void
  onSelect?: (template: TaskTemplate) => void
  selected?: boolean
  childName?: string
  relevanceScore?: number
  reason?: string
  className?: string
  compact?: boolean
}

const categoryIcons: Record<TaskCategory, typeof GraduationCap> = {
  ecole: GraduationCap,
  sante: Heart,
  administratif: FileText,
  quotidien: Home,
  social: Users,
  activites: Music,
  logistique: Car,
  autre: Star,
}

const categoryColors: Record<TaskCategory, string> = {
  ecole: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  sante: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  administratif: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  quotidien: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  social: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  activites: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  logistique: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  autre: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

const recurrenceLabels: Record<string, string> = {
  once: "Une fois",
  daily: "Quotidien",
  weekly: "Hebdo",
  monthly: "Mensuel",
  yearly: "Annuel",
  seasonal: "Saisonnier",
}

export function TaskTemplateCard({
  template,
  onAdd,
  onSelect,
  selected = false,
  childName,
  relevanceScore,
  reason,
  className,
  compact = false,
}: TaskTemplateCardProps) {
  const CategoryIcon = categoryIcons[template.category]

  const handleClick = () => {
    if (onSelect) {
      onSelect(template)
    }
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAdd?.(template)
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
          selected && "border-primary bg-primary/5",
          onSelect && "cursor-pointer hover:bg-accent",
          className
        )}
        onClick={handleClick}
        data-testid="template-card-compact"
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            categoryColors[template.category]
          )}
        >
          <CategoryIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{template.title}</p>
          {childName && (
            <p className="text-xs text-muted-foreground">Pour {childName}</p>
          )}
        </div>

        {template.critical && (
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        )}

        {onAdd && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleAdd}
            data-testid="template-add-button"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "transition-all",
        selected && "ring-2 ring-primary",
        onSelect && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={handleClick}
      data-testid="template-card"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Badge
            variant="secondary"
            className={cn("mb-2", categoryColors[template.category])}
          >
            <CategoryIcon className="h-3 w-3 mr-1" />
            {getCategoryDisplayName(template.category)}
          </Badge>

          {template.critical && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>Tâche importante</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <CardTitle className="text-lg">{template.title}</CardTitle>

        {template.description && (
          <CardDescription>{template.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {template.recurrence !== "once" && (
            <div className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              <span>{recurrenceLabels[template.recurrence]}</span>
            </div>
          )}

          {template.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{template.estimatedMinutes} min</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>Charge: {template.weight}/5</span>
          </div>
        </div>

        {/* Age ranges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {template.ageRanges.map((age) => (
            <Badge key={age} variant="outline" className="text-xs">
              {age} ans
            </Badge>
          ))}
        </div>

        {/* Suggestion info */}
        {(childName || reason) && (
          <div className="mt-3 pt-3 border-t">
            {childName && (
              <p className="text-sm font-medium text-primary">
                Pour {childName}
              </p>
            )}
            {reason && (
              <p className="text-xs text-muted-foreground mt-1">{reason}</p>
            )}
            {relevanceScore !== undefined && (
              <div className="mt-1 flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${relevanceScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(relevanceScore * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {onAdd && (
        <CardFooter className="pt-2">
          <Button
            onClick={handleAdd}
            className="w-full"
            data-testid="template-add-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter cette tâche
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
