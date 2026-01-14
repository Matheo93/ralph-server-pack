# TODO CURRENT - Sprint 7: PWA, Analytics & Production Hardening

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Transformer l'application en PWA installable avec analytics, optimisations de performance avancées, et tests E2E complets.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: PWA - Progressive Web App

- [ ] 1.1 Créer `public/manifest.json`:
  - name, short_name, description
  - start_url: "/dashboard"
  - display: "standalone"
  - theme_color, background_color
  - icons: 192x192, 512x512
- [ ] 1.2 Créer icônes PWA:
  - `public/icons/icon-192.png`
  - `public/icons/icon-512.png`
  - `public/icons/apple-touch-icon.png`
- [ ] 1.3 Configurer Service Worker avec `next-pwa`:
  - `bun add next-pwa`
  - Configuration dans next.config.ts
  - Cache stratégique (stale-while-revalidate)
- [ ] 1.4 Ajouter meta tags PWA dans `src/app/layout.tsx`:
  - <link rel="manifest">
  - <meta name="theme-color">
  - <meta name="apple-mobile-web-app-capable">
  - <link rel="apple-touch-icon">
- [ ] 1.5 Créer composant `InstallPrompt`:
  - Détection beforeinstallprompt
  - Bouton "Installer l'app"
  - LocalStorage pour ne pas re-proposer

---

## Phase 2: Analytics & Monitoring

- [ ] 2.1 Créer `src/lib/analytics/index.ts`:
  - `trackEvent(name, properties)`
  - `trackPageView(path)`
  - `identifyUser(userId)`
  - Support multiple providers (Plausible, Posthog)
- [ ] 2.2 Créer `src/lib/analytics/events.ts`:
  - Événements clés: task_created, task_completed, vocal_used
  - Conversion: signup, subscription_started
  - Engagement: streak_milestone, app_installed
- [ ] 2.3 Créer `src/components/custom/AnalyticsProvider.tsx`:
  - Client component wrapper
  - Initialisation provider
  - Consent management (RGPD)
- [ ] 2.4 Ajouter tracking dans pages critiques:
  - Dashboard: page_view, task actions
  - Onboarding: funnel tracking
  - Vocal: usage tracking
- [ ] 2.5 Créer `src/app/api/analytics/route.ts`:
  - Endpoint server-side pour events
  - Validation Zod
  - Rate limiting basique

---

## Phase 3: Optimisations Performance

- [ ] 3.1 Optimiser images avec next/image:
  - Audit des <img> existants
  - Remplacer par <Image>
  - Ajouter placeholder="blur"
- [ ] 3.2 Implémenter prefetching intelligent:
  - Links avec prefetch
  - Route preloading
- [ ] 3.3 Ajouter lazy loading:
  - Composants lourds (charts, PDF)
  - Dynamic imports
- [ ] 3.4 Optimiser bundle:
  - Analyser avec `@next/bundle-analyzer`
  - Code splitting
  - Tree shaking
- [ ] 3.5 Créer `src/components/ui/optimized-image.tsx`:
  - Wrapper next/image avec defaults
  - Blur placeholder génération
  - Responsive srcset

---

## Phase 4: Tests E2E Avancés

- [ ] 4.1 Créer `e2e/tasks.spec.ts`:
  - Test création tâche
  - Test complétion tâche (swipe)
  - Test filtres et tri
  - Test assignation
- [ ] 4.2 Créer `e2e/vocal.spec.ts`:
  - Test enregistrement audio
  - Test transcription mockée
  - Test création tâche vocale
- [ ] 4.3 Créer `e2e/charge.spec.ts`:
  - Test affichage balance
  - Test graphique semaine
  - Test export PDF
- [ ] 4.4 Créer `e2e/onboarding.spec.ts`:
  - Test flow complet
  - Test création foyer
  - Test ajout enfant
  - Test invitation co-parent
- [ ] 4.5 Créer fixtures et helpers:
  - `e2e/fixtures/test-user.ts`
  - `e2e/helpers/auth.ts`
  - Mock API responses

---

## Phase 5: Accessibilité & SEO

- [ ] 5.1 Audit accessibilité complet:
  - aria-labels sur tous boutons
  - Focus management
  - Skip links
  - Color contrast
- [ ] 5.2 Améliorer SEO:
  - Meta descriptions dynamiques
  - Open Graph tags
  - Twitter cards
  - Structured data (JSON-LD)
- [ ] 5.3 Créer `src/app/sitemap.ts`:
  - Sitemap dynamique
  - Pages publiques
- [ ] 5.4 Créer `src/app/robots.ts`:
  - Configuration robots.txt
  - Disallow admin routes
- [ ] 5.5 Ajouter aria-live regions:
  - Notifications toast
  - Chargements
  - Messages d'erreur

---

## Phase 6: Error Handling & Monitoring

- [ ] 6.1 Créer Error Boundaries:
  - `src/components/custom/ErrorBoundary.tsx`
  - Fallback UI élégant
  - Logging erreurs
- [ ] 6.2 Créer pages d'erreur custom:
  - `src/app/error.tsx` (global error)
  - `src/app/not-found.tsx` (amélioré)
  - Messages utilisateur friendly
- [ ] 6.3 Ajouter health check endpoint:
  - `src/app/api/health/route.ts`
  - Vérification DB, Redis, S3
  - Status page data
- [ ] 6.4 Implémenter retry logic:
  - React Query retry config
  - Exponential backoff
  - User feedback

---

## Phase 7: Documentation & Cleanup Final

- [ ] 7.1 Mettre à jour CHANGELOG.md
- [ ] 7.2 Créer API_REFERENCE.md:
  - Tous les endpoints
  - Authentification
  - Rate limits
- [ ] 7.3 Vérifier tous les console.log retirés
- [ ] 7.4 Audit final sécurité:
  - Headers HTTP
  - CORS configuration
  - CSP headers
- [ ] 7.5 Performance budget:
  - Lighthouse CI config
  - Target: 90+ sur toutes métriques

---

## Phase 8: Tests et Validation Finale

- [ ] 8.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 8.2 `bun run build` - build production OK
- [ ] 8.3 `bun test` - tous tests passent
- [ ] 8.4 `bun run e2e` - tests E2E passent
- [ ] 8.5 Lighthouse audit > 90 sur toutes métriques

---

## Definition of Done Sprint 7
- [ ] PWA installable (manifest, service worker)
- [ ] Analytics fonctionnel avec consent RGPD
- [ ] Images optimisées et lazy loading
- [ ] Tests E2E complets (tasks, vocal, charge, onboarding)
- [ ] Accessibilité WCAG 2.1 AA
- [ ] SEO optimisé (sitemap, robots, meta)
- [ ] Error boundaries et error pages
- [ ] Health check endpoint
- [ ] Documentation API
- [ ] Lighthouse 90+ sur toutes métriques
- [ ] Zéro erreur TypeScript
- [ ] Build production OK

---

## Variables d'environnement NOUVELLES
```env
NEXT_PUBLIC_ANALYTICS_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

---

## Commandes utiles
```bash
bun dev                    # Dev server
bun build                  # Production build
bunx tsc --noEmit          # Type check
bun test                   # Run unit tests
bun run e2e                # Run E2E tests
bunx @next/bundle-analyzer # Analyze bundle
bunx lighthouse            # Run Lighthouse
```

---

## Notes
- PWA avec next-pwa pour génération automatique du SW
- Analytics avec Plausible (privacy-first) ou Posthog
- Tests E2E nécessitent auth mockée ou test user
- Lighthouse CI pour tracking performance continue
- Focus sur Core Web Vitals (LCP, FID, CLS)

---

## Fichiers à créer dans ce sprint

### Phase 1 (PWA)
- `public/manifest.json`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`
- `src/components/custom/InstallPrompt.tsx`

### Phase 2 (Analytics)
- `src/lib/analytics/index.ts`
- `src/lib/analytics/events.ts`
- `src/components/custom/AnalyticsProvider.tsx`
- `src/app/api/analytics/route.ts`

### Phase 3 (Performance)
- `src/components/ui/optimized-image.tsx`

### Phase 4 (E2E)
- `e2e/tasks.spec.ts`
- `e2e/vocal.spec.ts`
- `e2e/charge.spec.ts`
- `e2e/onboarding.spec.ts`
- `e2e/fixtures/test-user.ts`
- `e2e/helpers/auth.ts`

### Phase 5 (SEO)
- `src/app/sitemap.ts`
- `src/app/robots.ts`

### Phase 6 (Error Handling)
- `src/components/custom/ErrorBoundary.tsx`
- `src/app/error.tsx`
- `src/app/api/health/route.ts`

### Phase 7 (Documentation)
- `API_REFERENCE.md`

---

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
