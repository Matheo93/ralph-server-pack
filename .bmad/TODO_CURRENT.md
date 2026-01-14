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
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Export PDF des Données (RGPD)

- [ ] 1.1 Créer `src/lib/services/export.ts`:
  - `exportHouseholdData(householdId)` - export JSON complet
  - `generateChargePDF(householdId, period)` - PDF charge mentale
  - `generateTasksHistoryPDF(householdId)` - historique tâches
- [ ] 1.2 Installer et configurer `@react-pdf/renderer`:
  - Configuration fonts
  - Styles de base PDF
- [ ] 1.3 Créer `src/lib/templates/pdf/charge-report.tsx`:
  - Template React PDF
  - Header avec logo FamilyLoad
  - Graphique répartition parents
  - Tableau détaillé par catégorie
- [ ] 1.4 Créer `src/lib/templates/pdf/tasks-history.tsx`:
  - Liste tâches avec dates
  - Filtres par période
  - Statistiques globales
- [ ] 1.5 Créer `src/app/api/export/pdf/route.ts`:
  - Endpoint génération PDF
  - Authentification requise
  - Rate limiting
- [ ] 1.6 Ajouter boutons export dans `src/app/(dashboard)/charge/page.tsx`:
  - Bouton "Exporter PDF"
  - Sélecteur période (semaine, mois, trimestre)

---

## Phase 2: Push Notifications (Firebase)

- [ ] 2.1 Installer Firebase Admin SDK:
  - `bun add firebase-admin`
  - Configuration service account
- [ ] 2.2 Créer `src/lib/firebase/admin.ts`:
  - Initialisation Firebase Admin
  - Configuration FCM
- [ ] 2.3 Créer `src/lib/firebase/messaging.ts`:
  - `sendPushNotification(token, title, body, data)`
  - `sendMultiplePush(tokens[], notification)`
  - Gestion erreurs tokens invalides
- [ ] 2.4 Créer `src/app/api/notifications/register-token/route.ts`:
  - Enregistrement device token
  - Association user -> device
  - Support multiple devices
- [ ] 2.5 Modifier `src/lib/services/notifications.ts`:
  - Ajouter envoi push en plus email
  - Préférence user (push, email, both)
- [ ] 2.6 Créer table `device_tokens` + RLS:
  - user_id, token, platform, created_at
  - Policies RLS appropriées
- [ ] 2.7 Ajouter préférences push dans `src/app/(dashboard)/settings/notifications/page.tsx`:
  - Toggle push notifications
  - Bouton test notification

---

## Phase 3: Internationalisation (i18n)

- [ ] 3.1 Installer next-intl:
  - `bun add next-intl`
  - Configuration middleware
- [ ] 3.2 Créer structure messages:
  - `src/messages/fr.json` - Français (défaut)
  - `src/messages/en.json` - Anglais
- [ ] 3.3 Configurer `src/middleware.ts`:
  - Détection locale automatique
  - Redirect selon préférence user
- [ ] 3.4 Créer `src/lib/i18n/config.ts`:
  - Locales supportées
  - Locale par défaut
  - Formats dates/nombres
- [ ] 3.5 Migrer composants critiques:
  - Header, Sidebar, MobileNav
  - Dashboard labels
  - TaskForm labels
- [ ] 3.6 Ajouter sélecteur langue:
  - Dans settings/profile
  - Persistence préférence user

---

## Phase 4: Tests E2E Playwright

- [ ] 4.1 Configurer Playwright:
  - `bun add -D @playwright/test`
  - playwright.config.ts avec baseURL
- [ ] 4.2 Créer `e2e/auth.spec.ts`:
  - Test login flow complet
  - Test signup flow
  - Test logout
- [ ] 4.3 Créer `e2e/onboarding.spec.ts`:
  - Test wizard étape par étape
  - Test création foyer
  - Test ajout enfant
- [ ] 4.4 Créer `e2e/tasks.spec.ts`:
  - Test création tâche
  - Test complétion tâche
  - Test report tâche
  - Test suppression tâche
- [ ] 4.5 Créer `e2e/vocal.spec.ts`:
  - Test mock audio upload
  - Test création tâche vocale
- [ ] 4.6 Créer `e2e/charge.spec.ts`:
  - Test affichage dashboard charge
  - Test navigation semaine

---

## Phase 5: Performance & Optimisations

- [ ] 5.1 Auditer et optimiser bundle:
  - Analyser avec `bun run build --analyze`
  - Identifier chunks trop gros
  - Split dynamique imports
- [ ] 5.2 Implémenter skeleton loaders:
  - `src/components/ui/skeleton.tsx`
  - Skeleton pour TaskList
  - Skeleton pour Dashboard
- [ ] 5.3 Optimiser queries Supabase:
  - Indexes manquants
  - Pagination curseur
  - Cache côté client (SWR/TanStack)
- [ ] 5.4 Installer et configurer React Query:
  - `bun add @tanstack/react-query`
  - Provider setup
  - Hooks custom pour tasks, children
- [ ] 5.5 Implémenter prefetching:
  - Prefetch week view depuis dashboard
  - Prefetch task detail au hover
- [ ] 5.6 Optimiser images:
  - Composant Image optimisé
  - Formats WebP/AVIF
  - Lazy loading

---

## Phase 6: Sécurité & RGPD

- [ ] 6.1 Audit RLS policies:
  - Vérifier toutes les tables
  - Test policies avec différents users
- [ ] 6.2 Créer `src/app/api/account/delete/route.ts`:
  - Suppression compte complète
  - Cascade sur toutes les données
  - Email confirmation
- [ ] 6.3 Créer `src/app/api/export/data/route.ts`:
  - Export RGPD complet (JSON)
  - Toutes données utilisateur
  - Format standardisé
- [ ] 6.4 Ajouter page privacy dans settings:
  - `src/app/(dashboard)/settings/privacy/page.tsx`
  - Bouton exporter mes données
  - Bouton supprimer mon compte
- [ ] 6.5 Implémenter rate limiting:
  - Middleware rate limit
  - Protection endpoints sensibles
- [ ] 6.6 Logs sécurisés:
  - Anonymisation données sensibles
  - Retention policy

---

## Phase 7: UX Mobile Améliorations

- [ ] 7.1 Améliorer responsive design:
  - Audit tous les composants mobile
  - Fix overflow issues
  - Touch targets 44px minimum
- [ ] 7.2 Ajouter pull-to-refresh:
  - Sur TaskList
  - Sur Dashboard
- [ ] 7.3 Améliorer SwipeableTaskCard:
  - Feedback haptique (si disponible)
  - Animation plus fluide
  - Thresholds ajustés
- [ ] 7.4 Optimiser MobileNav:
  - Highlight page courante
  - Badge notifications
  - Animation transitions

---

## Phase 8: Documentation & Cleanup

- [ ] 8.1 Créer CHANGELOG.md:
  - Features Sprint 1-6
  - Format Keep a Changelog
- [ ] 8.2 Nettoyer code mort:
  - Supprimer imports inutilisés
  - Supprimer fichiers obsolètes
- [ ] 8.3 Vérifier console.log:
  - Supprimer tous les console.log dev
  - Remplacer par logger si nécessaire
- [ ] 8.4 Audit accessibilité:
  - Labels ARIA
  - Navigation clavier
  - Contraste couleurs

---

## Phase 9: Tests et Validation Finale

- [ ] 9.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 9.2 `bun run build` - build production OK
- [ ] 9.3 `bun test` - tous tests passent
- [ ] 9.4 `bun run e2e` - tests E2E passent
- [ ] 9.5 Lighthouse audit > 90 sur toutes métriques

---

## Definition of Done Sprint 6
- [ ] Export PDF fonctionnel (charge + historique)
- [ ] Push notifications configurées
- [ ] i18n FR/EN fonctionnel
- [ ] Tests E2E couvrent flows critiques
- [ ] Bundle optimisé < 200KB first load
- [ ] RGPD compliant (export, suppression)
- [ ] Mobile UX améliorée
- [ ] Zéro erreur TypeScript
- [ ] Build production OK
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
- PDF doit être généré côté serveur (streaming)
- Firebase Admin SDK = server-side only
- i18n = Server Components compatibles
- Tests E2E avec data-testid obligatoires
- RLS pour toutes nouvelles tables

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints

---

## ⚠️ RAPPEL IMPORTANT ⚠️

**RIGUEUR MAXIMALE:**
1. **PAS DE MOCKS** - Tout le code doit fonctionner réellement
2. **CONNEXIONS VRAIES** - AWS Cognito, PostgreSQL, S3, SES, Stripe
3. **TESTS RÉELS** - Tests qui appellent les vrais services
4. **VALIDATION ZOD** - Tous les inputs validés
5. **GESTION ERREURS** - Try/catch partout, logs utiles
6. **TYPES STRICTS** - ZERO `any`

**L'APP DOIT ÊTRE DÉPLOYABLE EN PRODUCTION !**

