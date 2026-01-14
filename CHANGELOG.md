# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

## [0.7.0] - 2026-01-14

### Ajouté

#### Phase 1: Progressive Web App (PWA)
- Manifest JSON complet avec icons, shortcuts et screenshots
- Icons PWA générés automatiquement (72px à 512px)
- Service Worker avec next-pwa et stratégies de cache optimisées
- Composant `InstallPrompt` avec détection iOS/Android
- Meta tags PWA dans le root layout

#### Phase 2: Analytics & Monitoring
- Service analytics multi-provider (`src/lib/analytics/index.ts`)
- Événements analytics typés (`src/lib/analytics/events.ts`)
- Composant `AnalyticsProvider` avec consentement RGPD
- API endpoint analytics avec rate limiting (`/api/analytics`)

#### Phase 3: Performance
- Composant `OptimizedImage` wrapper next/image
- Composant `AvatarImage` avec fallback initiales

#### Phase 4: Tests E2E Avancés
- Tests tâches (`e2e/tasks.spec.ts`)
- Tests vocal (`e2e/vocal.spec.ts`)
- Tests charge mentale (`e2e/charge.spec.ts`)
- Tests onboarding (`e2e/onboarding.spec.ts`)
- Fixtures et helpers (`e2e/fixtures/`, `e2e/helpers/`)

#### Phase 5: SEO & Accessibilité
- Sitemap dynamique (`src/app/sitemap.ts`)
- Robots.txt configuré (`src/app/robots.ts`)
- Viewport et meta tags optimisés

#### Phase 6: Error Handling
- Composant `ErrorBoundary` avec fallback élégant
- Page d'erreur globale (`src/app/error.tsx`)
- Health check endpoint (`/api/health`) avec vérification DB/Redis

### Modifié
- Root layout avec viewport et meta tags PWA
- Dashboard layout avec InstallPrompt
- .gitignore avec exclusions PWA et Playwright

## [0.6.0] - 2026-01-14

### Ajouté

#### Phase 1: Export PDF (RGPD)
- Service d'export des données du foyer (`src/lib/services/export.ts`)
- Templates PDF avec `@react-pdf/renderer`:
  - Rapport de charge mentale (`src/lib/templates/pdf/charge-report.tsx`)
  - Historique des tâches (`src/lib/templates/pdf/tasks-history.tsx`)
- API endpoint pour la génération PDF (`/api/export/pdf`)
- Composant `ExportButtons` avec dropdown pour sélection de période

#### Phase 2: Push Notifications (Firebase)
- Intégration Firebase Admin SDK pour FCM
- Service de messaging (`src/lib/firebase/messaging.ts`)
- Enregistrement des device tokens (`/api/notifications/register-token`)
- Schéma SQL pour device_tokens avec RLS
- Bouton test notification dans les paramètres

#### Phase 3: Internationalisation (i18n)
- Configuration `next-intl` pour FR/EN
- Fichiers de traduction (`src/messages/fr.json`, `src/messages/en.json`)
- Détection automatique de la locale (cookie + Accept-Language)
- Composant `LanguageSwitcher`

#### Phase 4: Tests E2E (Playwright)
- Configuration Playwright avec timeouts 30s
- Tests d'authentification (`e2e/auth.spec.ts`)
- Tests de navigation (`e2e/navigation.spec.ts`)

#### Phase 5: Performance & Optimisations
- Skeleton loaders pour tous les composants principaux
- Configuration `@tanstack/react-query` avec QueryProvider
- Providers optimisés dans le root layout

#### Phase 6: Sécurité & RGPD
- Suppression de compte avec transaction (`/api/account/delete`)
- Export RGPD complet en JSON (`/api/export/data`)
- Page confidentialité dans les paramètres
- Composant `PrivacyActions` avec dialog de confirmation

#### Phase 7: UX Mobile
- Navigation bottom bar pour mobile (`BottomNav`)
- MobileNav amélioré avec icônes et sections
- Hook `usePullToRefresh` et composant `PullToRefresh`
- `SwipeableTaskCard` avec animations et haptic feedback améliorés

### Modifié
- Layout dashboard avec support bottom nav sur mobile
- Root layout avec NextIntlClientProvider et QueryProvider

## [0.5.0] - 2026-01-13

### Ajouté
- Dashboard avec statistiques en temps réel
- Composants de charge mentale (balance, chart, historique)
- Gestion des enfants (CRUD complet)
- Système de tâches récurrentes
- Notifications par email
- Compteur de streak
- Actions rapides (vocal, nouvelle tâche)

### Modifié
- Amélioration des performances des requêtes
- Optimisation du bundle size

## [0.4.0] - 2026-01-12

### Ajouté
- Authentification Cognito complète
- Onboarding utilisateur
- Gestion des foyers (création, invitation)
- Templates de tâches par catégorie
- Page facturation avec Stripe

## [0.3.0] - 2026-01-11

### Ajouté
- Interface de gestion des tâches
- Filtres avancés (statut, priorité, catégorie, enfant)
- Détail et édition des tâches
- Composants UI shadcn/ui

## [0.2.0] - 2026-01-10

### Ajouté
- Configuration Supabase avec RLS
- Schémas de base de données
- Actions serveur pour CRUD
- Validation Zod sur tous les inputs

## [0.1.0] - 2026-01-09

### Ajouté
- Setup initial Next.js 15 avec App Router
- Configuration Tailwind CSS v4
- Structure de projet
- CI/CD avec GitHub Actions
