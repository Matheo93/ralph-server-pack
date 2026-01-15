/**
 * Upcoming Templates API
 *
 * Get upcoming automatic tasks that will be generated
 * based on children's ages and household settings.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import { getTemplatesForAge, allTemplatesFR } from "@/lib/data/templates-fr"

// =============================================================================
// TYPES
// =============================================================================

interface Child {
  id: string
  first_name: string
  birthdate: string
  household_id: string
}

interface UpcomingTask {
  template_id: string
  title: string
  description: string | null
  category: string
  child_id: string
  child_name: string
  child_age: number
  deadline: string
  days_until: number
  weight: number
  status: "upcoming" | "due_soon" | "overdue"
  is_generated: boolean
}

interface HouseholdMembership {
  household_id: string
  role: string
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateAge(birthdate: string): number {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(0, age)
}

function calculateNextDeadline(
  cronRule: string | null,
  daysBefore: number,
  fromDate: Date = new Date()
): Date | null {
  if (!cronRule) return null

  // Handle special patterns
  if (cronRule === "@yearly") {
    const next = new Date(fromDate)
    next.setFullYear(next.getFullYear() + 1)
    next.setMonth(0, 1)
    return next
  }

  if (cronRule === "@monthly") {
    const next = new Date(fromDate)
    next.setMonth(next.getMonth() + 1, 1)
    return next
  }

  if (cronRule === "@weekly") {
    const next = new Date(fromDate)
    const daysUntilSunday = (7 - next.getDay()) % 7 || 7
    next.setDate(next.getDate() + daysUntilSunday)
    return next
  }

  if (cronRule === "@daily") {
    const next = new Date(fromDate)
    next.setDate(next.getDate() + 1)
    return next
  }

  // Parse cron format: minute hour day month weekday
  const parts = cronRule.split(" ")
  if (parts.length !== 5) return null

  const dayStr = parts[2]
  const monthStr = parts[3]
  const day = parseInt(dayStr ?? "1", 10)
  const month = monthStr === "*" ? null : parseInt(monthStr ?? "1", 10)

  if (isNaN(day)) return null

  const next = new Date(fromDate)
  next.setHours(0, 0, 0, 0)

  if (month !== null && !isNaN(month)) {
    next.setMonth(month - 1)
  }
  next.setDate(day)

  // Subtract days before to get reminder date
  const reminder = new Date(next)
  reminder.setDate(reminder.getDate() - daysBefore)

  // If date is past, move to next occurrence
  if (next <= fromDate) {
    if (month !== null) {
      next.setFullYear(next.getFullYear() + 1)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
  }

  return next
}

async function getHouseholdId(userId: string): Promise<string | null> {
  const membership = await queryOne<HouseholdMembership>(`
    SELECT household_id, role
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  return membership?.household_id ?? null
}

// =============================================================================
// GET - Get upcoming auto-generated tasks
// =============================================================================

/**
 * GET /api/templates/upcoming
 *
 * Get preview of tasks that will be auto-generated based on
 * children's ages and household template settings.
 *
 * Query params:
 * - days: Number of days to look ahead (default: 30, max: 90)
 * - child_id: Optional UUID to filter by specific child
 * - category: Optional category filter
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const daysParam = searchParams.get("days")
  const childIdParam = searchParams.get("child_id")
  const categoryParam = searchParams.get("category")

  const days = Math.min(
    Math.max(1, parseInt(daysParam ?? "30", 10)),
    90
  )

  // Get children for this household
  let childQuery = `
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE household_id = $1
  `
  const childParams: unknown[] = [householdId]

  if (childIdParam) {
    const UUIDSchema = z.string().uuid()
    const parseResult = UUIDSchema.safeParse(childIdParam)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "child_id invalide" },
        { status: 400 }
      )
    }
    childQuery += ` AND id = $2`
    childParams.push(childIdParam)
  }

  childQuery += ` ORDER BY birthdate DESC`

  const children = await query<Child>(childQuery, childParams)

  if (children.length === 0) {
    return NextResponse.json({
      household_id: householdId,
      upcoming: [],
      count: 0,
      days_ahead: days,
      message: childIdParam
        ? "Enfant non trouvé"
        : "Aucun enfant dans ce foyer",
    })
  }

  // Get template settings for this household
  const templateSettings = await query<{
    template_id: string
    is_enabled: boolean
    custom_days_before: number | null
    custom_weight: number | null
  }>(`
    SELECT template_id, is_enabled, custom_days_before, custom_weight
    FROM household_template_settings
    WHERE household_id = $1
  `, [householdId]).catch(() => [])

  const settingsMap = new Map(
    templateSettings.map((s) => [s.template_id, s])
  )

  // Get already generated tasks to exclude
  const existingGenerated = await query<{
    template_id: string
    child_id: string
    deadline: string
  }>(`
    SELECT template_id, child_id, deadline
    FROM generated_tasks
    WHERE household_id = $1 AND status = 'pending'
  `, [householdId]).catch(() => [])

  const existingKeys = new Set(
    existingGenerated.map((g) => `${g.template_id}-${g.child_id}-${g.deadline}`)
  )

  // Build upcoming tasks list
  const upcoming: UpcomingTask[] = []
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + days)

  for (const child of children) {
    const age = calculateAge(child.birthdate)
    const templates = getTemplatesForAge(age)

    for (const template of templates) {
      // Apply category filter if specified
      if (categoryParam && template.category !== categoryParam) {
        continue
      }

      // Check household settings
      const settings = settingsMap.get(`static-${templates.indexOf(template)}`)
      if (settings?.is_enabled === false) {
        continue
      }

      // Calculate deadline
      const daysBefore = settings?.custom_days_before ?? template.days_before_deadline ?? 7
      const deadline = calculateNextDeadline(
        template.cron_rule ?? null,
        0,
        today
      )

      if (!deadline || deadline > endDate) {
        continue
      }

      const daysUntil = Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Skip if already generated
      const deadlineStr = deadline.toISOString().split("T")[0]
      const templateId = `static-${templates.indexOf(template)}`
      const key = `${templateId}-${child.id}-${deadlineStr}`
      const isGenerated = existingKeys.has(key)

      upcoming.push({
        template_id: templateId,
        title: template.title,
        description: template.description ?? null,
        category: template.category,
        child_id: child.id,
        child_name: child.first_name,
        child_age: age,
        deadline: deadlineStr ?? "",
        days_until: daysUntil,
        weight: settings?.custom_weight ?? template.weight ?? 3,
        status: daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "due_soon" : "upcoming",
        is_generated: isGenerated,
      })
    }
  }

  // Sort by days until (overdue first, then soonest)
  upcoming.sort((a, b) => a.days_until - b.days_until)

  // Group by status for summary
  const summary = {
    overdue: upcoming.filter((t) => t.status === "overdue").length,
    due_soon: upcoming.filter((t) => t.status === "due_soon").length,
    upcoming: upcoming.filter((t) => t.status === "upcoming").length,
    already_generated: upcoming.filter((t) => t.is_generated).length,
    total_weight: upcoming.reduce((sum, t) => sum + t.weight, 0),
  }

  return NextResponse.json({
    household_id: householdId,
    upcoming: upcoming.filter((t) => !t.is_generated), // Only show not yet generated
    all_upcoming: upcoming, // Include all for debugging
    count: upcoming.filter((t) => !t.is_generated).length,
    days_ahead: days,
    children_count: children.length,
    summary,
  })
}

// =============================================================================
// POST - Acknowledge/skip upcoming task
// =============================================================================

const AcknowledgeSchema = z.object({
  template_id: z.string(),
  child_id: z.string().uuid(),
  deadline: z.string(),
  action: z.enum(["acknowledge", "skip", "generate"]),
})

/**
 * POST /api/templates/upcoming
 *
 * Acknowledge or skip an upcoming task
 *
 * Request body:
 * {
 *   "template_id": "static-5",
 *   "child_id": "uuid",
 *   "deadline": "2024-01-15",
 *   "action": "acknowledge" | "skip" | "generate"
 * }
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const householdId = await getHouseholdId(userId)
  if (!householdId) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  // Parse request body
  let body: z.infer<typeof AcknowledgeSchema>
  try {
    const json = await request.json()
    body = AcknowledgeSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Format de requête invalide" },
      { status: 400 }
    )
  }

  // Verify child belongs to household
  const child = await queryOne<Child>(`
    SELECT id, first_name, birthdate, household_id
    FROM children
    WHERE id = $1 AND household_id = $2
  `, [body.child_id, householdId])

  if (!child) {
    return NextResponse.json(
      { error: "Enfant non trouvé dans ce foyer" },
      { status: 404 }
    )
  }

  // Get template info
  const templateIndex = parseInt(body.template_id.replace("static-", ""), 10)
  const age = calculateAge(child.birthdate)
  const templates = getTemplatesForAge(age)
  const template = templates[templateIndex]

  if (!template) {
    return NextResponse.json(
      { error: "Template non trouvé" },
      { status: 404 }
    )
  }

  // Generate unique key
  const generationKey = `${body.template_id}-${body.deadline}`

  switch (body.action) {
    case "acknowledge":
    case "generate":
      // Create a generated task entry
      try {
        const { insert: insertFn } = await import("@/lib/aws/database")
        await insertFn("generated_tasks", {
          template_id: body.template_id,
          child_id: body.child_id,
          household_id: householdId,
          deadline: body.deadline,
          generation_key: generationKey,
          status: body.action === "generate" ? "pending" : "acknowledged",
          acknowledged: body.action === "acknowledge",
        })

        return NextResponse.json({
          success: true,
          action: body.action,
          message: body.action === "generate"
            ? "Tâche générée avec succès"
            : "Tâche acquittée",
          task: {
            template_id: body.template_id,
            title: template.title,
            child_name: child.first_name,
            deadline: body.deadline,
          },
        })
      } catch {
        // Task might already exist
        return NextResponse.json({
          success: true,
          action: body.action,
          message: "Tâche déjà traitée",
        })
      }

    case "skip":
      // Create a skipped entry to prevent re-suggestion
      try {
        const { insert: insertFn } = await import("@/lib/aws/database")
        await insertFn("generated_tasks", {
          template_id: body.template_id,
          child_id: body.child_id,
          household_id: householdId,
          deadline: body.deadline,
          generation_key: generationKey,
          status: "skipped",
          acknowledged: true,
        })

        return NextResponse.json({
          success: true,
          action: "skip",
          message: "Tâche ignorée",
        })
      } catch {
        return NextResponse.json({
          success: true,
          action: "skip",
          message: "Tâche déjà traitée",
        })
      }
  }
}
