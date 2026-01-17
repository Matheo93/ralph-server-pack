"use client"

import { useState, useMemo } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TaskCategoryIcon } from "./TaskCategoryIcon"
import { TemplateTaskDialog } from "./TemplateTaskDialog"
import { allTemplatesFR } from "@/lib/data/templates-fr"
import type { TaskTemplate } from "@/types/template"
import { cn } from "@/lib/utils/index"
import { FileText, Search, ChevronRight } from "lucide-react"

const CATEGORIES = [
  { value: "all", label: "Toutes les catégories" },
  { value: "ecole", label: "École" },
  { value: "sante", label: "Santé" },
  { value: "administratif", label: "Administratif" },
  { value: "quotidien", label: "Quotidien" },
  { value: "social", label: "Social" },
  { value: "activites", label: "Activités" },
  { value: "logistique", label: "Logistique" },
]

const AGE_GROUPS = [
  { value: "all", label: "Tous les âges" },
  { value: "0-3", label: "0-3 ans" },
  { value: "3-6", label: "3-6 ans" },
  { value: "6-11", label: "6-11 ans" },
  { value: "11-15", label: "11-15 ans" },
  { value: "15-18", label: "15-18 ans" },
]

function getWeightLabel(weight: number): string {
  if (weight <= 2) return "Léger"
  if (weight <= 4) return "Moyen"
  if (weight <= 6) return "Important"
  return "Lourd"
}

function getWeightColor(weight: number): string {
  if (weight <= 2) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (weight <= 4) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  if (weight <= 6) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
}

interface TemplateSelectorProps {
  children?: React.ReactNode
  className?: string
}

export function TemplateSelector({ children, className }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Convert static templates to TaskTemplate format
  const templates = useMemo((): TaskTemplate[] => {
    return allTemplatesFR.map((t, i): TaskTemplate => ({
      id: `static-${i}`,
      country: t.country ?? "FR",
      age_min: t.age_min,
      age_max: t.age_max,
      category: t.category,
      subcategory: t.subcategory ?? null,
      title: t.title,
      description: t.description ?? null,
      cron_rule: t.cron_rule ?? null,
      weight: t.weight ?? 3,
      days_before_deadline: t.days_before_deadline ?? 7,
      period: t.period ?? null,
      is_active: t.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  }, [])

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesTitle = template.title.toLowerCase().includes(searchLower)
        const matchesDescription = template.description?.toLowerCase().includes(searchLower)
        if (!matchesTitle && !matchesDescription) return false
      }

      // Category filter
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
        return false
      }

      // Age filter
      if (ageFilter !== "all") {
        const [minStr, maxStr] = ageFilter.split("-")
        const min = parseInt(minStr ?? "0", 10)
        const max = parseInt(maxStr ?? "18", 10)
        if (template.age_max < min || template.age_min > max) {
          return false
        }
      }

      return true
    })
  }, [templates, search, categoryFilter, ageFilter])

  const handleTemplateClick = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setDialogOpen(true)
  }

  const handleDialogClose = (isOpen: boolean) => {
    setDialogOpen(isOpen)
    if (!isOpen) {
      // Close the sheet after creating a task
      setOpen(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {children ?? (
            <Button variant="outline" className={className}>
              <FileText className="w-4 h-4 mr-2" />
              Utiliser un template
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Templates de tâches</SheetTitle>
            <SheetDescription>
              Choisissez un template pour créer une tâche rapidement
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((age) => (
                    <SelectItem key={age.value} value={age.value}>
                      {age.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} disponible{filteredTemplates.length !== 1 ? "s" : ""}
            </p>

            {/* Template List */}
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2 pr-4">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun template ne correspond a votre recherche
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border",
                        "hover:bg-muted/50 hover:border-primary/20",
                        "transition-colors group"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <TaskCategoryIcon
                          code={template.category}
                          color={null}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {template.title}
                            </h4>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getWeightColor(template.weight))}
                            >
                              {getWeightLabel(template.weight)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.age_min === template.age_max
                                ? `${template.age_min} ans`
                                : `${template.age_min}-${template.age_max} ans`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog for creating task from selected template */}
      <TemplateTaskDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </>
  )
}
