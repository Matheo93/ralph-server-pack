/**
 * OpenAPI Schema Definitions
 *
 * Provides OpenAPI 3.1 specification for the FamilyLoad API.
 * Includes comprehensive endpoint documentation, request/response schemas,
 * error codes, and examples.
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
  default?: unknown
}

interface OpenAPIResponse {
  description: string
  content?: {
    "application/json": {
      schema: OpenAPISchema | { $ref: string }
      example?: unknown
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
      "application/json"?: {
        schema: OpenAPISchema | { $ref: string }
        example?: unknown
      }
      "multipart/form-data"?: {
        schema: OpenAPISchema | { $ref: string }
      }
    }
  }
  responses: Record<string, OpenAPIResponse>
  parameters?: OpenAPIParameter[]
  deprecated?: boolean
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
const API_VERSION = "1.1.0"

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const commonSchemas: Record<string, OpenAPISchema> = {
  Error: {
    type: "object",
    properties: {
      error: { type: "string", description: "Error message" },
      code: {
        type: "string",
        description: "Error code",
        enum: [
          "auth_required",
          "auth_invalid_token",
          "validation_error",
          "not_found",
          "forbidden",
          "rate_limited",
          "internal_error",
        ],
      },
      details: { type: "object", description: "Additional error details" },
    },
    required: ["error"],
    example: { error: "Authentication required", code: "auth_required" },
  },
  Success: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string" },
    },
    required: ["success"],
    example: { success: true, message: "Operation completed successfully" },
  },
  PaginatedResponse: {
    type: "object",
    properties: {
      data: { type: "array", items: { type: "object" } },
      pagination: {
        type: "object",
        properties: {
          total: { type: "integer", description: "Total count" },
          page: { type: "integer", description: "Current page" },
          limit: { type: "integer", description: "Items per page" },
          hasMore: { type: "boolean", description: "Has more pages" },
        },
      },
    },
  },
  Task: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      title: { type: "string", description: "Task title", example: "Préparer le petit-déjeuner" },
      description: { type: "string", description: "Task description", nullable: true },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "completed", "overdue"],
        example: "pending",
      },
      priority: {
        type: "string",
        enum: ["low", "normal", "high", "urgent"],
        example: "normal",
      },
      category: {
        type: "string",
        enum: ["alimentation", "sante", "education", "logistique", "social", "administratif"],
        nullable: true,
      },
      dueDate: { type: "string", format: "date-time", nullable: true },
      assignedTo: { type: "string", format: "uuid", nullable: true },
      childId: { type: "string", format: "uuid", nullable: true },
      householdId: { type: "string", format: "uuid" },
      loadWeight: { type: "integer", minimum: 1, maximum: 5, description: "Mental load weight" },
      isRecurring: { type: "boolean" },
      recurrenceRule: { type: "string", nullable: true, description: "RRULE format" },
      completedAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "title", "status", "householdId", "createdAt"],
    example: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Préparer le petit-déjeuner",
      status: "pending",
      priority: "normal",
      category: "alimentation",
      loadWeight: 2,
      householdId: "550e8400-e29b-41d4-a716-446655440001",
      createdAt: "2024-01-15T08:00:00Z",
    },
  },
  TaskCreate: {
    type: "object",
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task description" },
      dueDate: { type: "string", format: "date-time" },
      assignedTo: { type: "string", format: "uuid" },
      childId: { type: "string", format: "uuid" },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
      category: { type: "string" },
      loadWeight: { type: "integer", minimum: 1, maximum: 5 },
      recurrenceRule: { type: "string", description: "RRULE format for recurring tasks" },
    },
    required: ["title"],
    example: {
      title: "Rendez-vous dentiste",
      dueDate: "2024-01-20T14:00:00Z",
      childId: "550e8400-e29b-41d4-a716-446655440002",
      priority: "high",
      category: "sante",
      loadWeight: 3,
    },
  },
  Child: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Emma" },
      birthDate: { type: "string", format: "date", nullable: true },
      avatar: { type: "string", nullable: true },
      color: { type: "string", description: "Display color", example: "#FF6B6B" },
      householdId: { type: "string", format: "uuid" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "householdId"],
    example: {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Emma",
      birthDate: "2018-05-15",
      color: "#FF6B6B",
      householdId: "550e8400-e29b-41d4-a716-446655440001",
    },
  },
  Household: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Famille Dupont" },
      subscriptionStatus: {
        type: "string",
        enum: ["active", "trial", "past_due", "cancelled"],
        example: "active",
      },
      plan: {
        type: "string",
        enum: ["free", "premium", "family"],
        example: "premium",
      },
      trialEndsAt: { type: "string", format: "date-time", nullable: true },
      memberCount: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "subscriptionStatus"],
  },
  User: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      name: { type: "string", example: "Jean Dupont" },
      avatar: { type: "string", nullable: true },
      role: { type: "string", enum: ["owner", "co_parent", "viewer"] },
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
      amountDue: { type: "integer", description: "Amount in cents", example: 999 },
      amountPaid: { type: "integer", description: "Amount in cents", example: 999 },
      currency: { type: "string", example: "eur" },
      invoicePdf: { type: "string", nullable: true },
      hostedInvoiceUrl: { type: "string", nullable: true },
      periodStart: { type: "string", format: "date-time", nullable: true },
      periodEnd: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "status", "amountDue", "amountPaid", "currency"],
  },
  VoiceAnalysis: {
    type: "object",
    properties: {
      transcript: { type: "string", description: "Transcribed text" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      suggestedTasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            priority: { type: "string" },
            suggestedDueDate: { type: "string", format: "date-time" },
          },
        },
      },
      language: { type: "string", example: "fr" },
    },
  },
  StreakStatus: {
    type: "object",
    properties: {
      currentStreak: { type: "integer", example: 7 },
      longestStreak: { type: "integer", example: 14 },
      todayCompleted: { type: "boolean" },
      lastActivityDate: { type: "string", format: "date" },
      nextMilestone: { type: "integer", example: 10 },
    },
  },
  DistributionStats: {
    type: "object",
    properties: {
      totalTasks: { type: "integer" },
      distribution: {
        type: "array",
        items: {
          type: "object",
          properties: {
            userId: { type: "string", format: "uuid" },
            name: { type: "string" },
            taskCount: { type: "integer" },
            loadWeight: { type: "number" },
            percentage: { type: "number" },
          },
        },
      },
      isBalanced: { type: "boolean" },
      recommendation: { type: "string" },
    },
  },
  Template: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      tasks: {
        type: "array",
        items: { $ref: "#/components/schemas/TaskCreate" },
      },
      isBuiltIn: { type: "boolean" },
    },
  },
}

// =============================================================================
// API PATHS
// =============================================================================

export const apiPaths: Record<string, OpenAPIPath> = {
  // ==========================================================================
  // V1 API - TASKS
  // ==========================================================================
  "/api/v1/tasks": {
    get: {
      tags: ["Tasks"],
      summary: "List tasks",
      description:
        "Get all tasks for the authenticated user's household. Supports filtering by status, category, child, and date range.",
      operationId: "listTasks",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by task status",
          schema: { type: "string", enum: ["pending", "in_progress", "completed", "overdue"] },
        },
        {
          name: "category",
          in: "query",
          description: "Filter by category",
          schema: { type: "string" },
        },
        {
          name: "childId",
          in: "query",
          description: "Filter by child ID",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "assignedTo",
          in: "query",
          description: "Filter by assignee",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "from",
          in: "query",
          description: "Filter tasks due after this date",
          schema: { type: "string", format: "date" },
        },
        {
          name: "to",
          in: "query",
          description: "Filter tasks due before this date",
          schema: { type: "string", format: "date" },
        },
        {
          name: "limit",
          in: "query",
          description: "Max number of results (default: 50, max: 100)",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        },
        {
          name: "offset",
          in: "query",
          description: "Number of items to skip for pagination",
          schema: { type: "integer", minimum: 0, default: 0 },
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
                  total: { type: "integer" },
                  hasMore: { type: "boolean" },
                },
              },
              example: {
                tasks: [
                  {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    title: "Préparer le petit-déjeuner",
                    status: "pending",
                    priority: "normal",
                  },
                ],
                total: 25,
                hasMore: true,
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        "429": {
          description: "Rate limit exceeded",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    post: {
      tags: ["Tasks"],
      summary: "Create task",
      description: "Create a new task in the household",
      operationId: "createTask",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskCreate" },
            example: {
              title: "Rendez-vous pédiatre",
              dueDate: "2024-01-20T10:00:00Z",
              childId: "550e8400-e29b-41d4-a716-446655440002",
              priority: "high",
              category: "sante",
              loadWeight: 3,
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Task created",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
        },
        "400": {
          description: "Invalid input",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        "401": {
          description: "Unauthorized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },
  "/api/v1/tasks/{id}": {
    get: {
      tags: ["Tasks"],
      summary: "Get task",
      description: "Get a specific task by ID",
      operationId: "getTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Task ID",
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Task details",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
        },
        "404": {
          description: "Task not found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    patch: {
      tags: ["Tasks"],
      summary: "Update task",
      description: "Update a task's details",
      operationId: "updateTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Task ID",
          schema: { type: "string", format: "uuid" },
        },
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
                status: { type: "string", enum: ["pending", "in_progress", "completed"] },
                dueDate: { type: "string", format: "date-time" },
                assignedTo: { type: "string", format: "uuid" },
                priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
                loadWeight: { type: "integer", minimum: 1, maximum: 5 },
              },
            },
            example: { status: "completed" },
          },
        },
      },
      responses: {
        "200": {
          description: "Task updated",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
        },
        "404": {
          description: "Task not found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    delete: {
      tags: ["Tasks"],
      summary: "Delete task",
      description: "Delete a task",
      operationId: "deleteTask",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Task ID",
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Task deleted",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
        "404": {
          description: "Task not found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
  },

  // ==========================================================================
  // V1 API - CHILDREN
  // ==========================================================================
  "/api/v1/children": {
    get: {
      tags: ["Children"],
      summary: "List children",
      description: "Get all children in the household",
      operationId: "listChildren",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "List of children",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    post: {
      tags: ["Children"],
      summary: "Add child",
      description: "Add a child to the household",
      operationId: "addChild",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                birthDate: { type: "string", format: "date" },
                color: { type: "string" },
              },
              required: ["name"],
            },
            example: { name: "Lucas", birthDate: "2020-03-15", color: "#4ECDC4" },
          },
        },
      },
      responses: {
        "201": {
          description: "Child added",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Child" } } },
        },
      },
    },
  },
  "/api/v1/children/{id}": {
    get: {
      tags: ["Children"],
      summary: "Get child",
      description: "Get a specific child by ID",
      operationId: "getChild",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Child ID",
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Child details",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Child" } } },
        },
        "404": {
          description: "Child not found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    patch: {
      tags: ["Children"],
      summary: "Update child",
      description: "Update child details",
      operationId: "updateChild",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Child ID",
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                birthDate: { type: "string", format: "date" },
                color: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Child updated",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Child" } } },
        },
      },
    },
    delete: {
      tags: ["Children"],
      summary: "Remove child",
      description: "Remove a child from the household",
      operationId: "removeChild",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Child ID",
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Child removed",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
      },
    },
  },

  // ==========================================================================
  // V1 API - HOUSEHOLD
  // ==========================================================================
  "/api/v1/household": {
    get: {
      tags: ["Household"],
      summary: "Get household",
      description: "Get the current user's household details",
      operationId: "getHousehold",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Household details",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Household" } } },
        },
      },
    },
  },

  // ==========================================================================
  // V1 API - SYNC
  // ==========================================================================
  "/api/v1/sync": {
    get: {
      tags: ["Sync"],
      summary: "Sync data",
      description:
        "Get all data for offline sync. Use the 'since' parameter for incremental sync.",
      operationId: "syncData",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "since",
          in: "query",
          description: "ISO timestamp for incremental sync",
          schema: { type: "string", format: "date-time" },
        },
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
                  deletedIds: {
                    type: "object",
                    properties: {
                      tasks: { type: "array", items: { type: "string" } },
                      children: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // VOICE API
  // ==========================================================================
  "/api/voice/transcribe": {
    post: {
      tags: ["Voice"],
      summary: "Transcribe audio",
      description: "Transcribe audio to text using speech-to-text",
      operationId: "transcribeAudio",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                audio: { type: "string", format: "binary", description: "Audio file (webm, wav, mp3)" },
                language: { type: "string", description: "Language code (default: fr)" },
              },
              required: ["audio"],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Transcription result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  transcript: { type: "string" },
                  confidence: { type: "number" },
                  language: { type: "string" },
                },
              },
              example: {
                transcript: "Je dois emmener Emma chez le dentiste demain à 14h",
                confidence: 0.95,
                language: "fr",
              },
            },
          },
        },
      },
    },
  },
  "/api/voice/analyze": {
    post: {
      tags: ["Voice"],
      summary: "Analyze text for tasks",
      description: "Analyze transcribed text to extract task information using AI",
      operationId: "analyzeText",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                text: { type: "string", description: "Text to analyze" },
                context: {
                  type: "object",
                  description: "Context about household (children names, categories)",
                },
              },
              required: ["text"],
            },
            example: { text: "Emmener Emma chez le dentiste demain à 14h" },
          },
        },
      },
      responses: {
        "200": {
          description: "Analysis result",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VoiceAnalysis" },
              example: {
                suggestedTasks: [
                  {
                    title: "Rendez-vous dentiste Emma",
                    category: "sante",
                    priority: "normal",
                    suggestedDueDate: "2024-01-16T14:00:00Z",
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/voice/create-task": {
    post: {
      tags: ["Voice"],
      summary: "Create task from voice",
      description: "One-step task creation from audio recording",
      operationId: "createTaskFromVoice",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                audio: { type: "string", format: "binary" },
                autoCreate: { type: "boolean", description: "Auto-create without confirmation" },
              },
              required: ["audio"],
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Task(s) created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  transcript: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // STREAK API
  // ==========================================================================
  "/api/streak/status": {
    get: {
      tags: ["Gamification"],
      summary: "Get streak status",
      description: "Get current user's streak status and statistics",
      operationId: "getStreakStatus",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Streak status",
          content: { "application/json": { schema: { $ref: "#/components/schemas/StreakStatus" } } },
        },
      },
    },
  },
  "/api/streak/validate": {
    post: {
      tags: ["Gamification"],
      summary: "Validate today's streak",
      description: "Mark today as completed for streak tracking",
      operationId: "validateStreak",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Streak validated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  currentStreak: { type: "integer" },
                  milestone: { type: "boolean", description: "True if milestone reached" },
                  milestoneType: { type: "string", description: "Milestone type if reached" },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // DISTRIBUTION API
  // ==========================================================================
  "/api/distribution/stats": {
    get: {
      tags: ["Distribution"],
      summary: "Get distribution stats",
      description: "Get task distribution statistics across household members",
      operationId: "getDistributionStats",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "period",
          in: "query",
          description: "Time period for statistics",
          schema: { type: "string", enum: ["week", "month", "quarter"], default: "month" },
        },
      ],
      responses: {
        "200": {
          description: "Distribution statistics",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/DistributionStats" } },
          },
        },
      },
    },
  },
  "/api/distribution/balance": {
    post: {
      tags: ["Distribution"],
      summary: "Suggest balance",
      description: "Get AI suggestions for balancing task distribution",
      operationId: "suggestBalance",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Balance suggestions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        taskId: { type: "string" },
                        fromUser: { type: "string" },
                        toUser: { type: "string" },
                        reason: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // CATALOG API
  // ==========================================================================
  "/api/catalog/templates": {
    get: {
      tags: ["Catalog"],
      summary: "List templates",
      description: "Get available task templates",
      operationId: "listTemplates",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "category",
          in: "query",
          description: "Filter by category",
          schema: { type: "string" },
        },
        {
          name: "childAge",
          in: "query",
          description: "Filter by child age range",
          schema: { type: "string", enum: ["0-2", "3-5", "6-10", "11-14", "15+"] },
        },
      ],
      responses: {
        "200": {
          description: "List of templates",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  templates: { type: "array", items: { $ref: "#/components/schemas/Template" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/catalog/generate": {
    post: {
      tags: ["Catalog"],
      summary: "Generate tasks from template",
      description: "Generate tasks in household from a template",
      operationId: "generateFromTemplate",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                templateId: { type: "string", format: "uuid" },
                childId: { type: "string", format: "uuid" },
                startDate: { type: "string", format: "date" },
              },
              required: ["templateId"],
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Tasks generated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  count: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/catalog/suggestions": {
    get: {
      tags: ["Catalog"],
      summary: "Get AI suggestions",
      description: "Get AI-powered task suggestions based on household context",
      operationId: "getSuggestions",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Task suggestions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reason: { type: "string" },
                        category: { type: "string" },
                        childId: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                plan: { type: "string", enum: ["premium", "family"] },
                successUrl: { type: "string", format: "uri" },
                cancelUrl: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
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
      description: "Create a Stripe customer portal session for subscription management",
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
  "/api/billing/status": {
    get: {
      tags: ["Billing"],
      summary: "Get billing status",
      description: "Get current subscription status",
      operationId: "getBillingStatus",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Billing status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["active", "trial", "past_due", "cancelled"] },
                  plan: { type: "string" },
                  trialEndsAt: { type: "string", format: "date-time", nullable: true },
                  currentPeriodEnd: { type: "string", format: "date-time", nullable: true },
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
      parameters: [
        {
          name: "limit",
          in: "query",
          description: "Max number of invoices to return",
          schema: { type: "integer", default: 10, maximum: 100 },
        },
      ],
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

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  "/api/notifications/subscribe": {
    post: {
      tags: ["Notifications"],
      summary: "Subscribe to push notifications",
      description: "Register a device for push notifications",
      operationId: "subscribeNotifications",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                token: { type: "string", description: "Push notification token" },
                platform: { type: "string", enum: ["ios", "android", "web"] },
                deviceName: { type: "string" },
              },
              required: ["token", "platform"],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Subscribed",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
      },
    },
    delete: {
      tags: ["Notifications"],
      summary: "Unsubscribe from push notifications",
      description: "Unregister a device from push notifications",
      operationId: "unsubscribeNotifications",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          description: "Device token to unregister",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "Unsubscribed",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
      },
    },
  },
  "/api/notifications/preferences": {
    get: {
      tags: ["Notifications"],
      summary: "Get notification preferences",
      description: "Get user's notification preferences",
      operationId: "getNotificationPreferences",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Notification preferences",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  taskReminders: { type: "boolean" },
                  dailyDigest: { type: "boolean" },
                  weeklyReport: { type: "boolean" },
                  balanceAlerts: { type: "boolean" },
                  streakReminders: { type: "boolean" },
                  quietHoursStart: { type: "string", format: "time" },
                  quietHoursEnd: { type: "string", format: "time" },
                },
              },
            },
          },
        },
      },
    },
    patch: {
      tags: ["Notifications"],
      summary: "Update notification preferences",
      description: "Update user's notification preferences",
      operationId: "updateNotificationPreferences",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                taskReminders: { type: "boolean" },
                dailyDigest: { type: "boolean" },
                weeklyReport: { type: "boolean" },
                balanceAlerts: { type: "boolean" },
                streakReminders: { type: "boolean" },
                quietHoursStart: { type: "string", format: "time" },
                quietHoursEnd: { type: "string", format: "time" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Preferences updated",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
      },
    },
  },

  // ==========================================================================
  // GDPR
  // ==========================================================================
  "/api/gdpr/export": {
    post: {
      tags: ["GDPR"],
      summary: "Export user data",
      description: "Request export of all user data (GDPR Article 20)",
      operationId: "exportUserData",
      security: [{ bearerAuth: [] }],
      responses: {
        "202": {
          description: "Export initiated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  requestId: { type: "string" },
                  estimatedTime: { type: "string", description: "Estimated completion time" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/gdpr/delete": {
    post: {
      tags: ["GDPR"],
      summary: "Delete user data",
      description: "Request deletion of all user data (GDPR Article 17)",
      operationId: "deleteUserData",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                confirmation: { type: "string", description: "Must be 'DELETE_MY_DATA'" },
              },
              required: ["confirmation"],
            },
          },
        },
      },
      responses: {
        "202": {
          description: "Deletion initiated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  requestId: { type: "string" },
                  scheduledDeletion: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/gdpr/anonymize": {
    post: {
      tags: ["GDPR"],
      summary: "Anonymize user data",
      description: "Anonymize user data while keeping aggregated statistics",
      operationId: "anonymizeUserData",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Data anonymized",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
        },
      },
    },
  },

  // ==========================================================================
  // HEALTH
  // ==========================================================================
  "/api/health": {
    get: {
      tags: ["System"],
      summary: "Health check",
      description: "Check API health status",
      operationId: "healthCheck",
      responses: {
        "200": {
          description: "Health status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
                  version: { type: "string" },
                  timestamp: { type: "string", format: "date-time" },
                  services: {
                    type: "object",
                    properties: {
                      database: { type: "string" },
                      cache: { type: "string" },
                      storage: { type: "string" },
                    },
                  },
                },
              },
              example: {
                status: "healthy",
                version: "1.1.0",
                timestamp: "2024-01-15T10:00:00Z",
                services: { database: "healthy", cache: "healthy", storage: "healthy" },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // METRICS
  // ==========================================================================
  "/api/metrics": {
    get: {
      tags: ["System"],
      summary: "Get metrics",
      description: "Get system metrics (Prometheus format)",
      operationId: "getMetrics",
      responses: {
        "200": {
          description: "Metrics",
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // MOBILE
  // ==========================================================================
  "/api/mobile/health": {
    get: {
      tags: ["Mobile"],
      summary: "Mobile health check",
      description: "Check API health and minimum app version",
      operationId: "mobileHealthCheck",
      responses: {
        "200": {
          description: "Health status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  version: { type: "string" },
                  minAppVersion: { type: "string", description: "Minimum required app version" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },
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
                platform: { type: "string", enum: ["ios", "android"] },
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
        "200": {
          description: "Device registered",
          content: { "application/json": { schema: { $ref: "#/components/schemas/DeviceToken" } } },
        },
      },
    },
  },
  "/api/mobile/sync": {
    get: {
      tags: ["Mobile"],
      summary: "Mobile sync",
      description: "Get all data for mobile offline sync",
      operationId: "mobileSync",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "since",
          in: "query",
          description: "ISO timestamp for incremental sync",
          schema: { type: "string", format: "date-time" },
        },
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

  // ==========================================================================
  // EXPORT
  // ==========================================================================
  "/api/export/pdf": {
    post: {
      tags: ["Export"],
      summary: "Export to PDF",
      description: "Generate a PDF report of tasks",
      operationId: "exportPdf",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                period: { type: "string", enum: ["week", "month", "year"] },
                includeCompleted: { type: "boolean" },
                childId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "PDF generated",
          content: {
            "application/pdf": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
      },
    },
  },
  "/api/export/data": {
    get: {
      tags: ["Export"],
      summary: "Export data",
      description: "Export household data as JSON or CSV",
      operationId: "exportData",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "format",
          in: "query",
          description: "Export format",
          schema: { type: "string", enum: ["json", "csv"], default: "json" },
        },
      ],
      responses: {
        "200": {
          description: "Data export",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  children: { type: "array", items: { $ref: "#/components/schemas/Child" } },
                  household: { $ref: "#/components/schemas/Household" },
                  exportedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
      },
    },
  },

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================
  "/api/analytics": {
    get: {
      tags: ["Analytics"],
      summary: "Get analytics",
      description: "Get household analytics and statistics",
      operationId: "getAnalytics",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "period",
          in: "query",
          description: "Time period",
          schema: { type: "string", enum: ["week", "month", "quarter", "year"], default: "month" },
        },
      ],
      responses: {
        "200": {
          description: "Analytics data",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasksCompleted: { type: "integer" },
                  tasksCreated: { type: "integer" },
                  completionRate: { type: "number" },
                  averageLoadWeight: { type: "number" },
                  distribution: { $ref: "#/components/schemas/DistributionStats" },
                  streak: { $ref: "#/components/schemas/StreakStatus" },
                  trends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", format: "date" },
                        completed: { type: "integer" },
                        created: { type: "integer" },
                      },
                    },
                  },
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
      description: `
# FamilyLoad API

Welcome to the FamilyLoad API documentation. FamilyLoad is a parental mental load management application that helps families organize tasks, track responsibilities, and maintain balance.

## Authentication

Most endpoints require authentication using a Bearer token. Obtain a token by authenticating with Cognito.

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Rate Limiting

API requests are rate limited:
- **Standard endpoints**: 60 requests/minute per user
- **Authentication**: 10 requests/minute per IP
- **Voice endpoints**: 30 requests/minute per user

## Versioning

The API is versioned. Current version: **v1**

Base URL: \`${BASE_URL}/api/v1\`

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "error": "Human-readable error message",
  "code": "error_code",
  "details": {}
}
\`\`\`

## Pagination

List endpoints support pagination with \`limit\` and \`offset\` parameters:

\`\`\`
GET /api/v1/tasks?limit=20&offset=40
\`\`\`

## WebSocket Support

Real-time updates are available via WebSocket at \`/api/realtime/subscribe\`.
      `.trim(),
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
        url: "https://staging.familyload.fr",
        description: "Staging server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Tasks", description: "Task management - create, update, delete, and list tasks" },
      { name: "Children", description: "Child management - add and manage children in household" },
      { name: "Household", description: "Household settings and member management" },
      { name: "Voice", description: "Voice-to-task functionality using speech recognition and AI" },
      { name: "Gamification", description: "Streak tracking and achievements" },
      { name: "Distribution", description: "Task distribution and balance analysis" },
      { name: "Catalog", description: "Task templates and AI suggestions" },
      { name: "Billing", description: "Subscription and billing management via Stripe" },
      { name: "Notifications", description: "Push notification management" },
      { name: "GDPR", description: "Data privacy and GDPR compliance endpoints" },
      { name: "Export", description: "Data export functionality" },
      { name: "Analytics", description: "Statistics and analytics" },
      { name: "Mobile", description: "Mobile app specific endpoints" },
      { name: "Sync", description: "Offline sync functionality" },
      { name: "System", description: "Health checks and system status" },
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
  AUTH_INSUFFICIENT_SCOPE: "auth_insufficient_scope",

  // Validation errors
  VALIDATION_ERROR: "validation_error",
  INVALID_INPUT: "invalid_input",
  MISSING_FIELD: "missing_field",
  INVALID_FORMAT: "invalid_format",

  // Resource errors
  NOT_FOUND: "not_found",
  ALREADY_EXISTS: "already_exists",
  CONFLICT: "conflict",
  RESOURCE_LOCKED: "resource_locked",

  // Permission errors
  FORBIDDEN: "forbidden",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",
  HOUSEHOLD_ACCESS_DENIED: "household_access_denied",

  // Rate limiting
  RATE_LIMITED: "rate_limited",
  TOO_MANY_REQUESTS: "too_many_requests",
  QUOTA_EXCEEDED: "quota_exceeded",

  // Server errors
  INTERNAL_ERROR: "internal_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  DATABASE_ERROR: "database_error",
  EXTERNAL_SERVICE_ERROR: "external_service_error",

  // Billing errors
  PAYMENT_REQUIRED: "payment_required",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  INVALID_SUBSCRIPTION: "invalid_subscription",
  TRIAL_EXPIRED: "trial_expired",

  // Voice errors
  TRANSCRIPTION_FAILED: "transcription_failed",
  ANALYSIS_FAILED: "analysis_failed",
  AUDIO_TOO_LONG: "audio_too_long",
  UNSUPPORTED_FORMAT: "unsupported_format",
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
  export: 5,
  analytics: 20,

  // Per-IP limits for public endpoints
  publicEndpoints: 20,
  signup: 5,
  login: 10,
  passwordReset: 3,
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS
