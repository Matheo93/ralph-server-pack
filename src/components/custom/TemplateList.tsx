"use client"

import { useState, useMemo } from "react"
import { TemplateCard } from "./TemplateCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TaskTemplate, TemplateWithSettings } from "@/types/template"

interface TemplateListProps {
  templates: (TaskTemplate | TemplateWithSettings)[]
  showFilters?: boolean
  compact?: boolean
  emptyMessage?: string
}

const CATEGORIES = [
  { value: "all", label: "Toutes catégories" },
  { value: "ecole", label: "École" },
  { value: "sante", label: "Santé" },
  { value: "administratif", label: "Administratif" },
  { value: "quotidien", label: "Quotidien" },
  { value: "social", label: "Social" },
  { value: "activites", label: "Activités" },
  { value: "logistique", label: "Logistique" },
]

const AGE_GROUPS = [
  { value: "all", label: "Tous âges" },
  { value: "0-3", label: "0-3 ans (Nourrisson)" },
  { value: "3-6", label: "3-6 ans (Maternelle)" },
  { value: "6-11", label: "6-11 ans (Primaire)" },
  { value: "11-15", label: "11-15 ans (Collège)" },
  { value: "15-18", label: "15-18 ans (Lycée)" },
]

const PERIODS = [
  { value: "all", label: "Toute l'année" },
  { value: "rentree", label: "Rentrée" },
  { value: "toussaint", label: "Toussaint" },
  { value: "noel", label: "Noël" },
  { value: "hiver", label: "Hiver" },
  { value: "printemps", label: "Printemps" },
  { value: "ete", label: "Été" },
]

export function TemplateList({
  templates,
  showFilters = true,
  compact = false,
  emptyMessage = "Aucun template trouvé",
}: TemplateListProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("all")

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

      // Period filter
      if (periodFilter !== "all") {
        if (template.period !== periodFilter && template.period !== "year_round") {
          return false
        }
      }

      return true
    })
  }, [templates, search, categoryFilter, ageFilter, periodFilter])

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, (TaskTemplate | TemplateWithSettings)[]> = {}

    for (const template of filteredTemplates) {
      const category = template.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(template)
    }

    return groups
  }, [filteredTemplates])

  const resetFilters = () => {
    setSearch("")
    setCategoryFilter("all")
    setAgeFilter("all")
    setPeriodFilter("all")
  }

  const hasActiveFilters =
    search !== "" ||
    categoryFilter !== "all" ||
    ageFilter !== "all" ||
    periodFilter !== "all"

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="space-y-3">
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Catégorie" />
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Âge" />
              </SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map((age) => (
                  <SelectItem key={age.value} value={age.value}>
                    {age.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} trouvé
            {filteredTemplates.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : categoryFilter !== "all" ? (
        // Show flat list when category is filtered
        <div className="grid gap-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        // Show grouped by category
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize">
                {getCategoryLabel(category)}
              </h3>
              <div className="grid gap-3">
                {categoryTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    showAge
                    showPeriod
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
