# TODO CURRENT - Sprint 6: Polish, Performance & Production Ready

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Rendre l'application production-ready avec export de données, push notifications, internationalisation, tests E2E complets, et optimisations de performance.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Export PDF des Données (RGPD) ✅

- [x] 1.1 Créer `src/lib/services/export.ts`:
  - `exportHouseholdData(householdId)` - export JSON complet
  - `getChargeReportData(householdId, period)` - données charge mentale
  - `getTasksHistoryData(householdId, period)` - historique tâches
- [x] 1.2 Installer et configurer `@react-pdf/renderer`:
  - Configuration fonts
  - Styles de base PDF
- [x] 1.3 Créer `src/lib/templates/pdf/charge-report.tsx`:
  - Template React PDF
  - Header avec logo FamilyLoad
  - Graphique répartition parents
  - Tableau détaillé par catégorie
- [x] 1.4 Créer `src/lib/templates/pdf/tasks-history.tsx`:
  - Liste tâches avec dates
  - Filtres par période
  - Statistiques globales
- [x] 1.5 Créer `src/app/api/export/pdf/route.tsx`:
  - Endpoint génération PDF
  - Authentification requise
- [x] 1.6 Ajouter boutons export dans `src/app/(dashboard)/charge/page.tsx`:
  - Composant `ExportButtons` avec dropdown
  - Sélecteur période (semaine, mois, trimestre)

---

## Phase 2: Push Notifications (Firebase) ✅

- [x] 2.1 Installer Firebase Admin SDK:
  - `bun add firebase-admin`
  - Configuration service account
- [x] 2.2 Créer `src/lib/firebase/admin.ts`:
  - Initialisation Firebase Admin
  - Configuration FCM
- [x] 2.3 Créer `src/lib/firebase/messaging.ts`:
  - `sendPushNotification(token, title, body, data)`
  - `sendMultiplePush(tokens[], notification)`
  - Gestion erreurs tokens invalides
- [x] 2.4 Créer `src/app/api/notifications/register-token/route.ts`:
  - Enregistrement device token
  - Association user -> device
  - Support multiple devices
- [x] 2.5 Modifier `src/lib/services/notifications.ts`:
  - Ajouter envoi push en plus email
  - `sendPushToUser()`, `sendPushToHousehold()`
- [x] 2.6 Créer schema `src/lib/aws/device-tokens-schema.sql`:
  - Table device_tokens avec RLS
  - Table user_preferences avec RLS
- [x] 2.7 Ajouter préférences push dans settings:
  - Toggle push notifications
  - Bouton test notification

---

## Phase 3: Internationalisation (i18n) ✅

- [x] 3.1 Installer next-intl:
  - `bun add next-intl`
  - Configuration dans next.config.ts
- [x] 3.2 Créer structure messages:
  - `src/messages/fr.json` - Français (défaut)
  - `src/messages/en.json` - Anglais
- [x] 3.3 Configurer `src/i18n/request.ts`:
  - Détection locale automatique (cookie + Accept-Language)
  - Locale par défaut: français
- [x] 3.4 Créer composants i18n:
  - `LanguageSwitcher` component
  - NextIntlClientProvider dans layout.tsx
- [x] 3.5 Mettre à jour root layout avec providers
- [x] 3.6 Ajouter sélecteur langue (composant créé)

---

## Phase 4: Tests E2E Playwright ✅

- [x] 4.1 Configurer Playwright:
  - `bun add -D @playwright/test`
  - playwright.config.ts avec baseURL et timeouts 30s
- [x] 4.2 Créer `e2e/auth.spec.ts`:
  - Test login page display
  - Test protected routes redirect
  - Test public routes access
- [x] 4.3 Créer `e2e/navigation.spec.ts`:
  - Test landing page
  - Test 404 page
  - Test responsive viewports
- [ ] 4.4 Créer `e2e/tasks.spec.ts` (à compléter)
- [ ] 4.5 Créer `e2e/vocal.spec.ts` (à compléter)
- [ ] 4.6 Créer `e2e/charge.spec.ts` (à compléter)

---

## Phase 5: Performance & Optimisations ✅

- [x] 5.1 Vérifier build passe
- [x] 5.2 Implémenter skeleton loaders:
  - `src/components/ui/skeleton.tsx`
  - TaskCardSkeleton, TaskListSkeleton
  - DashboardSkeleton, ChartSkeleton, PageSkeleton
- [x] 5.3 Configurer React Query:
  - `bun add @tanstack/react-query`
  - QueryProvider avec staleTime et gcTime configurés
- [x] 5.4 Mettre à jour root layout:
  - QueryProvider ajouté
  - NextIntlClientProvider ajouté
- [ ] 5.5 Implémenter prefetching (à compléter)
- [ ] 5.6 Optimiser images (à compléter)

---

## Phase 6: Sécurité & RGPD ✅

- [x] 6.1 Créer schema device_tokens avec RLS
- [x] 6.2 Créer `src/app/api/account/delete/route.ts`:
  - Suppression compte complète avec transaction
  - Cascade sur toutes les données
  - Email confirmation
- [x] 6.3 Créer `src/app/api/export/data/route.ts`:
  - Export RGPD complet (JSON)
  - Toutes données utilisateur
- [x] 6.4 Ajouter page privacy dans settings:
  - `src/app/(dashboard)/settings/privacy/page.tsx`
  - Bouton exporter mes données
  - Bouton supprimer mon compte avec confirmation
- [ ] 6.5 Implémenter rate limiting (à compléter)
- [ ] 6.6 Logs sécurisés (à compléter)

---

## Phase 7: UX Mobile Améliorations (PARTIEL)

- [ ] 7.1 Améliorer responsive design
- [ ] 7.2 Ajouter pull-to-refresh
- [ ] 7.3 Améliorer SwipeableTaskCard
- [ ] 7.4 Optimiser MobileNav

---

## Phase 8: Documentation & Cleanup (PARTIEL)

- [ ] 8.1 Créer CHANGELOG.md
- [ ] 8.2 Nettoyer code mort
- [ ] 8.3 Vérifier console.log
- [ ] 8.4 Audit accessibilité

---

## Phase 9: Tests et Validation Finale

- [x] 9.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript ✅
- [x] 9.2 `bun run build` - build production OK ✅
- [ ] 9.3 `bun test` - tous tests passent
- [ ] 9.4 `bun run e2e` - tests E2E passent
- [ ] 9.5 Lighthouse audit > 90 sur toutes métriques

---

## Definition of Done Sprint 6
- [x] Export PDF fonctionnel (charge + historique)
- [x] Push notifications configurées (Firebase Admin)
- [x] i18n FR/EN fonctionnel (next-intl)
- [x] Tests E2E structure créée (Playwright)
- [x] QueryProvider + Skeletons ajoutés
- [x] RGPD compliant (export, suppression)
- [ ] Mobile UX améliorée
- [x] Zéro erreur TypeScript
- [x] Build production OK
- [ ] Tests passent

---

## Variables d'environnement NOUVELLES
```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
NEXT_PUBLIC_DEFAULT_LOCALE=fr
```

---

## Commandes utiles
```bash
bun dev                    # Dev server
bun build                  # Production build
bunx tsc --noEmit          # Type check
bun test                   # Run unit tests
bun run e2e                # Run E2E tests
bunx playwright install    # Install browsers
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- PDF généré côté serveur (streaming)
- Firebase Admin SDK = server-side only
- i18n = Server Components compatibles via NextIntlClientProvider
- Tests E2E avec data-testid obligatoires
- RLS pour toutes nouvelles tables

---

## Fichiers créés dans ce sprint

### Phase 1 (Export PDF)
- `src/lib/services/export.ts`
- `src/lib/templates/pdf/styles.ts`
- `src/lib/templates/pdf/charge-report.tsx`
- `src/lib/templates/pdf/tasks-history.tsx`
- `src/lib/templates/pdf/index.ts`
- `src/app/api/export/pdf/route.tsx`
- `src/components/custom/ExportButtons.tsx`

### Phase 2 (Push Notifications)
- `src/lib/firebase/admin.ts`
- `src/lib/firebase/messaging.ts`
- `src/lib/firebase/index.ts`
- `src/app/api/notifications/register-token/route.ts`
- `src/lib/aws/device-tokens-schema.sql`

### Phase 3 (i18n)
- `src/messages/fr.json`
- `src/messages/en.json`
- `src/i18n/request.ts`
- `src/lib/i18n/config.ts`
- `src/components/custom/LanguageSwitcher.tsx`

### Phase 4 (E2E Tests)
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/navigation.spec.ts`

### Phase 5 (Performance)
- `src/components/ui/skeleton.tsx`
- `src/lib/providers/QueryProvider.tsx`

### Phase 6 (Sécurité RGPD)
- `src/app/api/account/delete/route.ts`
- `src/app/api/export/data/route.ts`
- `src/app/(dashboard)/settings/privacy/page.tsx`
- `src/components/custom/PrivacyActions.tsx`
- `src/components/ui/dialog.tsx`

---

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
