/**
 * Task Templates API
 *
 * GET: List all task templates with optional filtering
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { z } from "zod"
import {
  filterTemplates,
  getTemplateStatistics,
} from "@/lib/catalog/generator"
import {
  AGE_RANGES,
  PERIODS,
  TASK_CATEGORIES,
  RECURRENCE_TYPES,
  CatalogFilters,
} from "@/lib/catalog/types"

const FiltersSchema = z.object({
  ageRanges: z.array(z.enum(AGE_RANGES)).optional(),
  periods: z.array(z.enum(PERIODS)).optional(),
  categories: z.array(z.enum(TASK_CATEGORIES)).optional(),
  recurrence: z.array(z.enum(RECURRENCE_TYPES)).optional(),
  search: z.string().max(100).optional(),
  minWeight: z.coerce.number().min(1).max(5).optional(),
  maxWeight: z.coerce.number().min(1).max(5).optional(),
  critical: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  stats: z.coerce.boolean().optional(),
})

/**
 * GET /api/catalog/templates
 * List task templates with optional filtering
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const params: Record<string, string | string[]> = {}

  // Handle array params
  for (const [key, value] of searchParams.entries()) {
    if (key.endsWith("[]")) {
      const cleanKey = key.replace("[]", "")
      if (!params[cleanKey]) {
        params[cleanKey] = []
      }
      (params[cleanKey] as string[]).push(value)
    } else {
      params[key] = value
    }
  }

  const validation = FiltersSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 }
    )
  }

  const { page, limit, stats, ...filterParams } = validation.data

  // Build filters
  const filters: CatalogFilters = {}
  if (filterParams.ageRanges) filters.ageRanges = filterParams.ageRanges
  if (filterParams.periods) filters.periods = filterParams.periods
  if (filterParams.categories) filters.categories = filterParams.categories
  if (filterParams.recurrence) filters.recurrence = filterParams.recurrence
  if (filterParams.search) filters.search = filterParams.search
  if (filterParams.minWeight !== undefined) filters.minWeight = filterParams.minWeight
  if (filterParams.maxWeight !== undefined) filters.maxWeight = filterParams.maxWeight
  if (filterParams.critical !== undefined) filters.critical = filterParams.critical

  // Filter templates
  const allTemplates = filterTemplates(filters)
  const total = allTemplates.length

  // Paginate
  const offset = (page - 1) * limit
  const templates = allTemplates.slice(offset, offset + limit)

  const response: {
    templates: typeof templates
    pagination: { page: number; limit: number; total: number; pages: number }
    statistics?: ReturnType<typeof getTemplateStatistics>
  } = {
    templates,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }

  // Include stats if requested
  if (stats) {
    response.statistics = getTemplateStatistics()
  }

  return NextResponse.json(response)
}
