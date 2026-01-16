"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, Trash2, RotateCcw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ShoppingItem } from "./ShoppingItem"
import { AddItemDialog } from "./AddItemDialog"
import {
  quickAddShoppingItem,
  clearCheckedItems,
  uncheckAllItems,
  type ShoppingList as ShoppingListType,
  type ShoppingItem as ShoppingItemType,
  type ShoppingSuggestion,
} from "@/lib/actions/shopping"
import { SHOPPING_CATEGORIES, CATEGORY_ICONS } from "@/lib/validations/shopping"

interface ShoppingListProps {
  list: ShoppingListType
  items: ShoppingItemType[]
  suggestions: ShoppingSuggestion[]
}

export function ShoppingList({ list, items, suggestions }: ShoppingListProps) {
  const [isPending, startTransition] = useTransition()
  const [quickAddValue, setQuickAddValue] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ShoppingItemType[]>()
    items.forEach(item => {
      const existing = map.get(item.category) || []
      map.set(item.category, [...existing, item])
    })
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items
    return items.filter(item => item.category === selectedCategory)
  }, [items, selectedCategory])

  const checkedCount = items.filter(i => i.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddValue.trim()) return

    startTransition(async () => {
      await quickAddShoppingItem({
        list_id: list.id,
        name: quickAddValue.trim(),
      })
      setQuickAddValue("")
    })
  }

  const handleClearChecked = () => {
    if (!confirm("Supprimer tous les articles coches ?")) return

    startTransition(async () => {
      await clearCheckedItems(list.id)
    })
  }

  const handleUncheckAll = () => {
    startTransition(async () => {
      await uncheckAllItems(list.id)
    })
  }

  const handleSuggestionClick = (suggestion: ShoppingSuggestion) => {
    startTransition(async () => {
      await quickAddShoppingItem({
        list_id: list.id,
        name: suggestion.item_name,
      })
    })
  }

  const categories = Array.from(itemsByCategory.keys()).sort()

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{list.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {checkedCount}/{totalCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checkedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUncheckAll}
                disabled={isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Decocher
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChecked}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <Input
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder="Ajouter un article rapidement..."
          className="flex-1"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !quickAddValue.trim()}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAddDialogOpen(true)}
        >
          Detaille
        </Button>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && quickAddValue === "" && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Suggestions:</span>
          {suggestions.slice(0, 8).map((s) => (
            <Badge
              key={s.item_name}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => handleSuggestionClick(s)}
            >
              {s.item_name}
            </Badge>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Tous ({totalCount})
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || "📦"} {cat} ({itemsByCategory.get(cat)?.length || 0})
            </Button>
          ))}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Votre liste est vide</p>
          <p className="text-sm mt-1">Ajoutez des articles pour commencer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Unchecked items first */}
          {filteredItems
            .filter(item => !item.is_checked)
            .map(item => (
              <ShoppingItem key={item.id} item={item} />
            ))}

          {/* Divider if there are checked items */}
          {filteredItems.some(i => i.is_checked) && filteredItems.some(i => !i.is_checked) && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                Coches ({filteredItems.filter(i => i.is_checked).length})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Checked items */}
          {filteredItems
            .filter(item => item.is_checked)
            .map(item => (
              <ShoppingItem key={item.id} item={item} />
            ))}
        </div>
      )}

      {/* Add item dialog */}
      <AddItemDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        listId={list.id}
      />
    </div>
  )
}
