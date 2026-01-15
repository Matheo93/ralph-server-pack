/**
 * Period Rules API
 *
 * GET: Get current period-based task rules
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  initializeFrenchPeriodRules,
  getCurrentMonthRules,
  getRulesForMonth,
  getUpcomingRules,
  shouldTriggerRule,
  type PeriodRule,
} from "@/lib/catalog/period-rules"

// Initialize store with French period rules
const periodRuleStore = initializeFrenchPeriodRules()

/**
 * GET /api/catalog/periods
 * Get current and upcoming period-based rules
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const includeNext = searchParams.get("includeNext") !== "false"
  const triggeredOnly = searchParams.get("triggeredOnly") === "true"
  const daysAhead = Math.min(parseInt(searchParams.get("days") ?? "30"), 90)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Foyer non trouvé" }, { status: 404 })
  }

  const now = new Date()
  const currentMonth = month ? parseInt(month) : now.getMonth() + 1

  // Get current month rules
  let currentRules = month
    ? getRulesForMonth(periodRuleStore, currentMonth, 'FR')
    : getCurrentMonthRules(periodRuleStore, 'FR')

  if (triggeredOnly) {
    currentRules = currentRules.filter(rule => shouldTriggerRule(rule, now))
  }

  const formatRule = (rule: PeriodRule) => ({
    id: rule.id,
    title: rule.name['fr'] ?? rule.name['en'] ?? Object.values(rule.name)[0] ?? '',
    description: rule.description['fr'] ?? rule.description['en'] ?? Object.values(rule.description)[0] ?? '',
    category: rule.category,
    priority: rule.priority,
    periodType: rule.periodType,
    month: rule.month,
    leadDays: rule.leadDays,
    isTriggered: shouldTriggerRule(rule, now),
    ageRange: rule.ageRange,
    countries: rule.countries,
    tags: rule.tags,
  })

  const response: {
    currentMonth: {
      month: number
      monthName: string
      rules: ReturnType<typeof formatRule>[]
    }
    nextMonth?: {
      month: number
      monthName: string
      rules: ReturnType<typeof formatRule>[]
    }
    upcoming?: ReturnType<typeof formatRule>[]
  } = {
    currentMonth: {
      month: currentMonth,
      monthName: getMonthName(currentMonth),
      rules: [...currentRules].map(formatRule),
    },
  }

  // Include next month if requested
  if (includeNext) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextMonthRules = getRulesForMonth(periodRuleStore, nextMonth, 'FR')

    response.nextMonth = {
      month: nextMonth,
      monthName: getMonthName(nextMonth),
      rules: [...nextMonthRules].map(formatRule),
    }
  }

  // Include upcoming rules within days ahead
  if (daysAhead > 0) {
    const upcomingRules = getUpcomingRules(periodRuleStore, daysAhead, 'FR')
    response.upcoming = [...upcomingRules].map(formatRule)
  }

  return NextResponse.json(response)
}

function getMonthName(month: number): string {
  const names: Record<number, string> = {
    1: "Janvier",
    2: "Février",
    3: "Mars",
    4: "Avril",
    5: "Mai",
    6: "Juin",
    7: "Juillet",
    8: "Août",
    9: "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  }
  return names[month] ?? ""
}
