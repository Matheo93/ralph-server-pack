import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne, insert } from "@/lib/aws/database"
import { getCategoryId } from "@/lib/vocal/analyze"
import { VocalCreateTaskRequestSchema } from "@/lib/validations/vocal"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [userId])

  if (!membership) {
    return NextResponse.json({ error: "Pas de foyer" }, { status: 400 })
  }

  const body = await request.json()
  const validation = VocalCreateTaskRequestSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const data = validation.data
  const categoryId = await getCategoryId(data.category_code)

  const task = await insert<{ id: string }>("tasks", {
    household_id: membership.household_id,
    title: data.title,
    description: data.description ?? null,
    child_id: data.child_id ?? null,
    category_id: categoryId,
    priority: data.priority,
    deadline: data.deadline ?? null,
    source: "vocal",
    vocal_transcript: data.vocal_transcript,
    vocal_audio_url: data.vocal_audio_url ?? null,
    created_by: userId,
    assigned_to: userId,
    status: "pending",
  })

  if (!task) {
    return NextResponse.json(
      { error: "Erreur lors de la création de la tâche" },
      { status: 500 }
    )
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")

  return NextResponse.json({
    success: true,
    taskId: task.id,
  })
}
