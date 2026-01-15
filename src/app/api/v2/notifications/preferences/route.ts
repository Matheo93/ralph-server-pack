/**
 * Notification Preferences API v2
 *
 * Breaking changes from v1:
 * - Preferences split into categories (tasks, streaks, household, insights, system)
 * - Separate channel preferences (push, email, inApp)
 * - Quiet hours support
 */

import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/aws/database"
import { z } from "zod"
import {
  withAuth,
  parseBody,
} from "@/lib/api/utils"
import { addVersionHeaders, type APIVersion } from "@/lib/api/versioning"
import { validationError } from "@/lib/api/error-responses"

const API_VERSION: APIVersion = "v2"

// =============================================================================
// TYPES
// =============================================================================

interface NotificationPreferencesV2 {
  global: {
    enabled: boolean
    quietHoursStart: string | null
    quietHoursEnd: string | null
    channels: {
      push: boolean
      email: boolean
      inApp: boolean
    }
  }
  categories: {
    tasks: CategoryPreference
    streaks: CategoryPreference
    household: CategoryPreference
    insights: CategoryPreference
    system: CategoryPreference
  }
}

interface CategoryPreference {
  enabled: boolean
  push: boolean
  email: boolean
}

// =============================================================================
// SCHEMAS
// =============================================================================

const CategoryPreferenceSchema = z.object({
  enabled: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
})

const UpdatePreferencesV2Schema = z.object({
  global: z.object({
    enabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    channels: z.object({
      push: z.boolean().optional(),
      email: z.boolean().optional(),
      inApp: z.boolean().optional(),
    }).optional(),
  }).optional(),
  categories: z.object({
    tasks: CategoryPreferenceSchema.optional(),
    streaks: CategoryPreferenceSchema.optional(),
    household: CategoryPreferenceSchema.optional(),
    insights: CategoryPreferenceSchema.optional(),
    system: CategoryPreferenceSchema.optional(),
  }).optional(),
})

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultPreferences(): NotificationPreferencesV2 {
  return {
    global: {
      enabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      channels: {
        push: true,
        email: true,
        inApp: true,
      },
    },
    categories: {
      tasks: { enabled: true, push: true, email: false },
      streaks: { enabled: true, push: true, email: true },
      household: { enabled: true, push: true, email: true },
      insights: { enabled: true, push: false, email: true },
      system: { enabled: true, push: true, email: true },
    },
  }
}

function mergePreferences(
  current: NotificationPreferencesV2,
  update: z.infer<typeof UpdatePreferencesV2Schema>
): NotificationPreferencesV2 {
  const result = { ...current }

  if (update.global) {
    result.global = {
      ...result.global,
      ...update.global,
      channels: {
        ...result.global.channels,
        ...(update.global.channels ?? {}),
      },
    }
  }

  if (update.categories) {
    const categories = { ...result.categories }
    for (const [key, value] of Object.entries(update.categories)) {
      if (value) {
        const categoryKey = key as keyof typeof categories
        categories[categoryKey] = {
          ...categories[categoryKey],
          ...value,
        }
      }
    }
    result.categories = categories
  }

  return result
}

// =============================================================================
// GET /api/v2/notifications/preferences - Get preferences
// =============================================================================

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    // Get user preferences
    const userPrefs = await queryOne<{ notification_preferences: Record<string, unknown> | null }>(`
      SELECT notification_preferences
      FROM users
      WHERE id = $1
    `, [userId])

    // Merge with defaults
    const defaults = getDefaultPreferences()
    let preferences: NotificationPreferencesV2 = defaults

    if (userPrefs?.notification_preferences) {
      const stored = userPrefs.notification_preferences as unknown as Partial<NotificationPreferencesV2>
      preferences = {
        global: {
          ...defaults.global,
          ...(stored.global ?? {}),
          channels: {
            ...defaults.global.channels,
            ...(stored.global?.channels ?? {}),
          },
        },
        categories: {
          tasks: { ...defaults.categories.tasks, ...(stored.categories?.tasks ?? {}) },
          streaks: { ...defaults.categories.streaks, ...(stored.categories?.streaks ?? {}) },
          household: { ...defaults.categories.household, ...(stored.categories?.household ?? {}) },
          insights: { ...defaults.categories.insights, ...(stored.categories?.insights ?? {}) },
          system: { ...defaults.categories.system, ...(stored.categories?.system ?? {}) },
        },
      }
    }

    const response = NextResponse.json({ data: preferences })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// PUT /api/v2/notifications/preferences - Update preferences
// =============================================================================

export async function PUT(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    const bodyResult = await parseBody(request, UpdatePreferencesV2Schema)
    if (!bodyResult.success) {
      return validationError({ message: bodyResult.error })
    }

    const update = bodyResult.data

    // Validate quiet hours
    if (update.global?.quietHoursStart && !update.global?.quietHoursEnd) {
      return validationError({ message: "quietHoursEnd is required when quietHoursStart is set" })
    }
    if (!update.global?.quietHoursStart && update.global?.quietHoursEnd) {
      return validationError({ message: "quietHoursStart is required when quietHoursEnd is set" })
    }

    // Get current preferences
    const userPrefs = await queryOne<{ notification_preferences: Record<string, unknown> | null }>(`
      SELECT notification_preferences
      FROM users
      WHERE id = $1
    `, [userId])

    // Merge with defaults and update
    const defaults = getDefaultPreferences()
    let currentPrefs: NotificationPreferencesV2 = defaults

    if (userPrefs?.notification_preferences) {
      const stored = userPrefs.notification_preferences as unknown as Partial<NotificationPreferencesV2>
      currentPrefs = {
        global: {
          ...defaults.global,
          ...(stored.global ?? {}),
          channels: {
            ...defaults.global.channels,
            ...(stored.global?.channels ?? {}),
          },
        },
        categories: {
          tasks: { ...defaults.categories.tasks, ...(stored.categories?.tasks ?? {}) },
          streaks: { ...defaults.categories.streaks, ...(stored.categories?.streaks ?? {}) },
          household: { ...defaults.categories.household, ...(stored.categories?.household ?? {}) },
          insights: { ...defaults.categories.insights, ...(stored.categories?.insights ?? {}) },
          system: { ...defaults.categories.system, ...(stored.categories?.system ?? {}) },
        },
      }
    }

    const newPrefs = mergePreferences(currentPrefs, update)

    // Save preferences
    await query(`
      UPDATE users
      SET notification_preferences = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(newPrefs), userId])

    const response = NextResponse.json({ data: newPrefs })
    return addVersionHeaders(response, API_VERSION)
  })
}

// =============================================================================
// PATCH /api/v2/notifications/preferences - Partial update
// =============================================================================

export async function PATCH(request: NextRequest) {
  return PUT(request)
}

// =============================================================================
// DELETE /api/v2/notifications/preferences - Reset to defaults
// =============================================================================

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, _householdId) => {
    const defaults = getDefaultPreferences()

    await query(`
      UPDATE users
      SET notification_preferences = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(defaults), userId])

    const response = NextResponse.json({ data: defaults })
    return addVersionHeaders(response, API_VERSION)
  })
}
