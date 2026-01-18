"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { showToast } from "@/lib/toast-messages"
import type { TemplateWithSettings } from "@/types/template"

interface TemplateSwitchesProps {
  templates: TemplateWithSettings[]
  onToggle?: (templateId: string, enabled: boolean) => Promise<void>
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ecole: "École",
    sante: "Santé",
    administratif: "Administratif",
    quotidien: "Quotidien",
    social: "Social",
    activites: "Activités",
    logistique: "Logistique",
  }
  return labels[category] ?? category
}

function getAgeLabel(ageMin: number, ageMax: number): string {
  if (ageMin === ageMax) return `${ageMin} ans`
  if (ageMin === 0 && ageMax === 18) return "Tous âges"
  return `${ageMin}-${ageMax} ans`
}

export function TemplateSwitches({ templates, onToggle }: TemplateSwitchesProps) {
  const router = useRouter()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const handleToggle = async (template: TemplateWithSettings, enabled: boolean) => {
    if (!onToggle) return

    setPendingIds((prev) => new Set(prev).add(template.id))

    try {
      await onToggle(template.id, enabled)
      router.refresh()
      if (enabled) {
        showToast.success("templateEnabled", template.title)
      } else {
        showToast.success("templateDisabled", template.title)
      }
    } catch {
      showToast.error("generic", `Impossible de modifier "${template.title}"`)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(template.id)
        return next
      })
    }
  }

  // Group templates by category
  const grouped: Record<string, TemplateWithSettings[]> = {}
  for (const template of templates) {
    const category = template.category
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category]!.push(template)
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Aucun template disponible
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, categoryTemplates]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            {getCategoryLabel(category)}
          </h3>
          <div className="space-y-2">
            {categoryTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <TaskCategoryIcon code={template.category} color={null} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{template.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {getAgeLabel(template.age_min, template.age_max)}
                      </Badge>
                      {template.cron_rule && (
                        <Badge variant="outline" className="text-xs bg-sky-50 dark:bg-sky-950/30">
                          Récurrent
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={template.isEnabledForHousehold}
                  onCheckedChange={(checked: boolean) => handleToggle(template, checked)}
                  disabled={pendingIds.has(template.id) || !onToggle}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
