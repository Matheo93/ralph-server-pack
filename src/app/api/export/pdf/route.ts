/**
 * PDF Export API
 *
 * Generates and returns PDF reports for household data
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { renderToBuffer } from "@react-pdf/renderer"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser, queryOne, query } from "@/lib/aws/database"
import { generateWeeklyReport, type WeeklyReportData } from "@/lib/services/balance-alerts"
import {
  WeeklyReportPDF,
  MonthlyReportPDF,
  ChildHistoryPDF,
  getExportFilename,
  type MonthlyReportData,
  type ChildHistoryExportData,
} from "@/lib/services/pdf-export"
import { BALANCE_THRESHOLDS } from "@/lib/constants/task-weights"

// =============================================================================
// SCHEMAS
// =============================================================================

const ExportTypeSchema = z.enum(["weekly", "monthly", "child"])

const ExportParamsSchema = z.object({
  type: ExportTypeSchema,
  month: z.string().optional(),
  year: z.number().optional(),
  childId: z.string().uuid().optional(),
})

// =============================================================================
// GET - Generate PDF
// =============================================================================

/**
 * GET /api/export/pdf?type=weekly|monthly|child&month=01&year=2026&childId=xxx
 *
 * Generate and return a PDF report
 */
export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? "weekly"
  const month = searchParams.get("month") ?? undefined
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year") as string, 10)
    : undefined
  const childId = searchParams.get("childId") ?? undefined

  // Validate parameters
  const parseResult = ExportParamsSchema.safeParse({ type, month, year, childId })
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", details: parseResult.error.issues },
      { status: 400 }
    )
  }

  // Get household info
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Aucun foyer trouvé" }, { status: 404 })
  }

  const household = await queryOne<{ name: string }>(`
    SELECT name FROM households WHERE id = $1
  `, [membership.household_id])

  const householdName = household?.name ?? "Mon Foyer"

  try {
    let pdfBuffer: Buffer
    let filename: string

    switch (parseResult.data.type) {
      case "weekly": {
        const report = await generateWeeklyReport()
        if (!report) {
          return NextResponse.json({ error: "Données non disponibles" }, { status: 404 })
        }
        const pdfDocument = WeeklyReportPDF({ report, householdName })
        pdfBuffer = await renderToBuffer(pdfDocument)
        filename = getExportFilename("weekly")
        break
      }

      case "monthly": {
        const reportMonth = month ?? String(new Date().getMonth() + 1).padStart(2, "0")
        const reportYear = year ?? new Date().getFullYear()
        const monthlyReport = await generateMonthlyReportData(
          membership.household_id,
          reportMonth,
          reportYear,
          householdName
        )
        const pdfDocument = MonthlyReportPDF({ report: monthlyReport })
        pdfBuffer = await renderToBuffer(pdfDocument)
        filename = getExportFilename("monthly", `${reportYear}-${reportMonth}`)
        break
      }

      case "child": {
        if (!childId) {
          return NextResponse.json({ error: "childId requis" }, { status: 400 })
        }
        const childData = await generateChildHistoryData(membership.household_id, childId)
        if (!childData) {
          return NextResponse.json({ error: "Enfant non trouvé" }, { status: 404 })
        }
        const pdfDocument = ChildHistoryPDF({ data: childData })
        pdfBuffer = await renderToBuffer(pdfDocument)
        filename = getExportFilename("child", childData.childName.toLowerCase().replace(/\s/g, "-"))
        break
      }

      default:
        return NextResponse.json({ error: "Type d'export invalide" }, { status: 400 })
    }

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate monthly report data
 */
async function generateMonthlyReportData(
  householdId: string,
  month: string,
  year: number,
  householdName: string
): Promise<MonthlyReportData> {
  // Calculate date range for the month
  const startDate = `${year}-${month.padStart(2, "0")}-01`
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split("T")[0]

  // Get monthly stats
  const monthStats = await queryOne<{
    total_tasks: string
    completed_tasks: string
    total_load: string
  }>(`
    SELECT
      COUNT(*)::text as total_tasks,
      COUNT(*) FILTER (WHERE status = 'done')::text as completed_tasks,
      COALESCE(SUM(load_weight), 0)::text as total_load
    FROM tasks
    WHERE household_id = $1
      AND (
        (completed_at >= $2::date AND completed_at <= $3::date + INTERVAL '1 day')
        OR (deadline >= $2::date AND deadline <= $3::date)
      )
  `, [householdId, startDate, endDate])

  // Get member breakdown
  const memberStats = await query<{
    user_id: string
    email: string
    tasks_completed: string
    load_points: string
  }>(`
    SELECT
      hm.user_id,
      u.email,
      COUNT(*) FILTER (WHERE t.status = 'done')::text as tasks_completed,
      COALESCE(SUM(t.load_weight) FILTER (WHERE t.status IN ('done', 'pending')), 0)::text as load_points
    FROM household_members hm
    LEFT JOIN users u ON u.id = hm.user_id
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.household_id = hm.household_id
      AND (
        (t.completed_at >= $2::date AND t.completed_at <= $3::date + INTERVAL '1 day')
        OR (t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY hm.user_id, u.email
  `, [householdId, startDate, endDate])

  const totalLoad = parseInt(monthStats?.total_load ?? "0", 10)
  const totalTasks = parseInt(monthStats?.total_tasks ?? "0", 10)
  const completedTasks = parseInt(monthStats?.completed_tasks ?? "0", 10)

  const members = memberStats.map((m) => {
    const loadPoints = parseInt(m.load_points, 10)
    return {
      userName: m.email?.split("@")[0] ?? "Parent",
      tasksCompleted: parseInt(m.tasks_completed, 10),
      loadPoints,
      percentage: totalLoad > 0 ? Math.round((loadPoints / totalLoad) * 100) : 0,
    }
  })

  // Get category breakdown
  const categoryStats = await query<{
    category: string
    load_points: string
  }>(`
    SELECT
      c.code as category,
      COALESCE(SUM(t.load_weight), 0)::text as load_points
    FROM tasks t
    JOIN categories c ON c.id = t.category_id
    WHERE t.household_id = $1
      AND (
        (t.completed_at >= $2::date AND t.completed_at <= $3::date + INTERVAL '1 day')
        OR (t.deadline >= $2::date AND t.deadline <= $3::date)
      )
    GROUP BY c.code
    ORDER BY load_points DESC
  `, [householdId, startDate, endDate])

  const categoryBreakdown = categoryStats.map((c) => ({
    category: c.category,
    loadPoints: parseInt(c.load_points, 10),
    percentage: totalLoad > 0 ? Math.round((parseInt(c.load_points, 10) / totalLoad) * 100) : 0,
  }))

  // Get weekly breakdown
  const weeklyStats = await query<{
    week_start: string
    tasks_completed: string
    load_points: string
  }>(`
    SELECT
      DATE_TRUNC('week', COALESCE(completed_at, deadline))::date::text as week_start,
      COUNT(*) FILTER (WHERE status = 'done')::text as tasks_completed,
      COALESCE(SUM(load_weight), 0)::text as load_points
    FROM tasks
    WHERE household_id = $1
      AND (
        (completed_at >= $2::date AND completed_at <= $3::date + INTERVAL '1 day')
        OR (deadline >= $2::date AND deadline <= $3::date)
      )
    GROUP BY DATE_TRUNC('week', COALESCE(completed_at, deadline))
    ORDER BY week_start
  `, [householdId, startDate, endDate])

  // Get streak info
  const streakInfo = await queryOne<{
    streak_current: number
    streak_best: number
  }>(`
    SELECT streak_current, streak_best FROM households WHERE id = $1
  `, [householdId])

  return {
    month,
    year,
    householdName,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    totalLoadPoints: totalLoad,
    members,
    categoryBreakdown,
    weeklyBreakdown: weeklyStats.map((w) => ({
      weekStart: w.week_start,
      tasksCompleted: parseInt(w.tasks_completed, 10),
      loadPoints: parseInt(w.load_points, 10),
      isBalanced: true, // Simplified - would need per-week calculation
    })),
    streakInfo: {
      current: streakInfo?.streak_current ?? 0,
      best: streakInfo?.streak_best ?? 0,
    },
  }
}

/**
 * Generate child history data
 */
async function generateChildHistoryData(
  householdId: string,
  childId: string
): Promise<ChildHistoryExportData | null> {
  // Get child info
  const child = await queryOne<{
    id: string
    first_name: string
    birth_date: string
  }>(`
    SELECT id, first_name, birth_date::text
    FROM children
    WHERE id = $1 AND household_id = $2
  `, [childId, householdId])

  if (!child) return null

  // Calculate age
  const birthDate = new Date(child.birth_date)
  const today = new Date()
  const ageYears = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // Get timeline events (completed tasks)
  const events = await query<{
    date: string
    type: string
    title: string
    description: string
    category: string
  }>(`
    SELECT
      t.completed_at::date::text as date,
      'task' as type,
      t.title,
      t.description,
      c.code as category
    FROM tasks t
    JOIN categories c ON c.id = t.category_id
    WHERE t.child_id = $1 AND t.household_id = $2 AND t.status = 'done'
    ORDER BY t.completed_at DESC
    LIMIT 50
  `, [childId, householdId])

  // Get vaccinations (tasks with sante category containing vaccin)
  const vaccinations = await query<{
    date: string
    vaccine: string
    status: string
  }>(`
    SELECT
      COALESCE(t.completed_at, t.deadline)::date::text as date,
      t.title as vaccine,
      t.status
    FROM tasks t
    JOIN categories c ON c.id = t.category_id
    WHERE t.child_id = $1
      AND t.household_id = $2
      AND c.code = 'sante'
      AND (t.title ILIKE '%vaccin%' OR t.title ILIKE '%DTCaP%' OR t.title ILIKE '%ROR%')
    ORDER BY COALESCE(t.completed_at, t.deadline) DESC
  `, [childId, householdId])

  // Get school history (from child_timeline if exists)
  const schoolHistory = await query<{
    year: string
    school: string
    level: string
  }>(`
    SELECT
      event_year as year,
      COALESCE(metadata->>'school_name', '') as school,
      COALESCE(metadata->>'level', event_type) as level
    FROM child_timeline
    WHERE child_id = $1 AND event_type IN ('school_start', 'school_change', 'school_level')
    ORDER BY event_date DESC
  `, [childId]).catch(() => [])

  return {
    childId: child.id,
    childName: child.first_name,
    birthDate: child.birth_date,
    ageYears,
    events: events.map((e) => ({
      date: e.date,
      type: e.type,
      title: e.title,
      description: e.description,
      category: e.category,
    })),
    vaccinations: vaccinations.map((v) => ({
      date: v.date,
      vaccine: v.vaccine,
      status: v.status as "done" | "pending" | "missed",
    })),
    schoolHistory: schoolHistory.map((s) => ({
      year: s.year,
      school: s.school,
      level: s.level,
    })),
  }
}
