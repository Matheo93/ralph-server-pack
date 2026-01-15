import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth/actions"
import { generateUploadUrl } from "@/lib/aws/s3"
import { VocalUploadRequestSchema } from "@/lib/validations/vocal"

export async function POST(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  const validation = VocalUploadRequestSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    )
  }

  const { filename, contentType } = validation.data

  const result = await generateUploadUrl(filename, contentType)

  return NextResponse.json({
    uploadUrl: result.uploadUrl,
    key: result.key,
    publicUrl: result.publicUrl,
  })
}
