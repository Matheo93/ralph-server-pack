import { z } from "zod"

// Shopping categories
export const ShoppingCategoryEnum = z.enum([
  "Fruits et legumes",
  "Viandes et poissons",
  "Produits laitiers",
  "Boulangerie",
  "Epicerie salee",
  "Epicerie sucree",
  "Boissons",
  "Surgeles",
  "Hygiene et beaute",
  "Entretien",
  "Bebe",
  "Animaux",
  "Autres",
])

export type ShoppingCategory = z.infer<typeof ShoppingCategoryEnum>

// All shopping categories as array
export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  "Fruits et legumes",
  "Viandes et poissons",
  "Produits laitiers",
  "Boulangerie",
  "Epicerie salee",
  "Epicerie sucree",
  "Boissons",
  "Surgeles",
  "Hygiene et beaute",
  "Entretien",
  "Bebe",
  "Animaux",
  "Autres",
]

// Category icons (emoji)
export const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  "Fruits et legumes": "🥬",
  "Viandes et poissons": "🥩",
  "Produits laitiers": "🧀",
  "Boulangerie": "🥖",
  "Epicerie salee": "🥫",
  "Epicerie sucree": "🍫",
  "Boissons": "🥤",
  "Surgeles": "🧊",
  "Hygiene et beaute": "🧴",
  "Entretien": "🧹",
  "Bebe": "👶",
  "Animaux": "🐾",
  "Autres": "📦",
}

// Units for quantities
export const UnitEnum = z.enum([
  "piece",
  "kg",
  "g",
  "L",
  "ml",
  "pack",
  "boite",
  "bouteille",
  "sachet",
])

export type Unit = z.infer<typeof UnitEnum>

export const UNIT_LABELS: Record<Unit, string> = {
  piece: "piece(s)",
  kg: "kg",
  g: "g",
  L: "L",
  ml: "ml",
  pack: "pack(s)",
  boite: "boite(s)",
  bouteille: "bouteille(s)",
  sachet: "sachet(s)",
}

// Shopping list creation schema
export const ShoppingListCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas depasser 100 caracteres")
    .default("Liste principale"),
})

export type ShoppingListCreateInput = z.infer<typeof ShoppingListCreateSchema>

// Shopping list update schema
export const ShoppingListUpdateSchema = z.object({
  id: z.string().uuid("ID de liste invalide"),
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas depasser 100 caracteres"),
  is_active: z.boolean().optional(),
})

export type ShoppingListUpdateInput = z.infer<typeof ShoppingListUpdateSchema>

// Shopping item creation schema
export const ShoppingItemCreateSchema = z.object({
  list_id: z.string().uuid("ID de liste invalide"),
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(255, "Le nom ne peut pas depasser 255 caracteres"),
  quantity: z.number().positive("La quantite doit etre positive").default(1),
  unit: UnitEnum.nullable().optional(),
  category: ShoppingCategoryEnum.default("Autres"),
  note: z
    .string()
    .max(500, "La note ne peut pas depasser 500 caracteres")
    .nullable()
    .optional(),
  priority: z.number().int().min(0).max(1).default(0), // 0=normal, 1=urgent
})

export type ShoppingItemCreateInput = z.infer<typeof ShoppingItemCreateSchema>

// Shopping item update schema
export const ShoppingItemUpdateSchema = ShoppingItemCreateSchema.partial().extend({
  id: z.string().uuid("ID d'article invalide"),
})

export type ShoppingItemUpdateInput = z.infer<typeof ShoppingItemUpdateSchema>

// Shopping item check schema
export const ShoppingItemCheckSchema = z.object({
  id: z.string().uuid("ID d'article invalide"),
  is_checked: z.boolean(),
})

export type ShoppingItemCheckInput = z.infer<typeof ShoppingItemCheckSchema>

// Bulk check schema
export const ShoppingItemsBulkCheckSchema = z.object({
  item_ids: z.array(z.string().uuid("ID d'article invalide")).min(1),
  is_checked: z.boolean(),
})

export type ShoppingItemsBulkCheckInput = z.infer<typeof ShoppingItemsBulkCheckSchema>

// Quick add schema (simplified)
export const ShoppingItemQuickAddSchema = z.object({
  list_id: z.string().uuid("ID de liste invalide"),
  name: z.string().min(1, "Le nom est requis").max(255),
})

export type ShoppingItemQuickAddInput = z.infer<typeof ShoppingItemQuickAddSchema>
