/**
 * Age Milestones API
 *
 * GET: Get applicable milestones for children
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  createAgeRuleStore,
  getMilestonesForAge,
  getUpcomingMilestones,
  getMissedMilestones,
} from "@/lib/catalog/age-rules"

const ageRuleStore = createAgeRuleStore()

/**
 * GET /api/catalog/milestones
 * Get milestones for household children
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const childId = searchParams.get("childId")
  const includeUpcoming = searchParams.get("upcoming") !== "false"
  const includeMissed = searchParams.get("missed") === "true"
  const lookAheadDays = Math.min(parseInt(searchParams.get("days") ?? "90"), 365)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const householdId = membership.household_id

  // Get children
  let childrenQuery = `
    SELECT id, name, birth_date
    FROM children
    WHERE household_id = $1
  `
  const params: (string | null)[] = [householdId]

  if (childId) {
    childrenQuery += ` AND id = $2`
    params.push(childId)
  }

  childrenQuery += ` ORDER BY birth_date ASC`

  const children = await query<{
    id: string
    name: string
    birth_date: string
  }>(childrenQuery, params)

  if (children.length === 0) {
    return NextResponse.json({
      milestones: [],
      message: childId ? "Enfant non trouvé" : "Aucun enfant dans le foyer",
    })
  }

  // Get completed milestones from database
  const completedMilestones = await query<{ child_id: string; milestone_id: string }>(`
    SELECT child_id, milestone_id
    FROM completed_milestones
    WHERE household_id = $1
  `, [householdId])

  const completedSet = new Set(
    completedMilestones.map(m => `${m.child_id}-${m.milestone_id}`)
  )

  const response: Array<{
    childId: string
    childName: string
    ageInMonths: number
    current: Array<{
      id: string
      title: string
      category: string
      ageMonths: number
      isCompleted: boolean
    }>
    upcoming: Array<{
      id: string
      title: string
      category: string
      ageMonths: number
      daysUntil: number
    }>
    missed: Array<{
      id: string
      title: string
      category: string
      ageMonths: number
      daysSince: number
    }>
  }> = []

  for (const child of children) {
    const birthDate = new Date(child.birth_date)
    const now = new Date()
    const ageInMonths = Math.floor(
      (now.getTime() - birthDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    )

    const childResponse: typeof response[number] = {
      childId: child.id,
      childName: child.name,
      ageInMonths,
      current: [],
      upcoming: [],
      missed: [],
    }

    // Get current milestones
    const currentMilestones = getMilestonesForAge(ageRuleStore, ageInMonths)
    childResponse.current = currentMilestones.map(m => ({
      id: m.id,
      title: m.title['fr'] ?? m.title['en'] ?? Object.values(m.title)[0] ?? '',
      category: m.category,
      ageMonths: m.ageMonths,
      isCompleted: completedSet.has(`${child.id}-${m.id}`),
    }))

    // Get upcoming milestones
    if (includeUpcoming) {
      const upcoming = getUpcomingMilestones(ageRuleStore, birthDate, lookAheadDays)
      childResponse.upcoming = upcoming
        .filter(m => !completedSet.has(`${child.id}-${m.id}`))
        .map(m => {
          const milestoneDate = new Date(birthDate)
          milestoneDate.setMonth(milestoneDate.getMonth() + m.ageMonths)
          const daysUntil = Math.ceil((milestoneDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          return {
            id: m.id,
            title: m.title['fr'] ?? m.title['en'] ?? Object.values(m.title)[0] ?? '',
            category: m.category,
            ageMonths: m.ageMonths,
            daysUntil,
          }
        })
    }

    // Get missed milestones
    if (includeMissed) {
      const missed = getMissedMilestones(ageRuleStore, birthDate, ageInMonths)
      childResponse.missed = missed
        .filter(m => !completedSet.has(`${child.id}-${m.id}`))
        .map(m => {
          const milestoneDate = new Date(birthDate)
          milestoneDate.setMonth(milestoneDate.getMonth() + m.ageMonths)
          const daysSince = Math.ceil((now.getTime() - milestoneDate.getTime()) / (24 * 60 * 60 * 1000))
          return {
            id: m.id,
            title: m.title['fr'] ?? m.title['en'] ?? Object.values(m.title)[0] ?? '',
            category: m.category,
            ageMonths: m.ageMonths,
            daysSince,
          }
        })
    }

    response.push(childResponse)
  }

  return NextResponse.json({
    milestones: response,
    count: response.reduce((acc, c) => acc + c.current.length + c.upcoming.length, 0),
  })
}
