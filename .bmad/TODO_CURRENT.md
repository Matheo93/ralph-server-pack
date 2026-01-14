# TODO CURRENT - Sprint 8: Production Hardening & Security

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Durcir l'application pour la production: sécurité, rate limiting, logging, et monitoring.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Rate Limiting & Protection API ✅

- [x] 1.1 Créer `src/lib/rate-limit.ts`:
  - Rate limiting par IP
  - Rate limiting par user
  - Sliding window algorithm
  - Configuration par endpoint
- [x] 1.2 Appliquer rate limiting aux endpoints sensibles:
  - `/api/vocal/*` - 10 req/min
  - `/api/auth/*` - 5 req/min (config ready)
  - `/api/stripe/*` - 20 req/min
  - `/api/export/*` - 5 req/min
- [x] 1.3 Rate limiting via endpoint configuration (RATE_LIMITS object)
- [x] 1.4 Tests unitaires rate limiting (10 tests)

---

## Phase 2: Input Validation & Sanitization ✅

- [x] 2.1 Créer `src/lib/sanitize.ts`:
  - escapeHtml, stripHtml, sanitizeHtml
  - detectSqlInjection
  - sanitizeUrl, sanitizeFilename
  - sanitizeText, normalizeWhitespace
- [x] 2.2 Validation helpers:
  - isValidTaskTitle
  - isValidDescription
  - sanitizeSearchQuery
  - safeJsonParse
- [x] 2.3 Tests unitaires sanitization (23 tests)
- [x] 2.4 Endpoints API utilisent déjà Zod pour validation

---

## Phase 3: Security Headers & CSP ✅

- [x] 3.1 Configurer security headers dans `next.config.ts`:
  - Content-Security-Policy
  - X-Content-Type-Options
  - X-Frame-Options
  - Strict-Transport-Security
  - Referrer-Policy
  - Permissions-Policy
  - X-XSS-Protection
  - X-DNS-Prefetch-Control
- [x] 3.2 Créer middleware pour security headers (CSP dynamique avec nonce)
- [x] 3.3 Build vérifié OK

---

## Phase 4: Logging & Monitoring ✅

- [x] 4.1 Créer `src/lib/logger.ts`:
  - Structured logging (JSON)
  - Log levels (debug, info, warn, error)
  - Request ID tracking
  - Sensitive data sanitization
  - Request timer helper
- [x] 4.2 Ajouter logging aux endpoints critiques:
  - `/api/health` - health checks avec latence DB
  - `/api/vocal/transcribe` - transcription vocale
  - `/api/stripe/webhook` - webhooks Stripe
- [x] 4.3 Tests unitaires logger (26 tests)

---

## Phase 5: Tests de Sécurité

- [ ] 5.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 5.2 `bun run build` - build production OK
- [ ] 5.3 `bun test` - tests passent
- [ ] 5.4 Security audit avec `npm audit`

---

## Definition of Done Sprint 8
- [x] Rate limiting fonctionnel (src/lib/rate-limit.ts)
- [x] Input sanitization en place (src/lib/sanitize.ts)
- [x] Security headers configurés (next.config.ts + middleware.ts)
- [x] Logging structuré (src/lib/logger.ts)
- [ ] Build production OK
- [ ] Tests passent

---

## Fichiers créés dans ce sprint
- `src/lib/rate-limit.ts`
- `src/lib/sanitize.ts`
- `src/lib/logger.ts`
- `src/tests/rate-limit.test.ts`
- `src/tests/sanitize.test.ts`
- `src/tests/logger.test.ts`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
