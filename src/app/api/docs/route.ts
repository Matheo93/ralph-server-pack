/**
 * API Documentation Endpoint
 *
 * GET: Returns OpenAPI specification in JSON format
 */

import { NextResponse } from "next/server"
import { getOpenAPISpec } from "@/lib/openapi/schema"

/**
 * GET /api/docs
 * Returns the OpenAPI specification
 */
export async function GET() {
  const spec = getOpenAPISpec()

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  })
}
