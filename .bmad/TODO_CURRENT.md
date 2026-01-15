# TODO CURRENT - Sprint 11: Enhanced Notifications & Child Timeline

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Améliorer le système de notifications push (Firebase), compléter la timeline enfants, et ajouter les fonctionnalités manquantes du MASTER_PROMPT pour préparer l'app mobile Flutter.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Notifications Push Firebase ✅

- [x] 1.1 Améliorer `src/lib/firebase/messaging.ts`:
  - Intégrer Firebase Admin SDK pour push
  - Types de notifications: task_reminder, streak_risk, charge_alert, deadline_warning, task_completed, milestone
  - Multi-device support (tokens par user)
  - Fonctions: sendStreakRiskPush, sendTaskCompletedPush, sendMilestonePush, sendDeadlineWarningPush, sendBatchNotifications

- [x] 1.2 Créer `src/lib/services/notification-scheduler.ts`:
  - Planifier les rappels selon deadline
  - Rappel J-1, J-0, H-3 pour tâches critiques
  - Agrégation des notifications (pas de spam)
  - Fonctions: scheduleTaskNotifications, processScheduledNotifications, scheduleStreakRiskNotifications, scheduleChargeAlertNotifications

- [x] 1.3 Améliorer API `src/app/api/notifications/`:
  - /send endpoint pour push manuel
  - /schedule pour planification
  - /preferences pour paramétrage user

- [x] 1.4 Tests notifications push (59 tests - ≥20 requis)

---

## Phase 2: Timeline Enfant Avancée ✅

- [x] 2.1 Améliorer `src/app/(dashboard)/children/[id]/timeline/page.tsx`:
  - Vue chronologique complète avec tabs (Timeline / Jalons & Santé)
  - Filtres par catégorie, statut, période (semaine/mois/trimestre/année)
  - Événements importants highlight (priorité haute, événements)
  - Stats visuelles (complétées, en cours, à venir, points)

- [x] 2.2 Créer `src/components/custom/ChildMilestones.tsx`:
  - Jalons automatiques par âge (moteur, langage, social, cognitif, école, santé)
  - Célébration des anniversaires avec compte à rebours
  - Rappels proactifs avec tabs (Aperçu, Jalons, Vaccins, Fêtes)

- [x] 2.3 Ajouter historique médical/vaccins:
  - `src/lib/data/vaccination-calendar.ts` (FR) - calendrier vaccinal français complet
  - `src/lib/data/child-milestones.ts` - 50+ jalons de développement
  - Rappels vaccins selon âge avec statut (en retard, à faire, à venir)

- [x] 2.4 Tests timeline enfant (36 tests - ≥15 requis)

---

## Phase 3: Amélioration Assignation ✅

- [x] 3.1 Améliorer `src/lib/services/assignment.ts`:
  - Prise en compte préférences parent (catégories préférées)
  - Historique d'assignation pour équilibrage long terme
  - Rotation intelligente

- [x] 3.2 Créer `src/components/custom/AssignmentPreferences.tsx`:
  - Interface pour définir préférences
  - "Je préfère" / "Je n'aime pas" par catégorie
  - Prise en compte compétences

- [x] 3.3 Améliorer alertes charge:
  - Notification si déséquilibre > 60/40
  - Suggestion de rééquilibrage
  - Message non culpabilisant

- [x] 3.4 Tests assignation (39 tests)

---

## Phase 4: API Mobile Ready ✅

- [x] 4.1 Créer API REST complète pour mobile:
  - `src/app/api/v1/tasks/route.ts` - CRUD tâches
  - `src/app/api/v1/children/route.ts` - CRUD enfants
  - `src/app/api/v1/household/route.ts` - Foyer
  - `src/app/api/v1/sync/route.ts` - Sync offline

- [x] 4.2 Ajouter authentification API:
  - Bearer token validation
  - Refresh token flow
  - Rate limiting per user

- [x] 4.3 Documentation API:
  - OpenAPI spec (swagger) at `/api/v1/openapi.json`
  - API docs at `/docs/API.md`

- [x] 4.4 Tests API REST (48 tests)

---

## Phase 5: Amélioration Vocal ✅

- [x] 5.1 Améliorer analyse sémantique:
  - Enhanced date parsing with `inferDeadlineEnhanced()`
  - Support expressions françaises (40+ patterns)
  - Confidence score visible with `getConfidenceLabel()`

- [x] 5.2 Ajouter feedback vocal:
  - `VocalFeedback` component with confirmation
  - Quick correction option
  - `VocalCommandHistory` service

- [x] 5.3 Tests vocal amélioré (46 tests)

---

## Phase 6: Polish & Documentation ✅

- [x] 6.1 Améliorer messages UX:
  - `src/lib/constants/messages.ts` with all French messages
  - Encouraging tone, never judgmental
  - Task, balance, child, vocal, notification messages

- [x] 6.2 Optimiser performance:
  - Server components by default
  - Proper TypeScript types

- [x] 6.3 Documentation technique:
  - `docs/ARCHITECTURE.md` - Architecture overview
  - `docs/SETUP.md` - Setup guide
  - `docs/API.md` - API documentation

---

## Definition of Done Sprint 11 ✅
- [x] Notifications push Firebase fonctionnelles (59 tests)
- [x] Timeline enfant avec jalons et historique (36 tests)
- [x] Assignation avec préférences parent (39 tests)
- [x] API REST prête pour mobile Flutter (48 tests)
- [x] Vocal amélioré avec meilleure extraction (46 tests)
- [x] Build production OK: `bunx tsc --noEmit && bun run build`
- [x] Tous les tests passent: 751 tests

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
