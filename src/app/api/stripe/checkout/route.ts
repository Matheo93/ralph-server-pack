import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { createCheckoutSession } from "@/lib/stripe/checkout"
import { validateStripeConfig } from "@/lib/stripe/client"

const CheckoutRequestSchema = z.object({
  householdId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration
    const config = validateStripeConfig()
    if (!config.valid) {
      console.error("Missing Stripe config:", config.missing)
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      )
    }

    // Get authenticated user
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    await setCurrentUser(userId)

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const parsed = CheckoutRequestSchema.safeParse(body)

    // Get user's household
    let householdId = parsed.success ? parsed.data.householdId : undefined

    if (!householdId) {
      const membership = await queryOne<{ household_id: string }>(`
        SELECT household_id
        FROM household_members
        WHERE user_id = $1 AND is_active = true
        LIMIT 1
      `, [userId])

      if (!membership) {
        return NextResponse.json(
          { error: "No household found" },
          { status: 400 }
        )
      }

      householdId = membership.household_id
    }

    // Get user email
    const user = await queryOne<{ email: string }>(`
      SELECT email FROM users WHERE id = $1
    `, [userId])

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      )
    }

    // Create checkout session
    const result = await createCheckoutSession(householdId, user.email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      url: result.url,
    })
  } catch (error) {
    console.error("Checkout API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
