"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addShoppingItem } from "@/lib/actions/shopping"
import {
  SHOPPING_CATEGORIES,
  CATEGORY_ICONS,
  UNIT_LABELS,
  type ShoppingCategory,
  type Unit,
} from "@/lib/validations/shopping"

interface AddItemDialogProps {
  open: boolean
  onClose: () => void
  listId: string
}

const UNITS: Unit[] = ["piece", "kg", "g", "L", "ml", "pack", "boite", "bouteille", "sachet"]

export function AddItemDialog({ open, onClose, listId }: AddItemDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (formData: FormData) => {
    setError(null)

    const name = formData.get("name") as string
    const quantity = parseFloat(formData.get("quantity") as string) || 1
    const unitRaw = formData.get("unit") as string
    const unit: Unit | null = unitRaw && unitRaw !== "none" ? (unitRaw as Unit) : null
    const category = formData.get("category") as ShoppingCategory
    const note = formData.get("note") as string
    const urgent = formData.get("urgent") === "on"

    if (!name.trim()) {
      setError("Le nom est requis")
      return
    }

    startTransition(async () => {
      const result = await addShoppingItem({
        list_id: listId,
        name: name.trim(),
        quantity,
        unit,
        category,
        note: note || null,
        priority: urgent ? 1 : 0,
      })

      if (result.success) {
        onClose()
      } else {
        setError(result.error || "Erreur lors de l'ajout")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]" data-testid="add-item-dialog">
        <DialogHeader>
          <DialogTitle>Ajouter un article</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4" data-testid="add-item-form">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nom de l&apos;article *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Lait, Pain, Tomates..."
              required
              data-testid="add-item-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue="1"
                data-testid="add-item-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Select name="unit" defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Unité..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select name="category" defaultValue="Autres">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOPPING_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[cat]}</span>
                      <span>{cat}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Ex: Marque préférée, quantité spécifique..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="urgent" name="urgent" data-testid="add-item-urgent" />
            <Label htmlFor="urgent" className="font-normal">
              Marquer comme urgent
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} data-testid="add-item-cancel">
              Annuler
            </Button>
            <Button type="submit" disabled={isPending} data-testid="add-item-submit">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
