"use client"

/**
 * API Documentation Client Component
 *
 * Renders an interactive API documentation explorer.
 * Fetches OpenAPI spec and displays categorized endpoints.
 */

import { useEffect, useState } from "react"

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    description: string
    version: string
  }
  paths: Record<string, PathItem>
  components?: {
    schemas?: Record<string, SchemaObject>
  }
}

interface PathItem {
  get?: OperationObject
  post?: OperationObject
  put?: OperationObject
  patch?: OperationObject
  delete?: OperationObject
}

interface OperationObject {
  tags?: string[]
  summary: string
  description?: string
  operationId: string
  parameters?: ParameterObject[]
  requestBody?: RequestBodyObject
  responses: Record<string, ResponseObject>
  security?: Array<Record<string, string[]>>
}

interface ParameterObject {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: SchemaObject
}

interface RequestBodyObject {
  required?: boolean
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>
}

interface ResponseObject {
  description: string
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>
}

interface SchemaObject {
  type?: string
  properties?: Record<string, SchemaObject>
  items?: SchemaObject
  $ref?: string
  description?: string
  example?: unknown
  enum?: string[]
  format?: string
  required?: string[]
}

const METHOD_COLORS: Record<string, string> = {
  get: "bg-blue-500",
  post: "bg-green-500",
  put: "bg-amber-500",
  patch: "bg-orange-500",
  delete: "bg-red-500",
}

const METHOD_BG_COLORS: Record<string, string> = {
  get: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  post: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  put: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
  patch: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
  delete: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
}

export function ApiDocsClient() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSpec() {
      try {
        const response = await fetch("/api/docs")
        if (!response.ok) {
          throw new Error("Impossible de charger la documentation")
        }
        const data = await response.json()
        setSpec(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      } finally {
        setLoading(false)
      }
    }
    fetchSpec()
  }, [])

  const togglePath = (pathKey: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(pathKey)) {
        next.delete(pathKey)
      } else {
        next.add(pathKey)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !spec) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">{error ?? "Documentation non disponible"}</p>
      </div>
    )
  }

  // Extract unique tags
  const allTags = new Set<string>()
  Object.values(spec.paths).forEach((pathItem) => {
    const methods = ["get", "post", "put", "patch", "delete"] as const
    methods.forEach((method) => {
      const operation = pathItem[method]
      if (operation?.tags) {
        operation.tags.forEach((tag) => allTags.add(tag))
      }
    })
  })
  const tags = Array.from(allTags).sort()

  // Filter paths based on search and tag
  const filteredPaths = Object.entries(spec.paths).filter(([path, pathItem]) => {
    const methods = ["get", "post", "put", "patch", "delete"] as const
    const matchesSearch = searchQuery === "" || path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      methods.some((method) => {
        const op = pathItem[method]
        return op?.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      })

    const matchesTag = !selectedTag || methods.some((method) => {
      const op = pathItem[method]
      return op?.tags?.includes(selectedTag)
    })

    return matchesSearch && matchesTag
  })

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un endpoint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedTag
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Tous
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tag === selectedTag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {filteredPaths.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-muted-foreground">Aucun endpoint trouvé</p>
          </div>
        ) : (
          filteredPaths.map(([path, pathItem]) => {
            const methods = ["get", "post", "put", "patch", "delete"] as const
            return methods
              .filter((method) => pathItem[method])
              .map((method) => {
                const operation = pathItem[method]!
                const pathKey = `${method}-${path}`
                const isExpanded = expandedPaths.has(pathKey)
                const requiresAuth = operation.security && operation.security.length > 0

                return (
                  <div
                    key={pathKey}
                    id={operation.tags?.[0]?.toLowerCase()}
                    className={`rounded-lg border ${METHOD_BG_COLORS[method]}`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => togglePath(pathKey)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold uppercase text-white ${METHOD_COLORS[method]}`}
                      >
                        {method}
                      </span>
                      <code className="flex-1 font-mono text-sm">{path}</code>
                      {requiresAuth && (
                        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                          Auth
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {operation.summary}
                      </span>
                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t p-4">
                        {/* Description */}
                        {operation.description && (
                          <p className="mb-4 text-sm text-muted-foreground">
                            {operation.description}
                          </p>
                        )}

                        {/* Tags */}
                        {operation.tags && operation.tags.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {operation.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Parameters */}
                        {operation.parameters && operation.parameters.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 text-sm font-medium">Paramètres</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left">
                                    <th className="pb-2 pr-4 font-medium">Nom</th>
                                    <th className="pb-2 pr-4 font-medium">Emplacement</th>
                                    <th className="pb-2 pr-4 font-medium">Type</th>
                                    <th className="pb-2 font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {operation.parameters.map((param, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="py-2 pr-4">
                                        <code className="text-xs">
                                          {param.name}
                                          {param.required && (
                                            <span className="text-red-500">*</span>
                                          )}
                                        </code>
                                      </td>
                                      <td className="py-2 pr-4 text-muted-foreground">
                                        {param.in}
                                      </td>
                                      <td className="py-2 pr-4 text-muted-foreground">
                                        {param.schema?.type}
                                        {param.schema?.enum && (
                                          <span className="ml-1 text-xs">
                                            ({param.schema.enum.join(", ")})
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 text-muted-foreground">
                                        {param.description}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {operation.requestBody && (
                          <div className="mb-4">
                            <h4 className="mb-2 text-sm font-medium">
                              Corps de la requête
                              {operation.requestBody.required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </h4>
                            {operation.requestBody.content?.["application/json"]?.example !== undefined && (
                              <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
                                <code>
                                  {JSON.stringify(
                                    operation.requestBody.content["application/json"].example as Record<string, unknown>,
                                    null,
                                    2
                                  )}
                                </code>
                              </pre>
                            )}
                          </div>
                        )}

                        {/* Responses */}
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Réponses</h4>
                          <div className="space-y-2">
                            {Object.entries(operation.responses).map(
                              ([code, response]) => (
                                <div
                                  key={code}
                                  className="rounded border bg-background p-3"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                                        code.startsWith("2")
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                          : code.startsWith("4")
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      }`}
                                    >
                                      {code}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {response.description}
                                    </span>
                                  </div>
                                  {response.content?.["application/json"]?.example !== undefined && (
                                    <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                                      <code>
                                        {JSON.stringify(
                                          response.content["application/json"].example as Record<string, unknown>,
                                          null,
                                          2
                                        )}
                                      </code>
                                    </pre>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          })
        )}
      </div>

      {/* Schemas Section */}
      {spec.components?.schemas && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Schémas de données</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(spec.components.schemas).map(([name, schema]) => (
              <div key={name} className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 font-mono text-sm font-medium">{name}</h3>
                {schema.description && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    {schema.description}
                  </p>
                )}
                {schema.properties && (
                  <div className="space-y-1">
                    {Object.entries(schema.properties).slice(0, 5).map(([prop, propSchema]) => (
                      <div key={prop} className="flex items-center gap-2 text-xs">
                        <code className="text-primary">{prop}</code>
                        <span className="text-muted-foreground">
                          {propSchema.type ?? propSchema.$ref?.split("/").pop()}
                        </span>
                        {schema.required?.includes(prop) && (
                          <span className="text-red-500">*</span>
                        )}
                      </div>
                    ))}
                    {Object.keys(schema.properties).length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{Object.keys(schema.properties).length - 5} propriétés...
                      </p>
                    )}
                  </div>
                )}
                {schema.example !== undefined && (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                    <code>{JSON.stringify(schema.example as Record<string, unknown>, null, 2)}</code>
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
