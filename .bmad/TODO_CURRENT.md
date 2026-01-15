# TODO CURRENT - Sprint 15: Mobile & Payments

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Préparer l'intégration mobile Flutter, améliorer les notifications push, et renforcer l'intégration Stripe pour le paiement.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Mobile API Preparation

- [x] 1.1 Créer `src/lib/services/mobile-api.ts`:
  - Device token registration
  - Mobile session management
  - API response formatting for mobile
  - Rate limiting helpers

- [x] 1.2 Créer API endpoints mobiles:
  - `src/app/api/mobile/register-device/route.ts`
  - `src/app/api/mobile/sync/route.ts` - Offline sync
  - `src/app/api/mobile/health/route.ts` - Health check

- [x] 1.3 Tests mobile API (≥10 tests) - 32 tests created

---

## Phase 2: Push Notifications Enhancement

- [x] 2.1 Améliorer `src/lib/services/notifications.ts`:
  - Firebase Cloud Messaging (FCM) integration
  - APNs integration (iOS)
  - Notification queuing (`src/lib/services/notification-queue.ts`)
  - Retry mechanism with exponential backoff

- [x] 2.2 Créer notification templates (`src/lib/templates/push/index.ts`):
  - Daily reminder
  - Deadline approaching
  - Streak at risk
  - Balance alert
  - Weekly summary
  - Task completed
  - Task assigned
  - Welcome

- [x] 2.3 Créer API endpoints:
  - `src/app/api/notifications/subscribe/route.ts`
  - `src/app/api/notifications/preferences/route.ts` (existait déjà)

- [x] 2.4 Tests notifications (≥10 tests) - 39 tests created

---

## Phase 3: Stripe Payments Enhancement

- [x] 3.1 Améliorer intégration Stripe:
  - Webhook handling improvements (handleInvoicePaid, handleTrialWillEnd)
  - Trial period management (extendTrial)
  - Subscription upgrades/downgrades (changeSubscriptionPlan)
  - Invoice handling (getUpcomingInvoice, storeInvoice)

- [x] 3.2 Créer customer portal endpoint:
  - `src/app/api/billing/portal/route.ts` (existait déjà)
  - `src/app/api/billing/invoices/route.ts` ✓

- [x] 3.3 Créer composants billing:
  - `src/components/custom/PricingCard.tsx` ✓
  - `src/components/custom/SubscriptionStatus.tsx` (existait déjà)
  - `src/components/custom/InvoiceList.tsx` ✓

- [x] 3.4 Tests payments (≥10 tests) - 39 tests in stripe-payments.test.ts

---

## Phase 4: Landing Page Improvements

- [x] 4.1 Améliorer landing page:
  - Hero section avec animation ✓ (existait déjà)
  - Feature showcase ✓ (existait déjà)
  - Testimonials section ✓ (existait déjà)
  - FAQ section ✓ `src/components/marketing/FAQ.tsx`
  - Pricing section ✓ (existait déjà)

- [x] 4.2 Créer composants landing:
  - `src/components/marketing/Hero.tsx` (existait)
  - `src/components/marketing/Features.tsx` (existait)
  - `src/components/marketing/Pricing.tsx` (existait)
  - `src/components/marketing/FAQ.tsx` ✓

- [x] 4.3 SEO improvements:
  - Meta tags dynamiques ✓ (existait dans layout.tsx)
  - Structured data (JSON-LD) ✓ `src/lib/seo/structured-data.ts`
  - `src/components/seo/JsonLd.tsx` ✓

- [x] 4.4 Tests landing (≥5 tests) - 16 tests in landing-page.test.ts

---

## Phase 5: API Documentation

- [x] 5.1 Créer documentation OpenAPI:
  - Schema definitions ✓
  - Endpoint documentation ✓
  - Authentication docs ✓

- [x] 5.2 Créer `src/lib/openapi/schema.ts`:
  - Request/response types ✓
  - Error codes ✓
  - Rate limits ✓

- [x] 5.3 Créer `/api/docs/route.ts`:
  - OpenAPI JSON endpoint ✓

- [x] 5.4 Tests documentation (≥5 tests) - 24 tests in api-docs.test.ts

---

## Definition of Done Sprint 15
- [x] APIs prêtes pour mobile Flutter
- [x] Push notifications FCM/APNs
- [x] Stripe customer portal
- [x] Landing page améliorée
- [x] Documentation API OpenAPI
- [x] Build production OK: `bunx tsc --noEmit && bun run build`
- [x] Tous les tests passent: `bun test src/tests/` (1306 tests)
- [x] ≥40 nouveaux tests (150+ nouveaux tests)

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
