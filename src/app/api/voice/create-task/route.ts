/**
 * Voice Create Task API
 *
 * POST: Complete pipeline - audio → transcription → analysis → task creation
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, query, insert, setCurrentUser } from "@/lib/aws/database"
import { z } from "zod"
import {
  transcribeAudio,
  isTranscriptionConfigured,
  validateAudioBlob,
} from "@/lib/voice/transcription"
import {
  analyzeText,
  isAnalysisConfigured,
  parseRelativeDate,
  urgencyToPriority,
} from "@/lib/voice/semantic-analysis"

const ManualCreateSchema = z.object({
  text: z.string().min(3).max(1000),
  language: z.enum(["fr", "en"]).optional().default("fr"),
  autoAssign: z.boolean().optional().default(true),
  childId: z.string().uuid().optional(),
})

interface CreatedTask {
  id: string
  title: string
  category: string
  priority: number
  due_date: string | null
  assigned_to: string | null
  child_id: string | null
}

/**
 * POST /api/voice/create-task
 * Complete voice-to-task pipeline
 *
 * Supports two modes:
 * 1. Audio upload (FormData with "audio" field)
 * 2. Text input (JSON with "text" field)
 */
export async function POST(request: NextRequest) {
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
      { error: "Foyer non trouvé" },
      { status: 404 }
    )
  }

  const householdId = membership.household_id

  // Get children for context
  const children = await query<{ id: string; name: string }>(`
    SELECT id, name
    FROM children
    WHERE household_id = $1
  `, [householdId])

  const childrenNames = children.map((c) => c.name)

  // Determine input type
  const contentType = request.headers.get("content-type") ?? ""

  let transcribedText: string
  let language: "fr" | "en" = "fr"
  let autoAssign = true
  let manualChildId: string | undefined

  if (contentType.includes("multipart/form-data")) {
    // Audio upload mode
    if (!isTranscriptionConfigured()) {
      return NextResponse.json(
        { error: "Transcription non configurée" },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio")
    const langParam = formData.get("language") as string | null

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Fichier audio manquant" },
        { status: 400 }
      )
    }

    const validation = validateAudioBlob(audioFile)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    language = langParam === "en" ? "en" : "fr"

    // Transcribe audio
    const transcriptionResult = await transcribeAudio(audioFile, { language })
    if (!transcriptionResult.success || !transcriptionResult.text) {
      return NextResponse.json(
        { error: transcriptionResult.error ?? "Erreur de transcription" },
        { status: 500 }
      )
    }

    transcribedText = transcriptionResult.text
  } else {
    // Text input mode
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
    }

    const validation = ManualCreateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      )
    }

    transcribedText = validation.data.text
    language = validation.data.language
    autoAssign = validation.data.autoAssign
    manualChildId = validation.data.childId
  }

  // Check analysis configuration
  if (!isAnalysisConfigured()) {
    return NextResponse.json(
      { error: "Analyse non configurée" },
      { status: 503 }
    )
  }

  // Analyze text
  const analysisResult = await analyzeText(transcribedText, {
    childrenNames,
    language,
  })

  if (!analysisResult.success || !analysisResult.extraction) {
    return NextResponse.json(
      { error: analysisResult.error ?? "Erreur d'analyse" },
      { status: 500 }
    )
  }

  const { extraction } = analysisResult

  // Match child by name if mentioned
  let childId: string | null = manualChildId ?? null
  if (!childId && extraction.childName) {
    const matchedChild = children.find(
      (c) => c.name.toLowerCase() === extraction.childName?.toLowerCase()
    )
    if (matchedChild) {
      childId = matchedChild.id
    }
  }

  // Parse due date
  let dueDate: Date | null = null
  if (extraction.date) {
    dueDate = parseRelativeDate(extraction.date, language)
  }

  // Get assignment if auto-assign is enabled
  let assignedTo: string | null = null
  if (autoAssign) {
    // Get parent with lowest load this week
    const loads = await query<{ user_id: string; load: number }>(`
      SELECT
        hm.user_id,
        COALESCE(COUNT(t.id), 0)::int as load
      FROM household_members hm
      LEFT JOIN tasks t ON t.assigned_to = hm.user_id
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= NOW() - INTERVAL '7 days'
      WHERE hm.household_id = $1 AND hm.is_active = true
      GROUP BY hm.user_id
      ORDER BY load ASC
      LIMIT 1
    `, [householdId])

    if (loads.length > 0) {
      assignedTo = loads[0]!.user_id
    }
  }

  // Create task
  try {
    const task = await insert<CreatedTask>("tasks", {
      household_id: householdId,
      title: extraction.action,
      description: transcribedText,
      category: extraction.category,
      priority: urgencyToPriority(extraction.urgency),
      due_date: dueDate?.toISOString() ?? null,
      assigned_to: assignedTo,
      child_id: childId,
      source: "voice",
      status: "pending",
      created_by: userId,
      created_at: new Date().toISOString(),
    })

    if (!task) {
      return NextResponse.json(
        { error: "Erreur lors de la création de la tâche" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        category: task.category,
        priority: task.priority,
        dueDate: task.due_date,
        assignedTo: task.assigned_to,
        childId: task.child_id,
      },
      extraction: {
        originalText: transcribedText,
        action: extraction.action,
        childName: extraction.childName,
        date: extraction.date,
        category: extraction.category,
        urgency: extraction.urgency,
        confidence: extraction.confidence,
      },
    })
  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la tâche" },
      { status: 500 }
    )
  }
}
