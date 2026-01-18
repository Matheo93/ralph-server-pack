"use client"

import { useMemo, useState } from "react"
import { ShoppingCart, Check, AlertCircle, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORY_ICONS, UNIT_LABELS } from "@/lib/validations/shopping"
import type { SharedShoppingList, SharedShoppingItem } from "@/lib/actions/shopping-share"

interface SharedShoppingListViewProps {
  list: SharedShoppingList
  items: SharedShoppingItem[]
}

export function SharedShoppingListView({ list, items }: SharedShoppingListViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showChecked, setShowChecked] = useState(true)

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, SharedShoppingItem[]>()
    items.forEach(item => {
      const existing = map.get(item.category) || []
      map.set(item.category, [...existing, item])
    })
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    let filtered = items
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }
    return filtered
  }, [items, selectedCategory])

  const uncheckedItems = filteredItems.filter(item => !item.is_checked)
  const checkedItems = filteredItems.filter(item => item.is_checked)

  const progress = items.length > 0 ? (list.checked_count / list.item_count) * 100 : 0
  const categories = Array.from(itemsByCategory.keys()).sort()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold truncate">{list.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>Liste partagee (lecture seule)</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {list.checked_count}/{list.item_count}
            </span>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par categorie">
            <Button
              variant={selectedCategory === null ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              aria-pressed={selectedCategory === null}
            >
              Tous ({items.length})
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                aria-pressed={selectedCategory === cat}
              >
                <span aria-hidden="true">{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || ""}</span>{" "}
                {cat} ({itemsByCategory.get(cat)?.length || 0})
              </Button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground">Cette liste est vide</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unchecked items */}
            {uncheckedItems.length > 0 && (
              <div className="space-y-2">
                {uncheckedItems.map(item => (
                  <SharedShoppingItemCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowChecked(!showChecked)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <div className="flex-1 h-px bg-border" />
                  <span className="flex items-center gap-1">
                    Coches ({checkedItems.length})
                    {showChecked ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </button>

                {showChecked && (
                  <div className="space-y-2">
                    {checkedItems.map(item => (
                      <SharedShoppingItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Liste partagee via FamilyLoad
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          >
            Creer votre liste
          </a>
        </footer>
      </main>
    </div>
  )
}

function SharedShoppingItemCard({ item }: { item: SharedShoppingItem }) {
  const categoryIcon = CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || "📦"
  const unitLabel = item.unit ? UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] || item.unit : null

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
        item.is_checked && "opacity-60"
      )}
    >
      {/* Check indicator */}
      <div
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          item.is_checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {item.is_checked && <Check className="h-4 w-4" />}
      </div>

      {/* Category icon */}
      <span className="text-lg flex-shrink-0" aria-hidden="true">
        {categoryIcon}
      </span>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium truncate", item.is_checked && "line-through")}>
            {item.name}
          </span>
          {item.priority === 1 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertCircle className="h-3 w-3" />
              Urgent
            </Badge>
          )}
        </div>
        {item.note && (
          <p className="text-sm text-muted-foreground truncate">{item.note}</p>
        )}
      </div>

      {/* Quantity */}
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {item.quantity > 1 || unitLabel ? (
          <span>
            {item.quantity} {unitLabel || "x"}
          </span>
        ) : null}
      </div>
    </div>
  )
}
