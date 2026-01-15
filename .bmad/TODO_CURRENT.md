# TODO CURRENT - Sprint 18: Security Hardening, i18n & Advanced Features

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ECRIS DU CODE REEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIEGES A EVITER**

---

## Sprint Goal
Sprint 17 a couvert performance, monitoring, PWA et UX. Sprint 18 se concentre sur:
- Security hardening (OWASP Top 10)
- Internationalisation complete (i18n)
- Tests E2E critiques
- Features avancees manquantes
- Documentation API

---

## PRE-REQUIS
- [x] 0.1 Verifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Verifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Security Hardening (OWASP Top 10)

- [x] 1.1 Creer `src/lib/security/csrf-protection.ts`:
  - Double-submit cookie pattern
  - Token generation et validation
  - Middleware integration

- [x] 1.2 Creer `src/lib/security/input-validation.ts`:
  - XSS sanitization avancee
  - SQL injection prevention (double-check Supabase)
  - File upload validation stricte

- [x] 1.3 Creer `src/lib/security/rate-limiter-advanced.ts`:
  - Sliding window algorithm
  - Per-user et per-IP limits
  - Adaptive rate limiting (augmente apres echecs)

- [x] 1.4 Creer `src/lib/security/session-management.ts`:
  - Session fixation prevention
  - Concurrent session limits
  - Force logout capability

- [x] 1.5 Tests security (30+ tests):
  - CSRF protection tests
  - XSS prevention tests
  - Rate limiting tests
  - Session management tests

---

## Phase 2: Internationalisation Complete (i18n)

- [x] 2.1 Creer `src/i18n/messages/en.ts`:
  - Toutes les traductions anglaises
  - Format coherent avec fr.ts existant
  - Pluralisation correcte

- [x] 2.2 Creer `src/i18n/messages/es.ts`:
  - Traductions espagnoles completes
  - Adaptations culturelles (dates, nombres)

- [x] 2.3 Creer `src/i18n/messages/de.ts`:
  - Traductions allemandes completes
  - Gestion des cas grammaticaux

- [x] 2.4 Creer `src/lib/i18n/date-formatter.ts`:
  - Formatage dates par locale
  - Jours de la semaine localises
  - Periodes relatives ("il y a 2 jours")

- [x] 2.5 Tests i18n (25+ tests):
  - Toutes les langues chargent
  - Pluralisation correcte
  - Formatage dates par locale
  - Fallback vers francais

---

## Phase 3: Tests E2E Critiques

- [ ] 3.1 Creer `e2e/full-user-journey.spec.ts`:
  - Signup -> Onboarding -> First task -> Streak
  - Test complet 10+ etapes
  - Screenshots automatiques

- [ ] 3.2 Creer `e2e/payment-flow.spec.ts`:
  - Stripe checkout simulation
  - Subscription upgrade/downgrade
  - Billing portal access

- [ ] 3.3 Creer `e2e/co-parent-invite.spec.ts`:
  - Invitation envoyee
  - Token valide
  - Acceptation et acces foyer

- [ ] 3.4 Creer `e2e/vocal-task-creation.spec.ts`:
  - Enregistrement audio mock
  - Transcription et analyse
  - Creation tache automatique

- [ ] 3.5 Creer `e2e/offline-sync.spec.ts`:
  - Creation offline
  - Synchronisation au retour online
  - Conflit resolution

---

## Phase 4: Features Avancees

- [ ] 4.1 Creer `src/lib/services/smart-scheduler.ts`:
  - Prediction meilleur moment pour taches
  - Learning sur patterns utilisateur
  - Suggestions horaires

- [ ] 4.2 Creer `src/lib/services/family-insights.ts`:
  - Statistiques mensuelles
  - Trends charge mentale
  - Comparaison semaine precedente

- [ ] 4.3 Creer `src/components/custom/WeeklyReport.tsx`:
  - Recap hebdomadaire
  - Graphiques completion
  - Points amelioration

- [ ] 4.4 Creer `src/lib/services/task-prioritization.ts`:
  - Algorithme scoring avance
  - Urgence vs importance
  - Deadlines implicites

- [ ] 4.5 Tests features avancees (30+ tests):
  - Smart scheduler tests
  - Family insights tests
  - Task prioritization tests

---

## Phase 5: Documentation & API

- [ ] 5.1 Ameliorer `src/app/api/docs/route.ts`:
  - OpenAPI 3.1 complet
  - Tous les endpoints documentes
  - Exemples pour chaque route

- [ ] 5.2 Creer `src/lib/api/error-responses.ts`:
  - Error codes standardises
  - Messages localises
  - Documentation erreurs

- [ ] 5.3 Creer `src/lib/api/versioning.ts`:
  - Support API v1 et v2
  - Deprecation warnings
  - Migration guides

- [ ] 5.4 Creer `src/app/api/v2/` structure:
  - Routes v2 avec breaking changes
  - Meilleure pagination
  - Filtering avance

- [ ] 5.5 Tests API (25+ tests):
  - OpenAPI validation
  - Error responses tests
  - Versioning tests

---

## Definition of Done Sprint 18
- [ ] Security: OWASP Top 10 couvert
- [ ] i18n: 4 langues supportees (fr, en, es, de)
- [ ] E2E: User journeys critiques testes
- [ ] Features: Smart scheduler et insights
- [ ] API: Documentation complete OpenAPI 3.1
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`
- [ ] 110+ nouveaux tests (30 security + 25 i18n + 30 features + 25 API)

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINE:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Cree un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRETE JAMAIS - boucle infinie de sprints
