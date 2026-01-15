/**
 * OpenAPI Schema Definitions
 *
 * Provides OpenAPI 3.1 specification for the FamilyLoad API.
 * Includes endpoint documentation, request/response schemas, and error codes.
 */

// =============================================================================
// TYPES
// =============================================================================

interface OpenAPIInfo {
  title: string
  description: string
  version: string
  contact: {
    name: string
    email: string
    url: string
  }
  license: {
    name: string
    url: string
  }
}

interface OpenAPIServer {
  url: string
  description: string
}

interface OpenAPISecurityScheme {
  type: string
  scheme?: string
  bearerFormat?: string
  description: string
}

interface OpenAPISchema {
  type: string
  properties?: Record<string, OpenAPISchemaProperty>
  required?: string[]
  items?: OpenAPISchemaProperty
  enum?: string[]
  format?: string
  description?: string
  example?: unknown
}

interface OpenAPISchemaProperty {
  type?: string
  $ref?: string
  description?: string
  format?: string
  example?: unknown
  enum?: string[]
  items?: OpenAPISchemaProperty
  properties?: Record<string, OpenAPISchemaProperty>
  nullable?: boolean
  minimum?: number
  maximum?: number
}

interface OpenAPIResponse {
  description: string
  content?: {
    "application/json": {
      schema: OpenAPISchema | { $ref: string }
    }
  }
}

interface OpenAPIOperation {
  tags: string[]
  summary: string
  description: string
  operationId: string
  security?: { bearerAuth: string[] }[]
  requestBody?: {
    required: boolean
    content: {
      "application/json": {
        schema: OpenAPISchema | { $ref: string }
      }
    }
  }
  responses: Record<string, OpenAPIResponse>
  parameters?: OpenAPIParameter[]
}

interface OpenAPIParameter {
  name: string
  in: "query" | "path" | "header"
  required?: boolean
  description: string
  schema: OpenAPISchemaProperty
}

interface OpenAPIPath {
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  patch?: OpenAPIOperation
  delete?: OpenAPIOperation
}

interface OpenAPISpec {
  openapi: string
  info: OpenAPIInfo
  servers: OpenAPIServer[]
  tags: { name: string; description: string }[]
  paths: Record<string, OpenAPIPath>
  components: {
    securitySchemes: Record<string, OpenAPISecurityScheme>
    schemas: Record<string, OpenAPISchema>
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://familyload.fr"
const API_VERSION = "1.0.0"

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const commonSchemas: Record<string, OpenAPISchema> = {
  Error: {
    type: "object",
    properties: {
      error: { type: "string", description: "Error message" },
      code: { type: "string", description: "Error code" },
      details: { type: "object", description: "Additional error details" },
    },
    required: ["error"],
  },
  Success: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string" },
    },
    required: ["success"],
  },
  Task: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task description", nullable: true },
      status: {
        type: "string",
        enum: ["pending", "completed", "overdue"],
      },
      dueDate: { type: "string", format: "date-time", nullable: true },
      assignedTo: { type: "string", format: "uuid", nullable: true },
      childId: { type: "string", format: "uuid", nullable: true },
      householdId: { type: "string", format: "uuid" },
      priority: { type: "integer", minimum: 1, maximum: 5 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "title", "status", "householdId", "createdAt"],
  },
  Child: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      birthDate: { type: "string", format: "date", nullable: true },
      avatar: { type: "string", nullable: true },
      householdId: { type: "string", format: "uuid" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "householdId"],
  },
  Household: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      subscriptionStatus: {
        type: "string",
        enum: ["active", "trial", "past_due", "cancelled"],
      },
      trialEndsAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "subscriptionStatus"],
  },
  User: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      name: { type: "string" },
      avatar: { type: "string", nullable: true },
      role: { type: "string", enum: ["parent", "child"] },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "email", "name", "role"],
  },
  DeviceToken: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      token: { type: "string", description: "FCM/APNs device token" },
      platform: { type: "string", enum: ["ios", "android", "web"] },
      deviceName: { type: "string", nullable: true },
      enabled: { type: "boolean" },
      lastUsed: { type: "string", format: "date-time" },
    },
    required: ["id", "token", "platform", "enabled"],
  },
  Invoice: {
    type: "object",
    properties: {
      id: { type: "string" },
      number: { type: "string", nullable: true },
      status: { type: "string", enum: ["draft", "open", "paid", "void", "uncollectible"] },
      amountDue: { type: "integer", description: "Amount in cents" },
      amountPaid: { type: "integer", description: "Amount in cents" },
      currency: { type: "string", example: "eur" },
      invoicePdf: { type: "string", nullable: true },
      hostedInvoiceUrl: { type: "string", nullable: true },
      periodStart: { type: "string", format: "date-time", nullable: true },
      periodEnd: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "status", "amountDue", "amountPaid", "currency"],
  },
}

// =============================================================================
// API PATHS
// =============================================================================

export const apiPaths: Record<string, OpenAPIPath> = {
  // ==========================================================================
  // TASKS
  // ==========================================================================
  "/api/tasks": {
    get: {
      tags: ["Tasks"],
      summary: "List tasks",
      description: "Get all tasks for the authenticated user's household",
      operationId: "listTasks",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by status",
          schema: { type: "string", enum: ["pending", "completed", "overdue"] },
        },
        {
          name: "childId",
          in: "query",
          description: "Filter by child",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "limit",
          in: "query",
          description: "Max number of results",
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
      ],
      responses: {
        "200": {
          description: "List of tasks",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  hasMore: { type: "boolean" },
                },
              },
            },
          },
        },
        "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    post: {
      tags: ["Tasks"],
      summary: "Create task",
      description: "Create a new task",
      operationId: "createTask",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title" },
                description: { type: "string", description: "Task description" },
                dueDate: { type: "string", format: "date-time" },
                assignedTo: { type: "string", format: "uuid" },
                childId: { type: "string", format: "uuid" },
                priority: { type: "integer", minimum: 1, maximum: 5 },
              },
              required: ["title"],
            },
          },
        },
      },
      responses: {
        "201": { description: "Task created", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
        "400": { description: "Invalid input", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/tasks/{id}": {
    get: {
      tags: ["Tasks"],
      summary: "Get task",
      description: "Get a specific task by ID",
      operationId: "getTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, description: "Task ID", schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": { description: "Task details", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
        "404": { description: "Task not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    patch: {
      tags: ["Tasks"],
      summary: "Update task",
      description: "Update a task",
      operationId: "updateTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, description: "Task ID", schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string", enum: ["pending", "completed"] },
                dueDate: { type: "string", format: "date-time" },
                assignedTo: { type: "string", format: "uuid" },
                priority: { type: "integer", minimum: 1, maximum: 5 },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Task updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
        "404": { description: "Task not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    delete: {
      tags: ["Tasks"],
      summary: "Delete task",
      description: "Delete a task",
      operationId: "deleteTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, description: "Task ID", schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": { description: "Task deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        "404": { description: "Task not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },

  // ==========================================================================
  // MOBILE
  // ==========================================================================
  "/api/mobile/register-device": {
    post: {
      tags: ["Mobile"],
      summary: "Register device",
      description: "Register a mobile device for push notifications",
      operationId: "registerDevice",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                token: { type: "string", description: "FCM/APNs token" },
                platform: { type: "string", enum: ["ios", "android", "web"] },
                deviceName: { type: "string" },
                deviceModel: { type: "string" },
                osVersion: { type: "string" },
                appVersion: { type: "string" },
              },
              required: ["token", "platform"],
            },
          },
        },
      },
      responses: {
        "200": { description: "Device registered", content: { "application/json": { schema: { $ref: "#/components/schemas/DeviceToken" } } } },
        "400": { description: "Invalid input", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/mobile/sync": {
    get: {
      tags: ["Mobile"],
      summary: "Sync data",
      description: "Get all data for offline sync",
      operationId: "syncData",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "since", in: "query", description: "ISO timestamp for incremental sync", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Sync data",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
                  household: { $ref: "#/components/schemas/Household" },
                  syncedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/mobile/health": {
    get: {
      tags: ["Mobile"],
      summary: "Health check",
      description: "Check API health and version",
      operationId: "healthCheck",
      responses: {
        "200": {
          description: "Health status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "healthy" },
                  version: { type: "string", example: "1.0.0" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  "/api/notifications/subscribe": {
    post: {
      tags: ["Notifications"],
      summary: "Subscribe to push notifications",
      description: "Subscribe a device to push notifications",
      operationId: "subscribeNotifications",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                token: { type: "string" },
                platform: { type: "string", enum: ["ios", "apns", "android", "fcm", "web"] },
                deviceName: { type: "string" },
              },
              required: ["token", "platform"],
            },
          },
        },
      },
      responses: {
        "200": { description: "Subscribed", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
      },
    },
    delete: {
      tags: ["Notifications"],
      summary: "Unsubscribe from push notifications",
      description: "Unsubscribe a device from push notifications",
      operationId: "unsubscribeNotifications",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "token", in: "query", required: true, description: "Device token", schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "Unsubscribed", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
      },
    },
  },

  // ==========================================================================
  // BILLING
  // ==========================================================================
  "/api/billing/checkout": {
    post: {
      tags: ["Billing"],
      summary: "Create checkout session",
      description: "Create a Stripe checkout session for subscription",
      operationId: "createCheckoutSession",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Checkout session created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sessionId: { type: "string" },
                  url: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/billing/portal": {
    post: {
      tags: ["Billing"],
      summary: "Create portal session",
      description: "Create a Stripe customer portal session",
      operationId: "createPortalSession",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Portal session created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/billing/invoices": {
    get: {
      tags: ["Billing"],
      summary: "List invoices",
      description: "Get invoice history for the household",
      operationId: "listInvoices",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "List of invoices",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  invoices: { type: "array", items: { $ref: "#/components/schemas/Invoice" } },
                  hasMore: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
  },
}

// =============================================================================
// FULL OPENAPI SPECIFICATION
// =============================================================================

export function getOpenAPISpec(): OpenAPISpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "FamilyLoad API",
      description:
        "API for FamilyLoad - the parental mental load management application. " +
        "Manage tasks, children, households, and notifications.",
      version: API_VERSION,
      contact: {
        name: "FamilyLoad Support",
        email: "support@familyload.fr",
        url: BASE_URL,
      },
      license: {
        name: "Proprietary",
        url: `${BASE_URL}/terms`,
      },
    },
    servers: [
      {
        url: BASE_URL,
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Tasks", description: "Task management endpoints" },
      { name: "Mobile", description: "Mobile-specific endpoints" },
      { name: "Notifications", description: "Push notification management" },
      { name: "Billing", description: "Subscription and billing management" },
    ],
    paths: apiPaths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from Cognito authentication",
        },
      },
      schemas: commonSchemas,
    },
  }
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: "auth_required",
  AUTH_INVALID_TOKEN: "auth_invalid_token",
  AUTH_EXPIRED_TOKEN: "auth_expired_token",

  // Validation errors
  VALIDATION_ERROR: "validation_error",
  INVALID_INPUT: "invalid_input",
  MISSING_FIELD: "missing_field",

  // Resource errors
  NOT_FOUND: "not_found",
  ALREADY_EXISTS: "already_exists",
  CONFLICT: "conflict",

  // Permission errors
  FORBIDDEN: "forbidden",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",

  // Rate limiting
  RATE_LIMITED: "rate_limited",
  TOO_MANY_REQUESTS: "too_many_requests",

  // Server errors
  INTERNAL_ERROR: "internal_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  DATABASE_ERROR: "database_error",

  // Billing errors
  PAYMENT_REQUIRED: "payment_required",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  INVALID_SUBSCRIPTION: "invalid_subscription",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// =============================================================================
// RATE LIMITS
// =============================================================================

export const RATE_LIMITS = {
  // Per-user limits (requests per minute)
  default: 60,
  auth: 10,
  voice: 30,
  sync: 10,

  // Per-IP limits for public endpoints
  publicEndpoints: 20,
  signup: 5,
  login: 10,
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS
