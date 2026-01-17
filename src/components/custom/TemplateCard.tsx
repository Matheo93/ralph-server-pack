"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { TemplateTaskDialog } from "./TemplateTaskDialog"
import type { TaskTemplate, TemplateWithSettings } from "@/types/template"
import { cn } from "@/lib/utils/index"
import { Plus } from "lucide-react"

interface TemplateCardProps {
  template: TaskTemplate | TemplateWithSettings
  showAge?: boolean
  showPeriod?: boolean
  compact?: boolean
}

/**
 * Get age range label
 */
function getAgeLabel(ageMin: number, ageMax: number): string {
  if (ageMin === ageMax) {
    return `${ageMin} ans`
  }
  if (ageMin === 0 && ageMax === 18) {
    return "Tous ages"
  }
  return `${ageMin}-${ageMax} ans`
}

/**
 * Get period label in French
 */
function getPeriodLabel(period: string | null): string {
  if (!period || period === "year_round") return ""

  const labels: Record<string, string> = {
    rentree: "Rentree",
    toussaint: "Toussaint",
    noel: "Noel",
    hiver: "Hiver",
    printemps: "Printemps",
    ete: "Ete",
  }

  return labels[period] ?? period
}

/**
 * Get weight label
 */
function getWeightLabel(weight: number): string {
  if (weight <= 2) return "Leger"
  if (weight <= 4) return "Moyen"
  if (weight <= 6) return "Important"
  return "Lourd"
}

/**
 * Get weight color
 */
function getWeightColor(weight: number): string {
  if (weight <= 2) return "bg-green-100 text-green-800"
  if (weight <= 4) return "bg-blue-100 text-blue-800"
  if (weight <= 6) return "bg-orange-100 text-orange-800"
  return "bg-red-100 text-red-800"
}

export function TemplateCard({
  template,
  showAge = true,
  showPeriod = true,
  compact = false,
}: TemplateCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isDisabled = "isEnabledForHousehold" in template && !template.isEnabledForHousehold

  return (
    <>
      <Card
        className={cn(
          "w-full transition-all hover:shadow-md cursor-pointer group",
          isDisabled && "opacity-50 bg-muted/30"
        )}
        onClick={() => !isDisabled && setDialogOpen(true)}
      >
        <CardHeader className={cn("pb-2", compact && "pb-1 pt-3")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <TaskCategoryIcon
                code={template.category}
                color={null}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className={cn("text-base", compact && "text-sm")}>
                  {template.title}
                </CardTitle>
                {!compact && template.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="secondary"
                className={cn("text-xs", getWeightColor(template.weight))}
              >
                {getWeightLabel(template.weight)}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setDialogOpen(true)
                }}
                disabled={isDisabled}
              >
                <Plus className="w-4 h-4" />
                <span className="sr-only">Créer une tâche</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn("pt-0", compact && "pb-3")}>
          <div className="flex flex-wrap items-center gap-2">
            {showAge && (
              <Badge variant="outline" className="text-xs">
                {getAgeLabel(template.age_min, template.age_max)}
              </Badge>
            )}
            {showPeriod && template.period && template.period !== "year_round" && (
              <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/30">
                {getPeriodLabel(template.period)}
              </Badge>
            )}
            {template.cron_rule && (
              <Badge variant="outline" className="text-xs bg-sky-50 dark:bg-sky-950/30">
                Récurrent
              </Badge>
            )}
            {isDisabled && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Désactivé
              </Badge>
            )}
            {!isDisabled && (
              <span className="text-xs text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                Cliquez pour créer une tâche
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <TemplateTaskDialog
        template={template}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
