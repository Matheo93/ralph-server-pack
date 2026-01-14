import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { createPortalSession } from "@/lib/stripe/checkout"
import { validateStripeConfig } from "@/lib/stripe/client"

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

    // Get user's household
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

    // Create portal session
    const result = await createPortalSession(membership.household_id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      url: result.url,
    })
  } catch (error) {
    console.error("Portal API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
