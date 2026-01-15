"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"

interface Child {
  id: string
  first_name: string
}

interface Category {
  id: string
  code: string
  name_fr: string
}

interface TaskFiltersProps {
  children: Child[]
  categories: Category[]
  className?: string
}

const statusOptions = [
  { value: "pending", label: "En attente" },
  { value: "done", label: "Terminé" },
  { value: "postponed", label: "Reporté" },
  { value: "cancelled", label: "Annulé" },
]

const priorityOptions = [
  { value: "critical", label: "Critique" },
  { value: "high", label: "Haute" },
  { value: "normal", label: "Normale" },
  { value: "low", label: "Basse" },
]

export function TaskFilters({ children, categories, className }: TaskFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get("status") ?? ""
  const currentPriority = searchParams.get("priority") ?? ""
  const currentChild = searchParams.get("child_id") ?? ""
  const currentCategory = searchParams.get("category_id") ?? ""
  const currentSearch = searchParams.get("search") ?? ""

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push("?")
  }

  const hasFilters =
    currentStatus || currentPriority || currentChild || currentCategory || currentSearch

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher..."
          value={currentSearch}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-48"
        />

        <Select
          value={currentStatus || "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentPriority || "all"}
          onValueChange={(v) => updateFilter("priority", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            {priorityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {children.length > 0 && (
          <Select
            value={currentChild || "all"}
            onValueChange={(v) => updateFilter("child_id", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Enfant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les enfants</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {categories.length > 0 && (
          <Select
            value={currentCategory || "all"}
            onValueChange={(v) => updateFilter("category_id", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name_fr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Effacer filtres
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          {currentStatus && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("status", "")}>
              {statusOptions.find((o) => o.value === currentStatus)?.label} x
            </Badge>
          )}
          {currentPriority && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("priority", "")}>
              {priorityOptions.find((o) => o.value === currentPriority)?.label} x
            </Badge>
          )}
          {currentChild && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("child_id", "")}>
              {children.find((c) => c.id === currentChild)?.first_name} x
            </Badge>
          )}
          {currentCategory && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("category_id", "")}>
              {categories.find((c) => c.id === currentCategory)?.name_fr} x
            </Badge>
          )}
          {currentSearch && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilter("search", "")}>
              &quot;{currentSearch}&quot; x
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
