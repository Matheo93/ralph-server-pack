/**
 * Catalog Browser Component
 *
 * Browse and filter task templates from the catalog.
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Search, Filter, X, Loader2 } from "lucide-react"
import { TaskTemplateCard } from "./TaskTemplateCard"
import {
  TaskTemplate,
  TaskCategory,
  AgeRange,
  TASK_CATEGORIES,
  AGE_RANGES,
  getCategoryDisplayName,
  getAgeRangeDisplayName,
} from "@/lib/catalog/types"
import { filterTemplates } from "@/lib/catalog/generator"
import { getTemplates } from "@/lib/catalog/templates"

interface CatalogBrowserProps {
  onSelectTemplate?: (template: TaskTemplate) => void
  onAddTemplate?: (template: TaskTemplate) => void
  selectedTemplates?: string[]
  className?: string
  maxHeight?: string
  showFilters?: boolean
  initialCategory?: TaskCategory
  initialAgeRange?: AgeRange
}

export function CatalogBrowser({
  onSelectTemplate,
  onAddTemplate,
  selectedTemplates = [],
  className,
  maxHeight = "600px",
  showFilters = true,
  initialCategory,
  initialAgeRange,
}: CatalogBrowserProps) {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<TaskCategory[]>(
    initialCategory ? [initialCategory] : []
  )
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<AgeRange[]>(
    initialAgeRange ? [initialAgeRange] : []
  )
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [isLoading] = useState(false)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return filterTemplates({
      search: search.trim() || undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      ageRanges: selectedAgeRanges.length > 0 ? selectedAgeRanges : undefined,
      critical: criticalOnly || undefined,
    })
  }, [search, selectedCategories, selectedAgeRanges, criticalOnly])

  const toggleCategory = useCallback((category: TaskCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }, [])

  const toggleAgeRange = useCallback((ageRange: AgeRange) => {
    setSelectedAgeRanges((prev) =>
      prev.includes(ageRange)
        ? prev.filter((a) => a !== ageRange)
        : [...prev, ageRange]
    )
  }, [])

  const clearFilters = useCallback(() => {
    setSearch("")
    setSelectedCategories([])
    setSelectedAgeRanges([])
    setCriticalOnly(false)
  }, [])

  const hasActiveFilters =
    search.length > 0 ||
    selectedCategories.length > 0 ||
    selectedAgeRanges.length > 0 ||
    criticalOnly

  return (
    <div className={cn("flex flex-col", className)} data-testid="catalog-browser">
      {/* Search and filter toggle */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une tâche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="catalog-search"
          />
        </div>

        {showFilters && (
          <Button
            variant={showFilterPanel ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            data-testid="filter-toggle"
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleCategory(cat)}
            >
              {getCategoryDisplayName(cat)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedAgeRanges.map((age) => (
            <Badge
              key={age}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleAgeRange(age)}
            >
              {age} ans
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {criticalOnly && (
            <Badge
              variant="destructive"
              className="cursor-pointer"
              onClick={() => setCriticalOnly(false)}
            >
              Importants seulement
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Effacer tout
          </Button>
        </div>
      )}

      {/* Filter panel */}
      {showFilterPanel && showFilters && (
        <div className="mb-4 p-4 border rounded-lg bg-muted/50" data-testid="filter-panel">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Categories */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Catégories</Label>
              <div className="flex flex-wrap gap-2">
                {TASK_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategories.includes(cat) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat)}
                  >
                    {getCategoryDisplayName(cat)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Age ranges */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tranches d'âge</Label>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((age) => (
                  <Badge
                    key={age}
                    variant={selectedAgeRanges.includes(age) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAgeRange(age)}
                  >
                    {age} ans
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Critical only */}
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="critical"
              checked={criticalOnly}
              onCheckedChange={(checked: boolean | "indeterminate") => setCriticalOnly(checked === true)}
            />
            <Label htmlFor="critical" className="text-sm cursor-pointer">
              Afficher uniquement les tâches importantes
            </Label>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground mb-2">
        {filteredTemplates.length} tâche{filteredTemplates.length !== 1 ? "s" : ""} trouvée
        {filteredTemplates.length !== 1 ? "s" : ""}
      </div>

      {/* Templates list */}
      <ScrollArea style={{ maxHeight }} className="pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune tâche ne correspond à vos critères</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Effacer les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2" data-testid="templates-grid">
            {filteredTemplates.map((template) => (
              <TaskTemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplates.includes(template.id)}
                onSelect={onSelectTemplate}
                onAdd={onAddTemplate}
                compact
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
