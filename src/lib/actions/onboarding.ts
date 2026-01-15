"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getUserId } from "@/lib/auth/actions"
import { query, queryOne, insert, transaction, setCurrentUser } from "@/lib/aws/database"
import { onboardingWizardSchema } from "@/lib/validations/onboarding"
import type { OnboardingWizardInput } from "@/lib/validations/onboarding"
import crypto from "crypto"

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

interface Household {
  id: string
  name: string
  country: string
  timezone: string
}

interface Child {
  id: string
  household_id: string
  first_name: string
  birthdate: string
  tags: string[]
}

interface Invitation {
  id: string
  household_id: string
  email: string
  role: string
  token: string
  expires_at: string
}

export async function completeOnboarding(
  data: OnboardingWizardInput
): Promise<ActionResult<{ householdId: string }>> {
  const validation = onboardingWizardSchema.safeParse(data)
  if (!validation.success) {
    const issues = validation.error.issues
    return {
      success: false,
      error: issues[0]?.message ?? "Données invalides",
    }
  }

  const userId = await getUserId()
  if (!userId) {
    return {
      success: false,
      error: "Utilisateur non connecté",
    }
  }

  const { step1, step2, step3, step4 } = validation.data

  try {
    await transaction(async (client) => {
      // 1. Create household
      const householdResult = await client.query<Household>(
        `INSERT INTO households (name, country, timezone)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [step1.name, step1.country, step1.timezone]
      )
      const household = householdResult.rows[0]

      if (!household) {
        throw new Error("Erreur lors de la création du foyer")
      }

      // 2. Add user as parent_principal
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [household.id, userId, "parent_principal"]
      )

      // 3. Create children
      for (const child of step2.children) {
        await client.query(
          `INSERT INTO children (household_id, first_name, birthdate, tags)
           VALUES ($1, $2, $3, $4)`,
          [household.id, child.first_name, child.birthdate, child.tags]
        )
      }

      // 4. Create co-parent invitation if email provided and not skipped
      if (step3.email && !step3.skip) {
        const token = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await client.query(
          `INSERT INTO invitations (household_id, email, role, token, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [household.id, step3.email, "co_parent", token, expiresAt.toISOString()]
        )
      }

      // 5. Save notification preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id,
          push_enabled,
          email_enabled,
          daily_reminder_time,
          weekly_summary_enabled,
          balance_alert_enabled,
          reminder_before_deadline_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id)
        DO UPDATE SET
          push_enabled = EXCLUDED.push_enabled,
          email_enabled = EXCLUDED.email_enabled,
          daily_reminder_time = EXCLUDED.daily_reminder_time,
          weekly_summary_enabled = EXCLUDED.weekly_summary_enabled,
          updated_at = NOW()`,
        [
          userId,
          step4.push_enabled,
          step4.email_enabled,
          step4.daily_reminder_time,
          step4.weekly_summary_enabled,
          true, // balance_alert_enabled default
          24, // reminder_before_deadline_hours default
        ]
      )

      return household
    })

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error) {
    // Re-throw redirect errors - they are NOT real errors!
    if (isRedirectError(error)) {
      throw error
    }
    const err = error as Error
    return {
      success: false,
      error: err.message || "Erreur lors de la création du foyer",
    }
  }
}

// Get existing onboarding state (for resuming)
export async function getOnboardingState(): Promise<{
  hasHousehold: boolean
  householdId: string | null
}> {
  const userId = await getUserId()
  if (!userId) {
    return { hasHousehold: false, householdId: null }
  }

  await setCurrentUser(userId)

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  return {
    hasHousehold: !!membership,
    householdId: membership?.household_id ?? null,
  }
}
