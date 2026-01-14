import { z } from "zod"

export const childSchema = z.object({
  first_name: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
  birthdate: z
    .string()
    .refine((date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime()) && parsed < new Date()
    }, "La date de naissance doit être dans le passé"),
  gender: z.enum(["M", "F"]).nullable().optional(),
  school_name: z.string().max(100).nullable().optional(),
  school_level: z
    .enum(["maternelle", "primaire", "college", "lycee"])
    .nullable()
    .optional(),
  school_class: z.string().max(20).nullable().optional(),
  tags: z.array(z.string()),
})

export const updateChildSchema = childSchema.partial().extend({
  id: z.string().uuid("ID invalide"),
})

export type ChildInput = z.infer<typeof childSchema>
export type UpdateChildInput = z.infer<typeof updateChildSchema>

// Helper to calculate age from birthdate
export function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

// Get school level suggestion based on age
export function suggestSchoolLevel(
  age: number
): "maternelle" | "primaire" | "college" | "lycee" | null {
  if (age >= 3 && age < 6) return "maternelle"
  if (age >= 6 && age < 11) return "primaire"
  if (age >= 11 && age < 15) return "college"
  if (age >= 15 && age < 18) return "lycee"
  return null
}

// Get school class suggestion based on age
export function suggestSchoolClass(age: number): string | null {
  const classes: Record<number, string> = {
    3: "PS",
    4: "MS",
    5: "GS",
    6: "CP",
    7: "CE1",
    8: "CE2",
    9: "CM1",
    10: "CM2",
    11: "6ème",
    12: "5ème",
    13: "4ème",
    14: "3ème",
    15: "2nde",
    16: "1ère",
    17: "Term",
  }
  return classes[age] ?? null
}
