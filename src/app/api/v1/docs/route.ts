/**
 * API Documentation Endpoint
 *
 * Serves the OpenAPI specification for the mobile API.
 */

import { NextResponse } from "next/server"
import openApiSpec from "../openapi.json"

/**
 * GET /api/v1/docs
 * Return the OpenAPI specification
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
