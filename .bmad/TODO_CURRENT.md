# TODO CURRENT - Sprint 9: Polish, Performance & UX Excellence

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Polir l'application pour une expérience utilisateur de niveau production: animations, feedback, accessibilité, performance, et robustesse.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Animations & Micro-interactions

- [x] 1.1 Créer `src/lib/animations.ts`:
  - Définir les variantes Framer Motion réutilisables
  - fadeIn, slideIn, scaleIn, staggerChildren
  - Durées et easings cohérents
- [x] 1.2 Ajouter animations au TaskCard:
  - Animation d'entrée (stagger)
  - Animation de complétion (scale + fade)
  - Animation de suppression (slide out)
- [x] 1.3 Ajouter animations au VocalButton:
  - Pulse animation pendant enregistrement
  - Feedback visuel de succès/erreur
  - Waveform animation
- [x] 1.4 Ajouter animations aux modals/dialogs:
  - Scale in/out
  - Backdrop blur transition
- [x] 1.5 Tests visuels animations (snapshots)

---

## Phase 2: Loading States & Skeleton UI

- [x] 2.1 Créer composant `TaskCardSkeleton.tsx`:
  - Skeleton pour les cartes de tâches
  - Animation shimmer
- [x] 2.2 Créer composant `DashboardSkeleton.tsx`:
  - Skeleton pour le dashboard complet
  - Layout matching
- [x] 2.3 Créer composant `ChargeSkeleton.tsx`:
  - Skeleton pour les graphiques de charge
  - Animated bars
- [x] 2.4 Ajouter Suspense boundaries aux pages:
  - /dashboard
  - /tasks
  - /charge
  - /children
- [x] 2.5 Tests unitaires skeletons

---

## Phase 3: Error Handling & Recovery

- [x] 3.1 Améliorer `ErrorBoundary.tsx`:
  - Capture des erreurs par composant
  - UI de récupération élégante
  - Bouton "Réessayer"
  - Logging automatique des erreurs
- [x] 3.2 Créer `src/lib/error-reporting.ts`:
  - Centraliser la gestion d'erreurs
  - Format d'erreur standardisé
  - Queue d'erreurs pour batch reporting
- [x] 3.3 Ajouter error states aux formulaires:
  - TaskForm error recovery
  - ChildForm error recovery
  - VocalRecorder error handling
- [x] 3.4 Créer `toast-notifications.tsx`:
  - Notifications toast pour feedback utilisateur
  - Success, error, warning, info variants
  - Auto-dismiss avec timer
- [x] 3.5 Tests error handling

---

## Phase 4: Accessibilité (a11y)

- [ ] 4.1 Audit et fix focus management:
  - Focus visible sur tous les éléments interactifs
  - Focus trap dans les modals
  - Skip links pour navigation clavier
- [ ] 4.2 Améliorer les labels ARIA:
  - aria-label sur les boutons icônes
  - aria-describedby pour les champs de formulaire
  - aria-live pour les notifications
- [ ] 4.3 Améliorer le contraste couleurs:
  - Vérifier ratio WCAG AA (4.5:1)
  - Mode high contrast
- [ ] 4.4 Support clavier complet:
  - Navigation dans TaskList avec flèches
  - Raccourcis clavier (n = nouvelle tâche, etc.)
  - Escape ferme les modals
- [ ] 4.5 Tests a11y avec axe-core

---

## Phase 5: Performance Optimizations

- [ ] 5.1 Optimiser les re-renders:
  - useMemo pour calculs lourds (charge calculation)
  - useCallback pour handlers
  - React.memo sur composants statiques
- [ ] 5.2 Lazy loading des composants:
  - Dynamic import pour VocalRecorder
  - Dynamic import pour ChargeWeekChart
  - Dynamic import pour modals
- [ ] 5.3 Optimiser les images:
  - next/image partout
  - Sizes optimisés
  - Placeholder blur
- [ ] 5.4 Optimiser le bundle:
  - Analyser avec `next build --analyze`
  - Tree shaking des imports
  - Code splitting par route
- [ ] 5.5 Tests performance (Lighthouse CI)

---

## Phase 6: Offline & PWA Enhancements

- [ ] 6.1 Améliorer le service worker:
  - Cache des assets statiques
  - Cache des API responses (stale-while-revalidate)
  - Background sync pour tâches offline
- [ ] 6.2 Créer `src/components/custom/OfflineIndicator.tsx`:
  - Détection de l'état offline
  - Banner visible quand offline
  - Queue des actions en attente
- [ ] 6.3 Optimistic updates:
  - TaskCard completion optimistic
  - TaskCard deletion optimistic
  - Rollback en cas d'erreur
- [ ] 6.4 Tests offline behavior

---

## Phase 7: Final Polish

- [ ] 7.1 Audit UI consistency:
  - Spacing cohérent (4px grid)
  - Radius cohérents
  - Shadows cohérentes
- [ ] 7.2 Améliorer les empty states:
  - Illustrations pour états vides
  - Call-to-action clairs
  - Messages encourageants
- [ ] 7.3 Améliorer le feedback tactile:
  - Haptic feedback sur mobile (si supporté)
  - Touch ripple effects
- [ ] 7.4 Final build verification:
  - `bunx tsc --noEmit` - ZERO erreurs
  - `bun run build` - OK
  - `bun test` - tous les tests passent

---

## Definition of Done Sprint 9
- [ ] Animations fluides sur TaskCard, VocalButton, modals
- [ ] Skeleton UI sur toutes les pages avec loading states
- [ ] Error boundaries avec UI de récupération
- [ ] Toast notifications fonctionnelles
- [ ] Accessibilité WCAG AA respectée
- [ ] Performance: Lighthouse > 90 sur tous les scores
- [ ] Offline mode basique fonctionnel
- [ ] Build production OK
- [ ] Tests passent (200+ tests)

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
