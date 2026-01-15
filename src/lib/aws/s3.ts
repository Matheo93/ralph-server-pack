import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env["AWS_REGION"] ?? "us-east-1",
  credentials: {
    accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "",
    secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "",
  },
})

const BUCKET_NAME = process.env["AWS_S3_BUCKET"] ?? "familyload-uploads"

export interface PresignedUrlResult {
  uploadUrl: string
  key: string
  publicUrl: string
}

export async function generateUploadUrl(
  filename: string,
  contentType: string = "audio/webm",
  expiresIn: number = 3600
): Promise<PresignedUrlResult> {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const key = `vocal/${timestamp}-${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env["AWS_REGION"] ?? "us-east-1"}.amazonaws.com/${key}`

  return {
    uploadUrl,
    key,
    publicUrl,
  }
}

export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function getObjectAsBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const response = await s3Client.send(command)
  const stream = response.Body

  if (!stream) {
    throw new Error("No body in S3 response")
  }

  const chunks: Uint8Array[] = []
  // @ts-expect-error - stream is async iterable
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

export async function deleteFile(key: string): Promise<boolean> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
  return true
}

export function getPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${process.env["AWS_REGION"] ?? "us-east-1"}.amazonaws.com/${key}`
}

export { s3Client, BUCKET_NAME }
