# TODO CURRENT - Sprint 4: Répartition Intelligente + Landing + Stripe

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter le moteur de répartition équitable, la landing page marketing, et l'intégration Stripe pour les paiements.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Moteur de Répartition Intelligente ✅

- [x] 1.1 Mettre à jour `src/lib/services/charge.ts`:
  - `assignTaskToLeastLoadedParent(taskId, householdId)` - assignation automatique
  - `getWeeklyLoadByParent(householdId)` - charge par parent sur 7 jours
  - `getLoadBalancePercentage(householdId)` - % répartition (60/40, etc.)
- [x] 1.2 Créer `src/lib/services/assignment.ts`:
  - `determineAssignment(task, householdMembers)` - règles d'assignation
  - `rotateIfEqual(lastAssigned, members)` - rotation si égalité
  - `checkExclusions(memberId, excludeUntil)` - exclusions temporaires
- [x] 1.3 Créer schema `member_exclusions` pour absences temporaires:
  - id, member_id, household_id
  - exclude_from, exclude_until
  - reason (voyage, maladie, etc.)
- [x] 1.4 Créer `src/lib/validations/assignment.ts`:
  - ExclusionSchema
  - AssignmentRuleSchema

---

## Phase 2: Alertes et Notifications Charge ✅

- [x] 2.1 Créer `src/lib/services/alerts.ts`:
  - `checkImbalanceAlert(householdId)` - alerte si > 60/40
  - `checkOverloadAlert(memberId)` - surcharge hebdomadaire
  - `checkInactivityAlert(memberId)` - inactivité d'un parent
- [x] 2.2 Créer `src/types/alert.ts`:
  - AlertType enum (imbalance, overload, inactivity)
  - Alert interface
  - AlertSeverity enum (info, warning, critical)
- [x] 2.3 Créer `src/components/custom/AlertBanner.tsx`:
  - Bannière non-culpabilisante
  - Message contextuel
  - Actions suggérées
- [x] 2.4 Créer `src/components/custom/ChargeAlerts.tsx`:
  - Liste des alertes actives
  - Dismiss temporaire

---

## Phase 3: Landing Page Marketing ✅

- [x] 3.1 Créer `src/app/(marketing)/layout.tsx`:
  - Layout marketing (sans sidebar)
  - Header avec CTA
- [x] 3.2 Créer `src/app/(marketing)/page.tsx` (nouvelle home):
  - Hero section (problème + solution)
  - Features (vocal, auto, répartition)
  - Social proof (témoignages)
  - Pricing section
  - CTA final
- [x] 3.3 Créer `src/components/marketing/Hero.tsx`:
  - Titre accrocheur
  - Sous-titre problème/solution
  - CTA "Essai gratuit 14 jours"
  - Visuel app
- [x] 3.4 Créer `src/components/marketing/Features.tsx`:
  - 3 features principales avec icônes
  - Descriptions courtes
- [x] 3.5 Créer `src/components/marketing/Pricing.tsx`:
  - Prix unique 4€/mois
  - Liste features incluses
  - CTA signup
- [x] 3.6 Créer `src/components/marketing/Testimonials.tsx`:
  - 3 témoignages parents
  - Avatar + citation + nom

---

## Phase 4: Intégration Stripe ✅

- [x] 4.1 Créer `src/lib/stripe/client.ts`:
  - Configuration Stripe
  - Types Stripe
- [x] 4.2 Créer `src/lib/stripe/checkout.ts`:
  - `createCheckoutSession(householdId, priceId)` - création session
  - `createPortalSession(customerId)` - portail client
- [x] 4.3 Créer `src/lib/stripe/webhooks.ts`:
  - `handleCheckoutCompleted(event)` - paiement réussi
  - `handleSubscriptionUpdated(event)` - mise à jour abo
  - `handleSubscriptionDeleted(event)` - annulation
- [x] 4.4 Créer `src/app/api/stripe/checkout/route.ts`:
  - POST: créer checkout session
- [x] 4.5 Créer `src/app/api/stripe/webhook/route.ts`:
  - POST: recevoir webhooks Stripe
  - Vérification signature
- [x] 4.6 Créer `src/app/api/stripe/portal/route.ts`:
  - POST: créer portail session

---

## Phase 5: Pages Billing ✅

- [x] 5.1 Créer `src/app/(dashboard)/settings/billing/page.tsx`:
  - Statut abonnement
  - Date prochain paiement
  - Bouton "Gérer abonnement"
  - Historique factures
- [x] 5.2 Créer `src/components/custom/SubscriptionStatus.tsx`:
  - Badge trial/active/cancelled
  - Jours restants trial
  - Alertes expiration
- [x] 5.3 Mettre à jour schema households:
  - stripe_customer_id (already in schema)
  - subscription_status (already in schema)
  - trial_ends_at (in subscriptions table)
  - subscription_ends_at (already in schema)

---

## Phase 6: Vue Enfant Timeline ✅

- [x] 6.1 Créer `src/app/(dashboard)/children/[id]/timeline/page.tsx`:
  - Timeline verticale par enfant
  - Historique tâches complétées
  - Prochaines tâches prévues
- [x] 6.2 Créer `src/components/custom/ChildTimeline.tsx`:
  - Timeline visuelle
  - Filtres par période
  - Export PDF (préparation)

---

## Phase 7: Tests et Validations

- [ ] 7.1 Créer `src/tests/assignment-test.ts`:
  - Test assignation automatique
  - Test rotation
  - Test exclusions
- [ ] 7.2 Créer `src/tests/alerts-test.ts`:
  - Test détection déséquilibre
  - Test seuils alertes
- [ ] 7.3 Créer `src/tests/stripe-test.ts`:
  - Test création session (mock)
  - Test webhooks (mock)

---

## Phase 8: Build & Validation

- [ ] 8.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 8.2 `bun run build` - build production OK
- [ ] 8.3 Test manuel: créer tâche → vérifier assignation automatique
- [ ] 8.4 Test manuel: landing page responsive

---

## Definition of Done Sprint 4
- [ ] Moteur répartition fonctionnel (assignation auto)
- [ ] Alertes déséquilibre actives
- [ ] Landing page complète et responsive
- [ ] Intégration Stripe (checkout + webhooks)
- [ ] Page billing fonctionnelle
- [ ] Vue timeline enfant
- [ ] Build production sans erreur
- [ ] Types stricts partout

---

## Variables d'environnement NOUVELLES
```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

---

## Commandes utiles
```bash
bun dev                    # Dev server
bun build                  # Production build
bunx tsc --noEmit          # Type check
stripe listen --forward-to localhost:3000/api/stripe/webhook  # Test webhooks
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- Stripe en mode test pour dev
- Landing page mobile-first
- Messages alertes NON culpabilisants (cf MASTER_PROMPT)
- RLS pour member_exclusions

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints

