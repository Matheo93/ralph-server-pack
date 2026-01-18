"use client"

import { useState, useTransition } from "react"
import { Trash2, AlertCircle, Loader2, MoreHorizontal, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  checkShoppingItem,
  deleteShoppingItem,
  type ShoppingItem as ShoppingItemType,
} from "@/lib/actions/shopping"
import { CATEGORY_ICONS, UNIT_LABELS, type ShoppingCategory, type Unit } from "@/lib/validations/shopping"
import { showToast } from "@/lib/toast-messages"

interface ShoppingItemProps {
  item: ShoppingItemType
}

export function ShoppingItem({ item }: ShoppingItemProps) {
  const [isPending, startTransition] = useTransition()

  const handleCheck = () => {
    startTransition(async () => {
      try {
        await checkShoppingItem({
          id: item.id,
          is_checked: !item.is_checked,
        })
      } catch {
        showToast.error("generic", "Impossible de modifier l'article")
      }
    })
  }

  const handleDelete = () => {
    if (!confirm("Supprimer cet article ?")) return

    startTransition(async () => {
      try {
        await deleteShoppingItem(item.id)
        showToast.success("itemDeleted", item.name)
      } catch {
        showToast.error("generic", "Impossible de supprimer l'article")
      }
    })
  }

  const categoryIcon = CATEGORY_ICONS[item.category as ShoppingCategory] || "📦"
  const unitLabel = item.unit ? UNIT_LABELS[item.unit as Unit] || item.unit : ""

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
        item.is_checked && "opacity-60 bg-muted/30",
        item.priority === 1 && !item.is_checked && "border-orange-300 bg-orange-50/50"
      )}
      data-testid="shopping-item"
      data-item-id={item.id}
      data-item-checked={item.is_checked}
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={handleCheck}
        disabled={isPending}
        className="h-5 w-5"
        data-testid="shopping-item-checkbox"
      />

      <span className="text-lg">{categoryIcon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium",
              item.is_checked && "line-through text-muted-foreground"
            )}
            data-testid="shopping-item-name"
          >
            {item.name}
          </span>
          {item.priority === 1 && !item.is_checked && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {item.quantity > 1 && (
            <span>
              {item.quantity} {unitLabel}
            </span>
          )}
          {item.note && (
            <span className="truncate">- {item.note}</span>
          )}
        </div>

        {item.is_checked && item.checked_by_name && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Coché par {item.checked_by_name}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending} data-testid="shopping-item-menu">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDelete} className="text-destructive" data-testid="shopping-item-delete">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
