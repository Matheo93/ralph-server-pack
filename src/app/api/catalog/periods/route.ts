/**
 * Period Rules API
 *
 * GET: Get current period-based task rules
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import {
  createPeriodRuleStore,
  getCurrentMonthRules,
  getRulesForMonth,
  shouldTriggerRule,
} from "@/lib/catalog/period-rules"

const periodRuleStore = createPeriodRuleStore()

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
    ? getRulesForMonth(periodRuleStore, currentMonth)
    : getCurrentMonthRules(periodRuleStore)

  if (triggeredOnly) {
    currentRules = currentRules.filter(rule => shouldTriggerRule(rule, now))
  }

  const formatRule = (rule: ReturnType<typeof getCurrentMonthRules>[number]) => ({
    id: rule.id,
    title: rule.title['fr'] ?? rule.title['en'] ?? Object.values(rule.title)[0] ?? '',
    description: rule.description?.['fr'] ?? rule.description?.['en'] ?? '',
    category: rule.category,
    priority: rule.priority,
    months: rule.months,
    dayRange: rule.dayRange,
    isTriggered: shouldTriggerRule(rule, now),
    ageRanges: rule.ageRanges,
    country: rule.country,
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
  } = {
    currentMonth: {
      month: currentMonth,
      monthName: getMonthName(currentMonth),
      rules: currentRules.map(formatRule),
    },
  }

  // Include next month if requested
  if (includeNext) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextMonthRules = getRulesForMonth(periodRuleStore, nextMonth)

    response.nextMonth = {
      month: nextMonth,
      monthName: getMonthName(nextMonth),
      rules: nextMonthRules.map(formatRule),
    }
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
