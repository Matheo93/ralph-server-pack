/**
 * Task Catalogue API
 *
 * GET /api/catalogue - List all catalogue tasks
 * GET /api/catalogue?category=sante - Filter by category
 * GET /api/catalogue?search=vaccin - Search tasks
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { setCurrentUser } from "@/lib/aws/database"
import {
  getCatalogueCategories,
  searchCatalogueTasks,
  getSeasonalTasks,
  getCurrentPeriod,
} from "@/lib/services/task-catalogue"

export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")

  // If search query provided
  if (search) {
    const results = searchCatalogueTasks(search)
    return NextResponse.json({
      success: true,
      query: search,
      results,
      count: results.length,
    })
  }

  // Get all catalogue info
  const categories = getCatalogueCategories()
  const currentPeriod = getCurrentPeriod()
  const seasonalTasks = getSeasonalTasks(undefined, "FR")

  // Filter by category if specified
  let filteredSeasonalTasks = seasonalTasks
  if (category) {
    filteredSeasonalTasks = seasonalTasks.filter(
      (t) => t.catalogueTask.category_code === category
    )
  }

  return NextResponse.json({
    success: true,
    currentPeriod,
    categories,
    seasonalTasks: filteredSeasonalTasks.map((t) => ({
      id: t.catalogueTask.id,
      title: t.catalogueTask.title_fr,
      description: t.catalogueTask.description_fr,
      category: t.catalogueTask.category_code,
      chargeWeight: t.catalogueTask.charge_weight,
      periods: t.catalogueTask.periods,
      suggestedDeadline: t.suggestedDeadline.toISOString(),
    })),
    totalTasks: categories.reduce((sum, c) => sum + c.taskCount, 0),
  })
}
