# TODO CURRENT - Sprint 12: Payment, Templates & Streak Enhancement

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter le système de paiement Stripe (4€/mois), le catalogue de tâches automatiques par âge, et améliorer le système de streak pour l'engagement utilisateur.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Stripe Payment Integration

- [ ] 1.1 Créer `src/lib/stripe/client.ts`:
  - Configuration Stripe SDK
  - Types pour plans et subscriptions
  - Helper functions

- [ ] 1.2 Créer API endpoints:
  - `src/app/api/billing/checkout/route.ts` - Create checkout session
  - `src/app/api/billing/portal/route.ts` - Customer portal
  - `src/app/api/billing/webhook/route.ts` - Handle webhooks
  - `src/app/api/billing/status/route.ts` - Subscription status

- [ ] 1.3 Créer `src/lib/services/subscription.ts`:
  - checkSubscriptionStatus()
  - handleSubscriptionUpdated()
  - checkTrialExpiration()
  - grantTrialExtension()

- [ ] 1.4 Améliorer `src/app/(dashboard)/settings/billing/page.tsx`:
  - Current plan display
  - Upgrade/downgrade options
  - Payment history
  - Cancel subscription

- [ ] 1.5 Tests paiement (≥15 tests)

---

## Phase 2: Task Templates (Catalogue Automatique)

- [ ] 2.1 Créer `src/lib/data/task-templates.ts`:
  - Templates par âge (0-3, 3-6, 6-11, 11-15, 15-18)
  - Templates par période (rentrée, vacances, etc.)
  - Poids charge par type

- [ ] 2.2 Créer `src/lib/services/template-engine.ts`:
  - generateTasksForChild() - Génère tâches selon âge
  - generateSeasonalTasks() - Tâches par période
  - checkUpcomingDeadlines() - Alertes proactives
  - calculateTaskWeight() - Poids pour répartition

- [ ] 2.3 Créer `src/app/api/templates/` endpoints:
  - GET /generate - Generate tasks for household
  - POST /customize - Customize template preferences
  - GET /upcoming - Get upcoming auto-generated tasks

- [ ] 2.4 Créer `src/components/custom/TaskTemplates.tsx`:
  - Preview des tâches à générer
  - Toggle on/off par catégorie
  - Personnalisation délais

- [ ] 2.5 Tests templates (≥20 tests)

---

## Phase 3: Streak System Enhancement

- [ ] 3.1 Améliorer `src/lib/services/streak.ts`:
  - calculateStreak() - Calcul streak foyer
  - checkStreakRisk() - Alerte si streak en danger
  - useJoker() - Utiliser joker (premium)
  - getStreakHistory() - Historique
  - getStreakRewards() - Badges/récompenses

- [ ] 3.2 Créer composants streak:
  - `src/components/custom/StreakBadge.tsx` - Affichage streak
  - `src/components/custom/StreakRiskAlert.tsx` - Alerte
  - `src/components/custom/DailyValidation.tsx` - Swipe tâches

- [ ] 3.3 Intégrer streak dans dashboard:
  - Affichage proéminent du streak
  - Animation célébration milestones
  - Notification push streak risk

- [ ] 3.4 Tests streak (≥15 tests)

---

## Phase 4: RGPD & Export

- [ ] 4.1 Créer `src/lib/services/gdpr.ts`:
  - exportUserData() - Export JSON/PDF
  - deleteUserData() - Suppression complète
  - anonymizeData() - Anonymisation
  - generateDataReport() - Rapport données

- [ ] 4.2 Créer API endpoints:
  - `src/app/api/gdpr/export/route.ts`
  - `src/app/api/gdpr/delete/route.ts`
  - `src/app/api/gdpr/anonymize/route.ts`

- [ ] 4.3 Améliorer `src/app/(dashboard)/settings/privacy/page.tsx`:
  - Export data button
  - Delete account with confirmation
  - Data retention info

- [ ] 4.4 Tests RGPD (≥10 tests)

---

## Phase 5: Performance & Polish

- [ ] 5.1 Optimiser queries database:
  - Index critiques
  - Queries N+1
  - Connection pooling

- [ ] 5.2 Améliorer UX responsive:
  - Mobile navigation
  - Touch gestures
  - Loading states

- [ ] 5.3 Final testing:
  - Integration tests
  - Performance benchmarks
  - Accessibility audit

---

## Definition of Done Sprint 12
- [ ] Stripe paiement fonctionnel (checkout, portal, webhooks)
- [ ] Catalogue tâches automatiques par âge
- [ ] Système streak complet avec joker
- [ ] Export RGPD fonctionnel
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
