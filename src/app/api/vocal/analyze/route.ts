import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { queryOne } from "@/lib/aws/database"
import { createVocalTask, getCategoryId } from "@/lib/vocal/analyze"
import { VocalAnalyzeRequestSchema } from "@/lib/validations/vocal"

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
  const validation = VocalAnalyzeRequestSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { transcript } = validation.data

  const task = await createVocalTask(transcript, membership.household_id)
  const categoryId = await getCategoryId(task.category_code)

  return NextResponse.json({
    task: {
      ...task,
      category_id: categoryId,
    },
  })
}
