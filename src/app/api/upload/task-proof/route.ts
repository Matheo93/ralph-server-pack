import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { generateUploadUrl } from '@/lib/aws/s3'

// Schéma de validation pour la requête
const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  taskId: z.string().uuid(),
})

// Schéma de session enfant
interface KidsSession {
  childId: string
  firstName: string
  createdAt: number
}

const KIDS_SESSION_COOKIE = 'kids_session'
const SESSION_MAX_AGE = 60 * 60 * 4 // 4 heures

/**
 * GET /api/upload/task-proof
 * Génère une URL présignée S3 pour l'upload de photo de preuve
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier la session enfant
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(KIDS_SESSION_COOKIE)

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    let session: KidsSession
    try {
      session = JSON.parse(sessionCookie.value) as KidsSession
    } catch {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      )
    }

    // Vérifier l'expiration de la session
    if (Date.now() - session.createdAt > SESSION_MAX_AGE * 1000) {
      return NextResponse.json(
        { error: 'Session expirée' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')
    const contentType = searchParams.get('contentType')
    const taskId = searchParams.get('taskId')

    // Valider les paramètres
    const validation = uploadRequestSchema.safeParse({
      filename,
      contentType,
      taskId,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { filename: validFilename, contentType: validContentType, taskId: validTaskId } = validation.data

    // Générer un nom de fichier unique avec le childId et taskId
    const timestamp = Date.now()
    const sanitizedFilename = validFilename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${session.childId}/${validTaskId}/${timestamp}-${sanitizedFilename}`

    // Générer l'URL présignée pour l'upload
    const presignedResult = await generateTaskProofUploadUrl(
      uniqueFilename,
      validContentType
    )

    return NextResponse.json({
      success: true,
      uploadUrl: presignedResult.uploadUrl,
      key: presignedResult.key,
      publicUrl: presignedResult.publicUrl,
    })
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL d\'upload:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * Génère une URL présignée pour l'upload d'une photo de preuve
 */
async function generateTaskProofUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  // Utiliser un préfixe spécifique pour les preuves de tâches
  const key = `task-proofs/${filename}`

  // Importer directement les modules S3
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

  const s3Client = new S3Client({
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? '',
    },
  })

  const bucketName = process.env['AWS_S3_BUCKET'] ?? 'familyload-uploads'

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    // Permettre l'accès public pour afficher les photos
    ACL: 'public-read',
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  const publicUrl = `https://${bucketName}.s3.${process.env['AWS_REGION'] ?? 'us-east-1'}.amazonaws.com/${key}`

  return {
    uploadUrl,
    key,
    publicUrl,
  }
}
