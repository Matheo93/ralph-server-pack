/**
 * API Documentation Page
 *
 * Interactive API documentation using Swagger UI.
 * Loads OpenAPI spec from /api/docs endpoint.
 */

import { Metadata } from "next"
import { ApiDocsClient } from "./api-docs-client"

export const metadata: Metadata = {
  title: "API Documentation | FamilyLoad",
  description: "Documentation interactive de l'API FamilyLoad. Explorez les endpoints, testez les requêtes et intégrez l'API dans vos applications.",
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                FamilyLoad API
              </h1>
              <p className="mt-2 text-muted-foreground">
                Documentation interactive de l'API REST
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                v1.1.0
              </span>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                OpenAPI JSON
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <nav className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <ul className="flex flex-wrap gap-4 text-sm">
            <li>
              <a href="#tasks" className="text-muted-foreground hover:text-primary">
                Tâches
              </a>
            </li>
            <li>
              <a href="#children" className="text-muted-foreground hover:text-primary">
                Enfants
              </a>
            </li>
            <li>
              <a href="#household" className="text-muted-foreground hover:text-primary">
                Foyer
              </a>
            </li>
            <li>
              <a href="#voice" className="text-muted-foreground hover:text-primary">
                Voix
              </a>
            </li>
            <li>
              <a href="#notifications" className="text-muted-foreground hover:text-primary">
                Notifications
              </a>
            </li>
            <li>
              <a href="#billing" className="text-muted-foreground hover:text-primary">
                Facturation
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Pour commencer</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 text-lg font-medium">1. Authentification</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Obtenez un token JWT via Cognito pour accéder aux endpoints protégés.
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                <code>Authorization: Bearer &lt;token&gt;</code>
              </pre>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 text-lg font-medium">2. Base URL</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Utilisez l'URL de base pour toutes vos requêtes API.
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                <code>https://familyload.fr/api/v1</code>
              </pre>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-2 text-lg font-medium">3. Rate Limiting</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Respectez les limites de requêtes pour éviter les erreurs 429.
              </p>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                <code>60 req/min (standard)</code>
              </pre>
            </div>
          </div>
        </section>

        {/* API Explorer */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Explorateur API</h2>
          <ApiDocsClient />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 FamilyLoad. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="/mentions-legales" className="text-sm text-muted-foreground hover:text-primary">
                Mentions légales
              </a>
              <a href="/confidentialite" className="text-sm text-muted-foreground hover:text-primary">
                Confidentialité
              </a>
              <a href="mailto:support@familyload.fr" className="text-sm text-muted-foreground hover:text-primary">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
