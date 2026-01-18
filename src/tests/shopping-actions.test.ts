/**
 * Shopping Actions Tests
 *
 * Tests for:
 * - Shopping list CRUD operations
 * - Shopping item CRUD operations
 * - Validation schemas
 * - Check/uncheck items
 * - Bulk operations
 * - Suggestions
 * - Access control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  ShoppingListCreateSchema,
  ShoppingListUpdateSchema,
  ShoppingItemCreateSchema,
  ShoppingItemUpdateSchema,
  ShoppingItemCheckSchema,
  ShoppingItemsBulkCheckSchema,
  ShoppingItemQuickAddSchema,
  ShoppingCategoryEnum,
  UnitEnum,
  SHOPPING_CATEGORIES,
  CATEGORY_ICONS,
  UNIT_LABELS,
} from "@/lib/validations/shopping"

// ============================================================
// VALIDATION SCHEMA TESTS
// ============================================================

describe("Shopping Validation Schemas", () => {
  describe("ShoppingListCreateSchema", () => {
    it("should validate valid list data", () => {
      const validList = {
        name: "Liste de courses",
      }

      const result = ShoppingListCreateSchema.safeParse(validList)
      expect(result.success).toBe(true)
    })

    it("should use default name when not provided", () => {
      const result = ShoppingListCreateSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("Liste principale")
      }
    })

    it("should reject empty name", () => {
      const invalidList = {
        name: "",
      }

      const result = ShoppingListCreateSchema.safeParse(invalidList)
      expect(result.success).toBe(false)
    })

    it("should reject name exceeding 100 characters", () => {
      const invalidList = {
        name: "A".repeat(101),
      }

      const result = ShoppingListCreateSchema.safeParse(invalidList)
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingListUpdateSchema", () => {
    it("should require id field", () => {
      const updateData = {
        name: "Updated List",
      }

      const result = ShoppingListUpdateSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })

    it("should validate id as UUID", () => {
      const validUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated List",
      }

      const result = ShoppingListUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it("should reject invalid id UUID", () => {
      const invalidUpdate = {
        id: "not-a-uuid",
        name: "Updated List",
      }

      const result = ShoppingListUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })

    it("should accept is_active boolean", () => {
      const validUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "List",
        is_active: false,
      }

      const result = ShoppingListUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(false)
      }
    })
  })

  describe("ShoppingItemCreateSchema", () => {
    it("should validate valid item data", () => {
      const validItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        quantity: 5,
        category: "Fruits et legumes",
      }

      const result = ShoppingItemCreateSchema.safeParse(validItem)
      expect(result.success).toBe(true)
    })

    it("should require list_id", () => {
      const invalidItem = {
        name: "Pommes",
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("list_id")
      }
    })

    it("should require name", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should reject empty name", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should reject name exceeding 255 characters", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "A".repeat(256),
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should default quantity to 1", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
      }

      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(1)
      }
    })

    it("should reject zero quantity", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        quantity: 0,
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should reject negative quantity", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        quantity: -1,
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should accept valid unit values", () => {
      const units = ["piece", "kg", "g", "L", "ml", "pack", "boite", "bouteille", "sachet"]

      for (const unit of units) {
        const item = {
          list_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Pommes",
          unit,
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid unit value", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        unit: "invalid_unit",
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should accept null unit", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        unit: null,
      }

      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should default category to Autres", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
      }

      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.category).toBe("Autres")
      }
    })

    it("should accept valid category values", () => {
      for (const category of SHOPPING_CATEGORIES) {
        const item = {
          list_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Pommes",
          category,
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid category value", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        category: "Invalid Category",
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should accept note up to 500 characters", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        note: "Bio de preference",
      }

      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should reject note exceeding 500 characters", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        note: "A".repeat(501),
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should default priority to 0", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
      }

      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe(0)
      }
    })

    it("should accept priority 0 or 1", () => {
      for (const priority of [0, 1]) {
        const item = {
          list_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Pommes",
          priority,
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it("should reject priority greater than 1", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        priority: 2,
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })

    it("should reject negative priority", () => {
      const invalidItem = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Pommes",
        priority: -1,
      }

      const result = ShoppingItemCreateSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingItemUpdateSchema", () => {
    it("should require id field", () => {
      const updateData = {
        name: "Updated Item",
      }

      const result = ShoppingItemUpdateSchema.safeParse(updateData)
      expect(result.success).toBe(false)
    })

    it("should validate id as UUID", () => {
      const validUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated Item",
      }

      const result = ShoppingItemUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it("should allow partial updates", () => {
      const partialUpdate = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        quantity: 10,
      }

      const result = ShoppingItemUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })
  })

  describe("ShoppingItemCheckSchema", () => {
    it("should require id and is_checked", () => {
      const checkData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        is_checked: true,
      }

      const result = ShoppingItemCheckSchema.safeParse(checkData)
      expect(result.success).toBe(true)
    })

    it("should reject missing id", () => {
      const invalidData = {
        is_checked: true,
      }

      const result = ShoppingItemCheckSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject missing is_checked", () => {
      const invalidData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = ShoppingItemCheckSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid UUID", () => {
      const invalidData = {
        id: "not-a-uuid",
        is_checked: true,
      }

      const result = ShoppingItemCheckSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingItemsBulkCheckSchema", () => {
    it("should validate bulk check data", () => {
      const bulkCheckData = {
        item_ids: [
          "123e4567-e89b-12d3-a456-426614174000",
          "123e4567-e89b-12d3-a456-426614174001",
        ],
        is_checked: true,
      }

      const result = ShoppingItemsBulkCheckSchema.safeParse(bulkCheckData)
      expect(result.success).toBe(true)
    })

    it("should require at least one item_id", () => {
      const invalidData = {
        item_ids: [],
        is_checked: true,
      }

      const result = ShoppingItemsBulkCheckSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject invalid UUIDs in array", () => {
      const invalidData = {
        item_ids: ["not-a-uuid"],
        is_checked: true,
      }

      const result = ShoppingItemsBulkCheckSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("ShoppingItemQuickAddSchema", () => {
    it("should validate quick add data", () => {
      const quickAddData = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Lait",
      }

      const result = ShoppingItemQuickAddSchema.safeParse(quickAddData)
      expect(result.success).toBe(true)
    })

    it("should require list_id", () => {
      const invalidData = {
        name: "Lait",
      }

      const result = ShoppingItemQuickAddSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should require name", () => {
      const invalidData = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
      }

      const result = ShoppingItemQuickAddSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject empty name", () => {
      const invalidData = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "",
      }

      const result = ShoppingItemQuickAddSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================
// ENUM TESTS
// ============================================================

describe("Shopping Enums", () => {
  describe("ShoppingCategoryEnum", () => {
    it("should include all shopping categories", () => {
      const categories = ShoppingCategoryEnum.options
      expect(categories).toContain("Fruits et legumes")
      expect(categories).toContain("Viandes et poissons")
      expect(categories).toContain("Produits laitiers")
      expect(categories).toContain("Boulangerie")
      expect(categories).toContain("Epicerie salee")
      expect(categories).toContain("Epicerie sucree")
      expect(categories).toContain("Boissons")
      expect(categories).toContain("Surgeles")
      expect(categories).toContain("Hygiene et beaute")
      expect(categories).toContain("Entretien")
      expect(categories).toContain("Bebe")
      expect(categories).toContain("Animaux")
      expect(categories).toContain("Autres")
    })

    it("should have exactly 13 categories", () => {
      expect(ShoppingCategoryEnum.options.length).toBe(13)
    })
  })

  describe("UnitEnum", () => {
    it("should include all units", () => {
      const units = UnitEnum.options
      expect(units).toContain("piece")
      expect(units).toContain("kg")
      expect(units).toContain("g")
      expect(units).toContain("L")
      expect(units).toContain("ml")
      expect(units).toContain("pack")
      expect(units).toContain("boite")
      expect(units).toContain("bouteille")
      expect(units).toContain("sachet")
    })

    it("should have exactly 9 units", () => {
      expect(UnitEnum.options.length).toBe(9)
    })
  })
})

// ============================================================
// CONSTANTS TESTS
// ============================================================

describe("Shopping Constants", () => {
  describe("SHOPPING_CATEGORIES", () => {
    it("should match ShoppingCategoryEnum options", () => {
      expect(SHOPPING_CATEGORIES).toEqual(ShoppingCategoryEnum.options)
    })
  })

  describe("CATEGORY_ICONS", () => {
    it("should have icons for all categories", () => {
      for (const category of SHOPPING_CATEGORIES) {
        expect(CATEGORY_ICONS[category]).toBeDefined()
        expect(typeof CATEGORY_ICONS[category]).toBe("string")
      }
    })

    it("should have valid emoji icons", () => {
      expect(CATEGORY_ICONS["Fruits et legumes"]).toBe("🥬")
      expect(CATEGORY_ICONS["Viandes et poissons"]).toBe("🥩")
      expect(CATEGORY_ICONS["Produits laitiers"]).toBe("🧀")
      expect(CATEGORY_ICONS["Boulangerie"]).toBe("🥖")
      expect(CATEGORY_ICONS["Boissons"]).toBe("🥤")
      expect(CATEGORY_ICONS["Autres"]).toBe("📦")
    })
  })

  describe("UNIT_LABELS", () => {
    it("should have labels for all units", () => {
      for (const unit of UnitEnum.options) {
        expect(UNIT_LABELS[unit]).toBeDefined()
        expect(typeof UNIT_LABELS[unit]).toBe("string")
      }
    })

    it("should have correct label formats", () => {
      expect(UNIT_LABELS["piece"]).toBe("piece(s)")
      expect(UNIT_LABELS["kg"]).toBe("kg")
      expect(UNIT_LABELS["L"]).toBe("L")
      expect(UNIT_LABELS["boite"]).toBe("boite(s)")
      expect(UNIT_LABELS["bouteille"]).toBe("bouteille(s)")
    })
  })
})

// ============================================================
// EDGE CASES AND BOUNDARY TESTS
// ============================================================

describe("Shopping Edge Cases", () => {
  describe("Name validation boundaries", () => {
    it("should accept name with exactly 1 character", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "A",
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should accept name with exactly 255 characters", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "A".repeat(255),
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should accept list name with exactly 100 characters", () => {
      const list = {
        name: "A".repeat(100),
      }
      const result = ShoppingListCreateSchema.safeParse(list)
      expect(result.success).toBe(true)
    })

    it("should accept note with exactly 500 characters", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        note: "A".repeat(500),
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })
  })

  describe("Quantity validation boundaries", () => {
    it("should accept very small positive quantity", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        quantity: 0.001,
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should accept large quantity", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        quantity: 999999,
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })
  })

  describe("UUID validation", () => {
    it("should accept valid UUIDv4", () => {
      const validUUIDs = [
        "123e4567-e89b-12d3-a456-426614174000",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "00000000-0000-0000-0000-000000000000",
      ]

      for (const uuid of validUUIDs) {
        const item = {
          list_id: uuid,
          name: "Test",
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid UUID formats", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "123e4567e89b12d3a456426614174000", // missing dashes
        "123e4567-e89b-12d3-a456-42661417400", // too short
        "123e4567-e89b-12d3-a456-4266141740000", // too long
        "gggggggg-gggg-gggg-gggg-gggggggggggg", // invalid characters
      ]

      for (const uuid of invalidUUIDs) {
        const item = {
          list_id: uuid,
          name: "Test",
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(false)
      }
    })
  })

  describe("Special characters in names", () => {
    it("should accept names with special characters", () => {
      const specialNames = [
        "Pâtes à la carbonara",
        "Œufs bio",
        "Café moulu",
        "Bœuf haché",
        "Thé vert",
        "Crème fraîche",
        "Légumes surgelés",
      ]

      for (const name of specialNames) {
        const item = {
          list_id: "123e4567-e89b-12d3-a456-426614174000",
          name,
        }
        const result = ShoppingItemCreateSchema.safeParse(item)
        expect(result.success).toBe(true)
      }
    })

    it("should accept names with numbers", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Coca-Cola 1.5L",
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it("should accept names with emojis", () => {
      const item = {
        list_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "🍎 Pommes",
      }
      const result = ShoppingItemCreateSchema.safeParse(item)
      expect(result.success).toBe(true)
    })
  })

  describe("Multiple items in bulk check", () => {
    it("should accept maximum reasonable bulk items", () => {
      const item_ids = Array.from({ length: 100 }, (_, i) =>
        `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, "0")}`
      )

      const bulkData = {
        item_ids,
        is_checked: true,
      }

      const result = ShoppingItemsBulkCheckSchema.safeParse(bulkData)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================
// CATEGORY AND UNIT COMPLETENESS TESTS
// ============================================================

describe("Category and Unit Completeness", () => {
  it("should have 13 unique categories", () => {
    const uniqueCategories = new Set(SHOPPING_CATEGORIES)
    expect(uniqueCategories.size).toBe(13)
  })

  it("should have 9 unique units", () => {
    const uniqueUnits = new Set(UnitEnum.options)
    expect(uniqueUnits.size).toBe(9)
  })

  it("should have matching category count in CATEGORY_ICONS", () => {
    const iconCategories = Object.keys(CATEGORY_ICONS)
    expect(iconCategories.length).toBe(SHOPPING_CATEGORIES.length)
  })

  it("should have matching unit count in UNIT_LABELS", () => {
    const labelUnits = Object.keys(UNIT_LABELS)
    expect(labelUnits.length).toBe(UnitEnum.options.length)
  })

  it("CATEGORY_ICONS should have all categories from enum", () => {
    for (const category of ShoppingCategoryEnum.options) {
      expect(CATEGORY_ICONS[category]).toBeDefined()
    }
  })

  it("UNIT_LABELS should have all units from enum", () => {
    for (const unit of UnitEnum.options) {
      expect(UNIT_LABELS[unit]).toBeDefined()
    }
  })
})

// ============================================================
// TYPE COERCION TESTS
// ============================================================

describe("Type Coercion", () => {
  it("should not coerce string quantity to number", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
      quantity: "5" as unknown,
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(false)
  })

  it("should not coerce number priority to acceptable value", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
      priority: "1" as unknown,
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(false)
  })

  it("should handle boolean is_checked correctly", () => {
    const validData = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      is_checked: true,
    }
    expect(ShoppingItemCheckSchema.safeParse(validData).success).toBe(true)

    const invalidData = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      is_checked: "true" as unknown,
    }
    expect(ShoppingItemCheckSchema.safeParse(invalidData).success).toBe(false)
  })
})

// ============================================================
// DEFAULT VALUES TESTS
// ============================================================

describe("Default Values", () => {
  it("ShoppingListCreateSchema should have correct defaults", () => {
    const result = ShoppingListCreateSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Liste principale")
    }
  })

  it("ShoppingItemCreateSchema should have correct defaults", () => {
    const minimalItem = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test Item",
    }
    const result = ShoppingItemCreateSchema.safeParse(minimalItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
      expect(result.data.category).toBe("Autres")
      expect(result.data.priority).toBe(0)
    }
  })
})

// ============================================================
// OPTIONAL FIELD TESTS
// ============================================================

describe("Optional Fields", () => {
  it("should allow undefined note in ShoppingItemCreateSchema", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.note).toBeUndefined()
    }
  })

  it("should allow null note in ShoppingItemCreateSchema", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
      note: null,
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.note).toBeNull()
    }
  })

  it("should allow undefined unit in ShoppingItemCreateSchema", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it("should allow null unit in ShoppingItemCreateSchema", () => {
    const item = {
      list_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
      unit: null,
    }
    const result = ShoppingItemCreateSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it("should allow optional is_active in ShoppingListUpdateSchema", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Updated",
    }
    const result = ShoppingListUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBeUndefined()
    }
  })
})

// ============================================================
// PARTIAL UPDATE SCHEMA TESTS
// ============================================================

describe("Partial Update Schema", () => {
  it("ShoppingItemUpdateSchema should allow updating only name", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Updated Name",
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it("ShoppingItemUpdateSchema should allow updating only quantity", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      quantity: 10,
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it("ShoppingItemUpdateSchema should allow updating only category", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      category: "Boissons",
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it("ShoppingItemUpdateSchema should allow updating only priority", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      priority: 1,
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it("ShoppingItemUpdateSchema should allow updating multiple fields", () => {
    const update = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Updated Name",
      quantity: 5,
      category: "Fruits et legumes",
      priority: 1,
      note: "Updated note",
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(true)
  })

  it("ShoppingItemUpdateSchema should still require valid id", () => {
    const update = {
      id: "invalid-uuid",
      name: "Updated Name",
    }
    const result = ShoppingItemUpdateSchema.safeParse(update)
    expect(result.success).toBe(false)
  })
})
