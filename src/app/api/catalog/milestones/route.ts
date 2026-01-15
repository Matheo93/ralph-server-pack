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
  initializeFrenchMilestones,
  getMilestonesForAge,
  getUpcomingMilestones,
  getMissedMilestones,
  type AgeMilestone,
} from "@/lib/catalog/age-rules"

// Initialize store with French milestones
const ageRuleStore = initializeFrenchMilestones()

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
  const lookAheadMonths = Math.min(parseInt(searchParams.get("months") ?? "6"), 24)

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

  // Group completed by child
  const completedByChild = new Map<string, Set<string>>()
  for (const m of completedMilestones) {
    if (!completedByChild.has(m.child_id)) {
      completedByChild.set(m.child_id, new Set())
    }
    completedByChild.get(m.child_id)!.add(m.milestone_id)
  }

  const formatMilestone = (m: AgeMilestone, isCompleted: boolean) => ({
    id: m.id,
    title: m.name['fr'] ?? m.name['en'] ?? Object.values(m.name)[0] ?? '',
    description: m.description['fr'] ?? m.description['en'] ?? Object.values(m.description)[0] ?? '',
    type: m.type,
    category: m.type === 'vaccine' || m.type === 'health_checkup' ? 'sante' :
              m.type === 'registration' || m.type === 'transition' ? 'ecole' :
              'administratif',
    ageMonths: m.ageMonths,
    priority: m.priority,
    mandatory: m.mandatory,
    isCompleted,
  })

  const response: Array<{
    childId: string
    childName: string
    ageInMonths: number
    current: Array<ReturnType<typeof formatMilestone> & { daysRemaining?: number }>
    upcoming: Array<ReturnType<typeof formatMilestone> & { daysUntil: number }>
    missed: Array<ReturnType<typeof formatMilestone> & { daysSince: number }>
  }> = []

  for (const child of children) {
    const birthDate = new Date(child.birth_date)
    const now = new Date()
    const ageInMonths = Math.floor(
      (now.getTime() - birthDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    )

    const childCompleted = completedByChild.get(child.id) ?? new Set<string>()

    const childResponse: typeof response[number] = {
      childId: child.id,
      childName: child.name,
      ageInMonths,
      current: [],
      upcoming: [],
      missed: [],
    }

    // Get current milestones
    const currentMilestones = getMilestonesForAge(ageRuleStore, ageInMonths, 'FR')
    childResponse.current = currentMilestones.map(m => {
      const milestoneDate = new Date(birthDate)
      milestoneDate.setMonth(milestoneDate.getMonth() + m.ageMonths)
      const daysRemaining = Math.ceil((milestoneDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      return {
        ...formatMilestone(m, childCompleted.has(m.id)),
        daysRemaining: daysRemaining > 0 ? daysRemaining : undefined,
      }
    })

    // Get upcoming milestones
    if (includeUpcoming) {
      const upcoming = getUpcomingMilestones(ageRuleStore, ageInMonths, lookAheadMonths, 'FR')
      childResponse.upcoming = upcoming
        .filter(m => !childCompleted.has(m.id))
        .map(m => {
          const milestoneDate = new Date(birthDate)
          milestoneDate.setMonth(milestoneDate.getMonth() + m.ageMonths)
          const daysUntil = Math.ceil((milestoneDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          return {
            ...formatMilestone(m, false),
            daysUntil,
          }
        })
    }

    // Get missed milestones
    if (includeMissed) {
      const missed = getMissedMilestones(ageRuleStore, ageInMonths, childCompleted, 'FR')
      childResponse.missed = missed.map(m => {
        const milestoneDate = new Date(birthDate)
        milestoneDate.setMonth(milestoneDate.getMonth() + m.ageMonths)
        const daysSince = Math.ceil((now.getTime() - milestoneDate.getTime()) / (24 * 60 * 60 * 1000))
        return {
          ...formatMilestone(m, false),
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
