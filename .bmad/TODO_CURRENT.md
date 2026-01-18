# Sprint 2 - Robustesse, TODOs & Améliorations

## Phase 1: Résolution des TODOs critiques
- [x] Implémenter l'upload S3 pour les photos de tâches complétées (src/app/(kids)/kids/[childId]/dashboard/TaskCompletionModal.tsx:95)
- [x] Implémenter le resend code pour la vérification email (src/app/(auth)/verify-email/VerifyEmailForm.tsx:179)
- [x] Connecter le statut premium à la vraie subscription Stripe (src/app/api/gamification/route.ts:355)
- [x] Sauvegarder l'inventaire mis à jour en base de données (src/app/api/gamification/route.ts:365)
- [x] Sauvegarder les achievements mis à jour en base de données (src/app/api/gamification/route.ts:403)
- [x] Implémenter le curseur prev pour la pagination (src/app/api/v2/tasks/route.ts:524)
- [x] Implémenter la vérification de mot de passe correcte (src/app/api/v1/auth/route.ts:89)
- [x] Détecter le level up lors de la complétion de tâche (src/lib/actions/kids-tasks.ts:664)

## Phase 2: PWA complète
- [x] Créer le manifest.json complet avec toutes les tailles d'icônes
- [x] Implémenter le service worker pour le cache offline
- [x] Ajouter les icônes PWA (192x192, 512x512, maskable)
- [x] Configurer le splash screen pour iOS et Android

## Phase 3: Animation landing page
- [x] Ajouter des animations scroll-triggered sur la landing page (style entraide-souverainiste)
- [x] Implémenter le smooth scroll global (html { scroll-behavior: smooth; })
- [x] Ajouter des micro-animations sur les CTA buttons

## Phase 4: Tests E2E manquants
- [x] Créer e2e/settings.spec.ts - Tests pour les pages de paramètres
- [x] Créer e2e/children-management.spec.ts - Tests CRUD enfants complet
- [x] Créer e2e/recurring-tasks.spec.ts - Tests pour les tâches récurrentes

## Phase 5: Sécurité & Robustesse
- [x] Audit des inputs utilisateur avec Zod sur toutes les routes API
- [x] Ajouter rate limiting sur les routes sensibles (auth, API v1/v2)
- [x] Vérifier les RLS policies pour les nouvelles tables

## Phase 6: Performance
- [x] Optimiser les images avec next/image sur toutes les pages
- [x] Ajouter le prefetching des routes fréquentes
- [x] Implémenter le stale-while-revalidate pour les données calendrier

## Phase 7: Documentation
- [ ] Créer ARCHITECTURE.md avec le schéma de la base de données
- [ ] Documenter les endpoints API dans /api/docs
