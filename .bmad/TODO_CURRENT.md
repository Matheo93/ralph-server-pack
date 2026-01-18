# Sprint 3 - Qualité, Tests & UX Avancée

## Phase 1: Couverture de tests
- [x] Créer e2e/gamification.spec.ts - Tests pour le système de points, badges et niveaux
- [x] Créer e2e/kids-profile.spec.ts - Tests pour le profil enfant (dark mode, son, déconnexion)
- [x] Créer e2e/stripe-checkout.spec.ts - Tests du flow de paiement complet
- [x] Créer e2e/voice-commands.spec.ts - Tests de la création de tâches vocales
- [x] Ajouter tests unitaires pour les server actions (src/lib/actions/*.ts)

## Phase 2: Performance & Core Web Vitals
- [x] Implémenter le lazy loading des composants lourds (ChargeWeekChart, calendrier)
- [x] Optimiser les requêtes Supabase avec des indexes manquants
- [ ] Ajouter React Suspense avec des boundaries pour le streaming SSR
- [ ] Créer des skeletons spécifiques pour chaque section du dashboard
- [ ] Auditer et réduire le bundle JavaScript (analyse avec next/bundle-analyzer)

## Phase 3: UX & Accessibilité
- [ ] Ajouter des raccourcis clavier globaux (n: nouvelle tâche, /: recherche, ?: aide)
- [ ] Implémenter le focus trap dans les modales pour l'accessibilité
- [ ] Ajouter les attributs ARIA manquants sur les composants interactifs
- [ ] Créer une page /dashboard/empty avec des suggestions quand aucune tâche
- [ ] Améliorer les messages d'erreur avec des actions de récupération

## Phase 4: Fonctionnalités avancées
- [ ] Implémenter le filtrage des tâches par enfant sur /tasks
- [ ] Ajouter l'export CSV/Excel en plus du PDF existant
- [ ] Créer un système de recherche globale avec Cmd+K
- [ ] Implémenter les notifications browser avec demande de permission
- [ ] Ajouter le mode hors-ligne avec sync au retour de connexion

## Phase 5: Monitoring & Observabilité
- [ ] Ajouter le tracking des erreurs côté client (error boundary avec reporting)
- [ ] Implémenter des métriques de performance custom (temps de chargement par page)
- [ ] Créer un endpoint /api/health/detailed avec checks de toutes les dépendances
- [ ] Ajouter des logs structurés pour le debugging en production
- [ ] Implémenter le rate limiting détaillé avec alertes

## Phase 6: Sécurité & Conformité
- [ ] Audit complet des headers de sécurité (CSP, HSTS, X-Frame-Options)
- [ ] Implémenter la rotation automatique des tokens JWT
- [ ] Ajouter la validation côté serveur de toutes les URLs uploadées
- [ ] Créer des tests de sécurité automatisés (injection, XSS)
- [ ] Documenter les pratiques de sécurité dans SECURITY.md
