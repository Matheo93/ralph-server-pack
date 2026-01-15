import { z } from "zod"

// Exclusion reason enum - matching schema.sql
export const ExclusionReasonEnum = z.enum([
  "voyage",         // Travel/vacation
  "maladie",        // Illness
  "surcharge_travail", // Work overload
  "garde_alternee", // Custody arrangement (out of house)
  "autre",          // Other
])

export type ExclusionReason = z.infer<typeof ExclusionReasonEnum>

// Schema for creating a member exclusion
export const ExclusionSchema = z.object({
  memberId: z.string().uuid("Invalid member ID"),
  householdId: z.string().uuid("Invalid household ID"),
  excludeFrom: z.coerce.date().refine(
    (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
    { message: "Start date cannot be in the past" }
  ),
  excludeUntil: z.coerce.date(),
  reason: ExclusionReasonEnum,
}).refine(
  (data) => data.excludeUntil > data.excludeFrom,
  { message: "End date must be after start date", path: ["excludeUntil"] }
)

export type ExclusionInput = z.infer<typeof ExclusionSchema>

// Schema for updating an exclusion
export const ExclusionUpdateSchema = z.object({
  id: z.string().uuid("Invalid exclusion ID"),
  excludeFrom: z.coerce.date().optional(),
  excludeUntil: z.coerce.date().optional(),
  reason: ExclusionReasonEnum.optional(),
})

export type ExclusionUpdateInput = z.infer<typeof ExclusionUpdateSchema>

// Assignment rule type enum
export const AssignmentRuleTypeEnum = z.enum([
  "least_loaded",     // Assign to parent with lowest load
  "rotation",         // Alternate between parents
  "manual",           // Always require manual assignment
  "category_based",   // Assign based on category preferences
])

export type AssignmentRuleType = z.infer<typeof AssignmentRuleTypeEnum>

// Assignment rule schema
export const AssignmentRuleSchema = z.object({
  householdId: z.string().uuid("Invalid household ID"),
  ruleType: AssignmentRuleTypeEnum,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  categoryOverrides: z.record(
    z.string(), // category code
    z.object({
      preferredMemberId: z.string().uuid().optional(),
      ruleType: AssignmentRuleTypeEnum.optional(),
    })
  ).optional(),
})

export type AssignmentRuleInput = z.infer<typeof AssignmentRuleSchema>

// Assignment result reason enum
export const AssignmentReasonEnum = z.enum([
  "least_loaded",    // Assigned to parent with lowest load
  "rotation",        // Assigned via fair rotation
  "only_member",     // Only one active member in household
  "already_assigned", // Task was already assigned
  "excluded",        // All members currently excluded
  "manual",          // Manually assigned by user
])

export type AssignmentReason = z.infer<typeof AssignmentReasonEnum>

// API request schema for creating exclusion
export const CreateExclusionRequestSchema = z.object({
  memberId: z.string().uuid("Invalid member ID"),
  excludeFrom: z.string().datetime({ message: "Invalid start date format" }),
  excludeUntil: z.string().datetime({ message: "Invalid end date format" }),
  reason: ExclusionReasonEnum,
})

export type CreateExclusionRequest = z.infer<typeof CreateExclusionRequestSchema>

// API request schema for auto-assignment
export const AutoAssignRequestSchema = z.object({
  taskId: z.string().uuid("Invalid task ID").optional(),
  householdId: z.string().uuid("Invalid household ID").optional(),
  assignAll: z.boolean().default(false), // If true, assign all unassigned tasks
})

export type AutoAssignRequest = z.infer<typeof AutoAssignRequestSchema>

// Validation helpers
export function validateExclusion(data: unknown): ExclusionInput {
  return ExclusionSchema.parse(data)
}

export function validateCreateExclusionRequest(data: unknown): CreateExclusionRequest {
  return CreateExclusionRequestSchema.parse(data)
}

export function validateAutoAssignRequest(data: unknown): AutoAssignRequest {
  return AutoAssignRequestSchema.parse(data)
}

// French translations for exclusion reasons
export const EXCLUSION_REASON_LABELS: Record<ExclusionReason, string> = {
  voyage: "Voyage / Vacances",
  maladie: "Maladie",
  surcharge_travail: "Surcharge de travail",
  garde_alternee: "Garde alternée (hors foyer)",
  autre: "Autre",
}

// French translations for assignment reasons
export const ASSIGNMENT_REASON_LABELS: Record<AssignmentReason, string> = {
  least_loaded: "Parent le moins chargé",
  rotation: "Rotation équitable",
  only_member: "Seul membre actif",
  already_assigned: "Déjà assignée",
  excluded: "Tous les membres sont exclus",
  manual: "Assignation manuelle",
}
