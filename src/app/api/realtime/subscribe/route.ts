/**
 * Real-time SSE Subscription Endpoint
 *
 * GET /api/realtime/subscribe
 * Subscribe to real-time updates for the user's household
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, setCurrentUser } from "@/lib/aws/database"
import { createSSEStream, getConnectionStats } from "@/lib/services/realtime"

/**
 * GET /api/realtime/subscribe
 * Establishes an SSE connection for real-time updates
 */
export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Get user's household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json(
      { error: "Vous n'appartenez à aucun foyer" },
      { status: 400 }
    )
  }

  // Create SSE stream
  const stream = createSSEStream(userId, membership.household_id, () => {
    // Log disconnection for debugging
    console.log(`SSE disconnected: user=${userId}, household=${membership.household_id}`)
  })

  // Return SSE response
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}

/**
 * POST /api/realtime/subscribe
 * Get connection statistics (admin only)
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  await setCurrentUser(userId)

  // Check if user is admin
  const user = await queryOne<{ role: string }>(`
    SELECT role FROM users WHERE id = $1
  `, [userId])

  if (user?.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs" },
      { status: 403 }
    )
  }

  const stats = getConnectionStats()

  return NextResponse.json({
    success: true,
    stats,
  })
}
