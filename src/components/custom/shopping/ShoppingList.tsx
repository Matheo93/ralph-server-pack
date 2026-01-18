"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus, Trash2, RotateCcw, Loader2, WifiOff, Cloud, CloudOff, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DraggableShoppingItem } from "./DraggableShoppingItem"
import { AddItemDialog } from "./AddItemDialog"
import { ShareListDialog } from "./ShareListDialog"
import { useOfflineShopping } from "@/hooks/useOfflineShopping"
import { useShoppingRealtime } from "@/hooks/useShoppingRealtime"
import { showToast } from "@/lib/toast-messages"
import {
  type ShoppingList as ShoppingListType,
  type ShoppingItem as ShoppingItemType,
  type ShoppingSuggestion,
} from "@/lib/actions/shopping"
import { CATEGORY_ICONS } from "@/lib/validations/shopping"
import type { CachedShoppingItem } from "@/lib/offline/shopping-cache"

interface ShoppingListProps {
  list: ShoppingListType
  items: ShoppingItemType[]
  suggestions: ShoppingSuggestion[]
  userId?: string
  userName?: string
}

export function ShoppingList({ list, items: initialItems, suggestions, userId, userName }: ShoppingListProps) {
  const [quickAddValue, setQuickAddValue] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<"SUBSCRIBED" | "CLOSED" | "CHANNEL_ERROR" | "TIMED_OUT" | null>(null)

  // Track locally created items to ignore realtime duplicates
  const locallyCreatedIdsRef = useRef<Set<string>>(new Set())
  const pendingUpdatesRef = useRef<Set<string>>(new Set())

  // Use offline-first shopping hook
  const {
    items,
    isOnline,
    isSyncing,
    hasPendingChanges,
    quickAdd: originalQuickAdd,
    toggleCheck: originalToggleCheck,
    deleteItem: originalDeleteItem,
    clearChecked: originalClearChecked,
    uncheckAll: originalUncheckAll,
    reorderItems: originalReorderItems,
    refresh,
    handleRealtimeInsert,
    handleRealtimeUpdate,
    handleRealtimeDelete,
  } = useOfflineShopping({
    initialList: list,
    initialItems: initialItems,
    userId,
    userName,
  })

  // Wrap actions to track local changes
  const quickAdd = useCallback(async (name: string) => {
    await originalQuickAdd(name)
  }, [originalQuickAdd])

  const toggleCheck = useCallback(async (itemId: string) => {
    pendingUpdatesRef.current.add(itemId)
    await originalToggleCheck(itemId)
    // Remove after a short delay to allow realtime to process
    setTimeout(() => pendingUpdatesRef.current.delete(itemId), 2000)
  }, [originalToggleCheck])

  const deleteItem = useCallback(async (itemId: string) => {
    pendingUpdatesRef.current.add(itemId)
    await originalDeleteItem(itemId)
  }, [originalDeleteItem])

  const clearChecked = useCallback(async () => {
    await originalClearChecked()
  }, [originalClearChecked])

  const uncheckAll = useCallback(async () => {
    await originalUncheckAll()
  }, [originalUncheckAll])

  const reorderItems = useCallback(async (itemIds: string[]) => {
    itemIds.forEach(id => pendingUpdatesRef.current.add(id))
    await originalReorderItems(itemIds)
    // Remove after a short delay
    setTimeout(() => {
      itemIds.forEach(id => pendingUpdatesRef.current.delete(id))
    }, 2000)
  }, [originalReorderItems])

  // Set up Supabase Realtime subscription
  useShoppingRealtime({
    listId: list.id,
    enabled: isOnline,
    callbacks: {
      onInsert: (item) => {
        // Skip if this item was created locally (to avoid duplicates)
        if (locallyCreatedIdsRef.current.has(item.id)) {
          locallyCreatedIdsRef.current.delete(item.id)
          return
        }
        handleRealtimeInsert(item)
      },
      onUpdate: (item) => {
        // Skip if this update was triggered by our own action
        if (pendingUpdatesRef.current.has(item.id)) {
          return
        }
        handleRealtimeUpdate(item)
      },
      onDelete: (itemId) => {
        // Skip if this delete was triggered by our own action
        if (pendingUpdatesRef.current.has(itemId)) {
          pendingUpdatesRef.current.delete(itemId)
          return
        }
        handleRealtimeDelete(itemId)
      },
      onStatusChange: (status) => {
        setRealtimeStatus(status)
      },
      onError: (error) => {
        console.error("[ShoppingList] Realtime error:", error)
      },
    },
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CachedShoppingItem[]>()
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

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddValue.trim()) return

    setIsAdding(true)
    try {
      await quickAdd(quickAddValue.trim())
      showToast.success("itemAdded", quickAddValue.trim())
      setQuickAddValue("")
    } catch {
      showToast.error("itemAddFailed")
    } finally {
      setIsAdding(false)
    }
  }

  const handleClearChecked = async () => {
    if (!confirm("Supprimer tous les articles cochés ?")) return
    try {
      await clearChecked()
      showToast.success("listCleared")
    } catch {
      showToast.error("generic", "Impossible de supprimer les articles")
    }
  }

  const handleUncheckAll = async () => {
    try {
      await uncheckAll()
      showToast.info("noChanges", "Tous les articles ont été décochés")
    } catch {
      showToast.error("generic", "Impossible de décocher les articles")
    }
  }

  const handleSuggestionClick = async (suggestion: ShoppingSuggestion) => {
    setIsAdding(true)
    try {
      await quickAdd(suggestion.item_name)
      showToast.success("itemAdded", suggestion.item_name)
    } catch {
      showToast.error("itemAddFailed")
    } finally {
      setIsAdding(false)
    }
  }

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    // Get unchecked items only (we only reorder unchecked items)
    const uncheckedItems = filteredItems.filter(item => !item.is_checked)
    const oldIndex = uncheckedItems.findIndex(item => item.id === active.id)
    const newIndex = uncheckedItems.findIndex(item => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Create new order array
    const newOrder = [...uncheckedItems]
    const [movedItem] = newOrder.splice(oldIndex, 1)
    if (movedItem) {
      newOrder.splice(newIndex, 0, movedItem)
    }

    // Get all unchecked item IDs in the new order
    const newItemIds = newOrder.map(item => item.id)

    // Call reorder
    await reorderItems(newItemIds)
  }, [filteredItems, reorderItems])

  const categories = Array.from(itemsByCategory.keys()).sort()

  // Separate unchecked and checked items for proper rendering
  const uncheckedItems = filteredItems.filter(item => !item.is_checked)
  const checkedItems = filteredItems.filter(item => item.is_checked)

  return (
    <div className="space-y-6" data-testid="shopping-list">
      {/* Offline/Sync/Realtime indicator */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {!isOnline ? (
          <Badge variant="secondary" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Mode hors-ligne
          </Badge>
        ) : hasPendingChanges ? (
          <Badge variant="outline" className="gap-1">
            {isSyncing ? (
              <>
                <Cloud className="h-3 w-3 animate-pulse" />
                Synchronisation...
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                Modifications en attente
              </>
            )}
          </Badge>
        ) : null}
        {/* Realtime status indicator */}
        {isOnline && realtimeStatus === "SUBSCRIBED" && (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
            <Radio className="h-3 w-3 animate-pulse" />
            Temps réel
          </Badge>
        )}
      </div>

      {/* Header with progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold" data-testid="shopping-list-name" id="shopping-list-title">{list.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Progress
              value={progress}
              className="flex-1 h-2"
              aria-label="Progression des courses"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap" aria-live="polite">
              {checkedCount}/{totalCount} <span className="sr-only">articles cochés</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareListDialog listId={list.id} listName={list.name} />
          {checkedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUncheckAll}
                disabled={isSyncing}
                data-testid="uncheck-all-button"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Decocher
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChecked}
                disabled={isSyncing}
                className="text-destructive hover:text-destructive"
                data-testid="clear-checked-button"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2" data-testid="quick-add-form" aria-labelledby="shopping-list-title">
        <label htmlFor="quick-add-input" className="sr-only">Ajouter un article rapidement</label>
        <Input
          id="quick-add-input"
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          placeholder="Ajouter un article rapidement..."
          className="flex-1"
          disabled={isAdding}
          data-testid="quick-add-input"
          aria-describedby={suggestions.length > 0 && quickAddValue === "" ? "suggestions-label" : undefined}
        />
        <Button type="submit" disabled={isAdding || !quickAddValue.trim()} data-testid="quick-add-submit" aria-label="Ajouter l'article">
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAddDialogOpen(true)}
          data-testid="add-detailed-button"
          aria-label="Ajouter un article avec détails"
        >
          Détaillé
        </Button>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && quickAddValue === "" && (
        <div className="flex flex-wrap gap-2" role="region" aria-label="Suggestions d'articles">
          <span id="suggestions-label" className="text-sm text-muted-foreground">Suggestions:</span>
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s.item_name}
              type="button"
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
              onClick={() => handleSuggestionClick(s)}
              aria-label={`Ajouter ${s.item_name}`}
            >
              {s.item_name}
            </button>
          ))}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" data-testid="category-filter" role="group" aria-label="Filtrer par catégorie">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            data-testid="category-filter-all"
            aria-pressed={selectedCategory === null}
          >
            Tous ({totalCount})
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              data-testid={`category-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              aria-pressed={selectedCategory === cat}
            >
              <span aria-hidden="true">{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || ""}</span> {cat} ({itemsByCategory.get(cat)?.length || 0})
            </Button>
          ))}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
          <p className="text-lg">Votre liste est vide</p>
          <p className="text-sm mt-1">Ajoutez des articles pour commencer</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="shopping-items-list">
          {/* Unchecked items with drag & drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={uncheckedItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {uncheckedItems.map(item => (
                <DraggableShoppingItem
                  key={item.id}
                  item={item}
                  onToggleCheck={toggleCheck}
                  onDelete={deleteItem}
                  isDragDisabled={selectedCategory !== null}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Divider if there are checked items */}
          {checkedItems.length > 0 && uncheckedItems.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                Coches ({checkedItems.length})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Checked items (no drag & drop) */}
          {checkedItems.map(item => (
            <DraggableShoppingItem
              key={item.id}
              item={item}
              onToggleCheck={toggleCheck}
              onDelete={deleteItem}
              isDragDisabled
            />
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
