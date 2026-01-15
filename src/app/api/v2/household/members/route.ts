/**
 * Household Members API v2
 *
 * Breaking change from v1:
 * - Members are now in a separate endpoint (was nested in /api/v1/household)
 * - Extended member info with stats
 * - Invitation management
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { notFound, validationError, forbidden, internalError } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface MemberV2Response {
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: "admin" | "member"
  isActive: boolean
  joinedAt: string
  lastActivityAt: string | null
  stats: {
    tasksCompletedThisWeek: number
    tasksCompletedTotal: number
    loadPercentage: number
  }
}

interface InvitationResponse {
  id: string
  email: string
  role: "admin" | "member"
  status: "pending" | "accepted" | "expired"
  invitedBy: string
  createdAt: string
  expiresAt: string
}

// =============================================================================
// SCHEMAS
// =============================================================================

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
})

const UpdateMemberSchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
  isActive: z.boolean().optional(),
})

// =============================================================================
// GET /api/v2/household/members - List members
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (_userId, householdId) => {
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get("includeInactive") === "true"
    const includeStats = searchParams.get("includeStats") !== "false" // Default true

    // Get members
    let whereClause = "hm.household_id = $1"
    if (!includeInactive) {
      whereClause += " AND hm.is_active = true"
    }

    const members = await query<Record<string, unknown>>(`
      SELECT
        hm.user_id,
        u.email,
        u.name,
        u.avatar_url,
        hm.role,
        hm.is_active,
        hm.created_at::text as joined_at,
        u.last_login::text as last_activity_at
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE ${whereClause}
      ORDER BY
        CASE hm.role WHEN 'admin' THEN 0 ELSE 1 END,
        hm.created_at ASC
    `, [householdId])

    // Get stats for each member if requested
    const v2Members: MemberV2Response[] = []

    for (const member of members) {
      let stats = {
        tasksCompletedThisWeek: 0,
        tasksCompletedTotal: 0,
        loadPercentage: 0,
      }

      if (includeStats) {
        const [weekStats, totalStats, loadStats] = await Promise.all([
          queryOne<{ count: number }>(`
            SELECT COUNT(*) as count
            FROM tasks
            WHERE household_id = $1
              AND completed_by = $2
              AND completed_at >= NOW() - INTERVAL '7 days'
          `, [householdId, member["user_id"]]),
          queryOne<{ count: number }>(`
            SELECT COUNT(*) as count
            FROM tasks
            WHERE household_id = $1
              AND completed_by = $2
              AND status = 'done'
          `, [householdId, member["user_id"]]),
          queryOne<{ user_load: number; total_load: number }>(`
            SELECT
              COALESCE(SUM(CASE WHEN assigned_to = $2 THEN load_weight ELSE 0 END), 0) as user_load,
              COALESCE(SUM(load_weight), 0) as total_load
            FROM tasks
            WHERE household_id = $1 AND status = 'done'
          `, [householdId, member["user_id"]]),
        ])

        stats = {
          tasksCompletedThisWeek: weekStats?.count ?? 0,
          tasksCompletedTotal: totalStats?.count ?? 0,
          loadPercentage: loadStats?.total_load
            ? Math.round((loadStats.user_load / loadStats.total_load) * 100)
            : 0,
        }
      }

      v2Members.push({
        userId: member["user_id"] as string,
        email: member["email"] as string,
        name: member["name"] as string | null,
        avatarUrl: member["avatar_url"] as string | null,
        role: member["role"] as "admin" | "member",
        isActive: member["is_active"] as boolean,
        joinedAt: member["joined_at"] as string,
        lastActivityAt: member["last_activity_at"] as string | null,
        stats,
      })
    }

    // Get pending invitations
    const invitations = await query<Record<string, unknown>>(`
      SELECT
        i.id,
        i.email,
        i.role,
        i.status,
        u.name as invited_by,
        i.created_at::text,
        i.expires_at::text
      FROM household_invitations i
      LEFT JOIN users u ON u.id = i.invited_by
      WHERE i.household_id = $1 AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `, [householdId])

    const v2Invitations: InvitationResponse[] = invitations.map(inv => ({
      id: inv["id"] as string,
      email: inv["email"] as string,
      role: inv["role"] as "admin" | "member",
      status: inv["status"] as "pending" | "accepted" | "expired",
      invitedBy: inv["invited_by"] as string,
      createdAt: inv["created_at"] as string,
      expiresAt: inv["expires_at"] as string,
    }))

    const response = NextResponse.json({
      data: {
        members: v2Members,
        pendingInvitations: v2Invitations,
      },
      meta: {
        totalMembers: v2Members.filter(m => m.isActive).length,
        totalInvitations: v2Invitations.length,
      },
    })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// POST /api/v2/household/members - Invite new member
// =============================================================================

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Check if user is admin
    const membership = await queryOne<{ role: string }>(`
      SELECT role FROM household_members
      WHERE user_id = $1 AND household_id = $2 AND is_active = true
    `, [userId, householdId])

    if (membership?.role !== "admin") {
      return forbidden()
    }

    const bodyResult = await parseBody(request, InviteMemberSchema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
    }

    const { email, role } = bodyResult.data

    // Check if email already in household
    const existing = await queryOne<{ user_id: string }>(`
      SELECT hm.user_id
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE u.email = $1 AND hm.household_id = $2
    `, [email, householdId])

    if (existing) {
      return validationError({ message: "User is already a member of this household" })
    }

    // Check for pending invitation
    const existingInvitation = await queryOne<{ id: string }>(`
      SELECT id FROM household_invitations
      WHERE email = $1 AND household_id = $2 AND status = 'pending'
    `, [email, householdId])

    if (existingInvitation) {
      return validationError({ message: "An invitation is already pending for this email" })
    }

    // Generate invitation token
    const token = Buffer.from(crypto.randomUUID()).toString("base64url")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days validity

    // Create invitation
    const result = await query<{ id: string }>(`
      INSERT INTO household_invitations (
        household_id,
        email,
        role,
        token,
        invited_by,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [householdId, email, role, token, userId, expiresAt.toISOString()])

    if (result.length === 0) {
      return internalError()
    }

    // Get created invitation
    const invitation = await queryOne<Record<string, unknown>>(`
      SELECT
        i.id,
        i.email,
        i.role,
        i.status,
        u.name as invited_by,
        i.created_at::text,
        i.expires_at::text
      FROM household_invitations i
      LEFT JOIN users u ON u.id = i.invited_by
      WHERE i.id = $1
    `, [result[0]!.id])

    const v2Invitation: InvitationResponse | null = invitation
      ? {
          id: invitation["id"] as string,
          email: invitation["email"] as string,
          role: invitation["role"] as "admin" | "member",
          status: invitation["status"] as "pending" | "accepted" | "expired",
          invitedBy: invitation["invited_by"] as string,
          createdAt: invitation["created_at"] as string,
          expiresAt: invitation["expires_at"] as string,
        }
      : null

    const response = NextResponse.json({ data: v2Invitation }, { status: 201 })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// DELETE /api/v2/household/members - Remove member or cancel invitation
// =============================================================================

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, householdId) => {
    // Check if user is admin
    const membership = await queryOne<{ role: string }>(`
      SELECT role FROM household_members
      WHERE user_id = $1 AND household_id = $2 AND is_active = true
    `, [userId, householdId])

    if (membership?.role !== "admin") {
      return forbidden()
    }

    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get("memberId")
    const invitationId = searchParams.get("invitationId")

    if (!memberId && !invitationId) {
      return validationError("Either memberId or invitationId is required")
    }

    if (memberId) {
      // Cannot remove self
      if (memberId === userId) {
        return validationError("Cannot remove yourself from the household")
      }

      // Deactivate member
      const result = await query<{ user_id: string }>(`
        UPDATE household_members
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND household_id = $2 AND is_active = true
        RETURNING user_id
      `, [memberId, householdId])

      if (result.length === 0) {
        return notFound("member")
      }

      const response = NextResponse.json({
        data: { removed: true, memberId },
      })
      return addVersionHeaders(response, API_VERSION)
    }

    if (invitationId) {
      // Cancel invitation
      const result = await query<{ id: string }>(`
        UPDATE household_invitations
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND household_id = $2 AND status = 'pending'
        RETURNING id
      `, [invitationId, householdId])

      if (result.length === 0) {
        return notFound("invitation")
      }

      const response = NextResponse.json({
        data: { cancelled: true, invitationId },
      })
      return addVersionHeaders(response, API_VERSION)
    }

    return validationError("Invalid request")
  })
}
