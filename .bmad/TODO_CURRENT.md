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

## Phase 2: Timeline Enfant Avancée

- [ ] 2.1 Améliorer `src/app/(dashboard)/children/[id]/timeline/page.tsx`:
  - Vue chronologique complète
  - Filtres par catégorie
  - Événements importants highlight

- [ ] 2.2 Créer `src/components/custom/ChildMilestones.tsx`:
  - Jalons automatiques par âge (premiers pas, école, etc.)
  - Célébration des anniversaires
  - Rappels proactifs

- [ ] 2.3 Ajouter historique médical/vaccins:
  - `src/lib/data/vaccination-calendar.ts` (FR)
  - Rappels vaccins selon âge
  - Export carnet de santé

- [ ] 2.4 Tests timeline enfant (≥15 tests)

---

## Phase 3: Amélioration Assignation

- [ ] 3.1 Améliorer `src/lib/services/assignment.ts`:
  - Prise en compte préférences parent (catégories préférées)
  - Historique d'assignation pour équilibrage long terme
  - Rotation intelligente

- [ ] 3.2 Créer `src/components/custom/AssignmentPreferences.tsx`:
  - Interface pour définir préférences
  - "Je préfère" / "Je n'aime pas" par catégorie
  - Prise en compte compétences

- [ ] 3.3 Améliorer alertes charge:
  - Notification si déséquilibre > 60/40
  - Suggestion de rééquilibrage
  - Message non culpabilisant

- [ ] 3.4 Tests assignation (≥20 tests)

---

## Phase 4: API Mobile Ready

- [ ] 4.1 Créer API REST complète pour mobile:
  - `src/app/api/v1/tasks/route.ts` - CRUD tâches
  - `src/app/api/v1/children/route.ts` - CRUD enfants
  - `src/app/api/v1/household/route.ts` - Foyer
  - `src/app/api/v1/sync/route.ts` - Sync offline

- [ ] 4.2 Ajouter authentification API:
  - Bearer token validation
  - Refresh token flow
  - Rate limiting per user

- [ ] 4.3 Documentation API:
  - OpenAPI spec (swagger)
  - Exemples requêtes/réponses

- [ ] 4.4 Tests API REST (≥25 tests)

---

## Phase 5: Amélioration Vocal

- [ ] 5.1 Améliorer analyse sémantique:
  - Meilleure extraction de dates implicites
  - Support expressions françaises ("la semaine prochaine", "après les vacances")
  - Confidence score visible

- [ ] 5.2 Ajouter feedback vocal:
  - Toast de confirmation avec résumé
  - Option de correction rapide
  - Historique des commandes vocales

- [ ] 5.3 Tests vocal amélioré (≥15 tests)

---

## Phase 6: Polish & Documentation

- [ ] 6.1 Améliorer messages UX:
  - Tous les messages en français
  - Ton encourageant, jamais culpabilisant
  - Cohérence visuelle

- [ ] 6.2 Optimiser performance:
  - Lazy loading composants lourds
  - Prefetch données critiques
  - Image optimization

- [ ] 6.3 Documentation technique:
  - Architecture README
  - Setup guide pour nouveaux devs
  - API documentation

---

## Definition of Done Sprint 11
- [ ] Notifications push Firebase fonctionnelles
- [ ] Timeline enfant avec jalons et historique
- [ ] Assignation avec préférences parent
- [ ] API REST prête pour mobile Flutter
- [ ] Vocal amélioré avec meilleure extraction
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
