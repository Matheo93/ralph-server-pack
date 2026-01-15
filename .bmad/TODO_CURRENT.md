# TODO CURRENT - Sprint 20: Push Notifications, Payments & Smart Reminders

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ECRIS DU CODE REEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIEGES A EVITER**

---

## Sprint Goal
Sprint 19 a couvert production readiness, mobile API, distribution avancee, realtime, monitoring.
Sprint 20 se concentre sur:
- Push notifications (Firebase + APNs)
- Stripe subscriptions & webhooks
- Smart task reminders
- Family insights dashboard
- Onboarding optimization

---

## PRE-REQUIS
- [x] 0.1 Verifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Verifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Push Notifications Service

- [x] 1.1 Creer `src/lib/notifications/push-service.ts`:
  - Firebase Cloud Messaging integration
  - APNs integration for iOS
  - Device token management
  - Notification payload builder

- [x] 1.2 Creer `src/lib/notifications/notification-scheduler.ts`:
  - Schedule notifications for task deadlines
  - Batch notification processing
  - Priority queue management
  - Rate limiting per device

- [x] 1.3 Creer `src/lib/notifications/notification-templates.ts`:
  - Multi-language notification templates
  - Dynamic content interpolation
  - Action buttons configuration
  - Deep linking support

- [x] 1.4 Creer `src/app/api/notifications/push/route.ts`:
  - Send push notification endpoint
  - Batch send endpoint
  - Device registration endpoint
  - Notification status endpoint

- [x] 1.5 Tests push notifications (70 tests):
  - FCM integration tests
  - APNs integration tests
  - Scheduler tests
  - Template tests

---

## Phase 2: Stripe Subscriptions

- [ ] 2.1 Creer `src/lib/stripe/subscription-manager.ts`:
  - Create subscription
  - Cancel subscription
  - Upgrade/downgrade plan
  - Billing cycle management

- [ ] 2.2 Creer `src/lib/stripe/webhook-handler.ts`:
  - Payment succeeded webhook
  - Payment failed webhook
  - Subscription updated webhook
  - Customer updated webhook

- [ ] 2.3 Creer `src/lib/stripe/invoice-service.ts`:
  - Invoice generation
  - Invoice PDF generation
  - Payment history
  - Receipt sending

- [ ] 2.4 Creer `src/app/api/stripe/subscriptions/route.ts`:
  - Create subscription endpoint
  - Cancel subscription endpoint
  - Update subscription endpoint
  - Get subscription status endpoint

- [ ] 2.5 Tests Stripe (20+ tests):
  - Subscription lifecycle tests
  - Webhook signature tests
  - Invoice generation tests
  - Payment flow tests

---

## Phase 3: Smart Task Reminders

- [ ] 3.1 Creer `src/lib/reminders/reminder-engine.ts`:
  - Smart reminder timing (based on user behavior)
  - Deadline proximity calculation
  - Reminder frequency optimization
  - Snooze handling

- [ ] 3.2 Creer `src/lib/reminders/urgency-calculator.ts`:
  - Task urgency scoring
  - Deadline distance factor
  - Priority weighting
  - User availability integration

- [ ] 3.3 Creer `src/lib/reminders/notification-optimizer.ts`:
  - Best time to notify detection
  - Notification fatigue prevention
  - Consolidation of multiple reminders
  - User preference learning

- [ ] 3.4 Creer `src/app/api/reminders/route.ts`:
  - Get upcoming reminders endpoint
  - Snooze reminder endpoint
  - Update reminder preferences endpoint
  - Dismiss reminder endpoint

- [ ] 3.5 Tests reminders (20+ tests):
  - Urgency calculation tests
  - Notification timing tests
  - Snooze logic tests
  - Preference tests

---

## Phase 4: Family Insights Dashboard

- [ ] 4.1 Creer `src/lib/insights/family-analytics.ts`:
  - Task completion trends
  - Load balance history
  - Category breakdown
  - Time-to-completion metrics

- [ ] 4.2 Creer `src/lib/insights/comparison-engine.ts`:
  - Week-over-week comparison
  - Month-over-month trends
  - Seasonal patterns
  - Progress tracking

- [ ] 4.3 Creer `src/lib/insights/recommendation-engine.ts`:
  - Task optimization suggestions
  - Load rebalancing recommendations
  - Routine improvement tips
  - Efficiency insights

- [ ] 4.4 Creer `src/app/api/insights/route.ts`:
  - Get family insights endpoint
  - Get trends endpoint
  - Get recommendations endpoint
  - Export insights endpoint

- [ ] 4.5 Tests insights (20+ tests):
  - Analytics calculation tests
  - Comparison engine tests
  - Recommendation tests
  - Trend detection tests

---

## Phase 5: Onboarding Optimization

- [ ] 5.1 Creer `src/lib/onboarding/guided-setup.ts`:
  - Step-by-step flow management
  - Progress persistence
  - Skip/resume handling
  - Completion tracking

- [ ] 5.2 Creer `src/lib/onboarding/activation-tracker.ts`:
  - Key activation events
  - Time-to-activation metrics
  - Dropout point detection
  - Conversion funnel analysis

- [ ] 5.3 Creer `src/lib/onboarding/personalization-engine.ts`:
  - User preference detection
  - Content personalization
  - Flow adaptation
  - Quick-start templates

- [ ] 5.4 Creer `src/app/api/onboarding/route.ts`:
  - Get onboarding status endpoint
  - Update progress endpoint
  - Skip step endpoint
  - Complete onboarding endpoint

- [ ] 5.5 Tests onboarding (20+ tests):
  - Flow management tests
  - Activation tracking tests
  - Personalization tests
  - Progress persistence tests

---

## Definition of Done Sprint 20
- [ ] Notifications: Push service fully functional (FCM + APNs)
- [ ] Payments: Stripe subscriptions with webhooks
- [ ] Reminders: Smart timing + urgency calculation
- [ ] Insights: Family analytics dashboard
- [ ] Onboarding: Optimized activation flow
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`
- [ ] 100+ nouveaux tests (20 notifications + 20 stripe + 20 reminders + 20 insights + 20 onboarding)

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINE:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Cree un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRETE JAMAIS - boucle infinie de sprints
