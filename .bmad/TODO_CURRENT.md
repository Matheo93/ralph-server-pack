# TODO CURRENT - Sprint 13: Notifications, Timeline & AI Enhancement

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter le système de notifications push complet, la timeline par enfant, et améliorer l'analyse sémantique des commandes vocales avec LLM.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Push Notifications System

- [ ] 1.1 Créer `src/lib/services/push-notifications.ts`:
  - sendPushNotification() - Envoyer via FCM/APNs
  - scheduleNotification() - Planifier pour plus tard
  - cancelScheduledNotification() - Annuler
  - getNotificationHistory() - Historique par user

- [ ] 1.2 Créer API endpoints:
  - `src/app/api/notifications/push/route.ts` - Send push
  - `src/app/api/notifications/schedule/route.ts` - Schedule
  - `src/app/api/notifications/preferences/route.ts` - User prefs

- [ ] 1.3 Améliorer `src/lib/services/notifications.ts`:
  - Intégrer push avec notifications existantes
  - Batch sending pour groupes
  - Rate limiting

- [ ] 1.4 Créer cron job pour notifications planifiées:
  - `src/app/api/cron/notifications/route.ts`
  - Vérification deadlines
  - Alertes streak en danger

- [ ] 1.5 Tests notifications (≥15 tests)

---

## Phase 2: Child Timeline

- [ ] 2.1 Créer `src/lib/services/timeline.ts`:
  - getChildTimeline() - Historique complet par enfant
  - getUpcomingEvents() - Événements à venir
  - getMilestones() - Jalons importants (vaccins, école)
  - generateTimelineReport() - Export PDF/JSON

- [ ] 2.2 Créer API endpoints:
  - `src/app/api/children/[id]/timeline/route.ts`
  - `src/app/api/children/[id]/milestones/route.ts`

- [ ] 2.3 Créer composants timeline:
  - `src/components/custom/ChildTimeline.tsx` - Vue chronologique
  - `src/components/custom/MilestoneCard.tsx` - Carte milestone
  - `src/components/custom/TimelineFilter.tsx` - Filtres

- [ ] 2.4 Créer page timeline:
  - `src/app/(dashboard)/children/[id]/timeline/page.tsx`

- [ ] 2.5 Tests timeline (≥15 tests)

---

## Phase 3: AI/LLM Vocal Analysis Enhancement

- [ ] 3.1 Créer `src/lib/services/llm-analyzer.ts`:
  - analyzeVocalCommand() - Analyse sémantique améliorée
  - extractEntities() - Extraction enfant, date, action
  - detectUrgency() - Calcul urgence
  - suggestCategory() - Suggestion catégorie

- [ ] 3.2 Améliorer pipeline vocal:
  - Meilleur parsing dates ("lundi prochain", "dans 3 jours")
  - Détection multi-enfants
  - Gestion ambiguïtés

- [ ] 3.3 Créer `src/lib/services/smart-suggestions.ts`:
  - suggestTasks() - Suggestions intelligentes
  - predictDeadline() - Prédiction deadline
  - detectPatterns() - Patterns utilisateur

- [ ] 3.4 Tests AI (≥20 tests)

---

## Phase 4: Dashboard Enhancements

- [ ] 4.1 Améliorer page dashboard:
  - Widget streak plus visible
  - Notifications non lues
  - Quick actions

- [ ] 4.2 Créer composants widgets:
  - `src/components/custom/DashboardWidgets.tsx`
  - `src/components/custom/QuickActions.tsx`
  - `src/components/custom/NotificationBadge.tsx`

- [ ] 4.3 Mobile responsive polish:
  - Bottom navigation
  - Swipe actions
  - Pull to refresh

- [ ] 4.4 Tests dashboard (≥10 tests)

---

## Phase 5: Real-time Updates

- [ ] 5.1 Créer `src/lib/services/realtime.ts`:
  - subscribeToHousehold() - WebSocket/SSE
  - broadcastUpdate() - Diffuser changements
  - handleReconnect() - Gestion reconnexion

- [ ] 5.2 Intégrer real-time dans UI:
  - Tasks list auto-update
  - Notification bell live
  - Charge balance live

- [ ] 5.3 Tests realtime (≥10 tests)

---

## Definition of Done Sprint 13
- [ ] Push notifications fonctionnelles
- [ ] Timeline enfant avec historique
- [ ] Analyse vocale améliorée avec LLM
- [ ] Dashboard enrichi
- [ ] Real-time updates
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
