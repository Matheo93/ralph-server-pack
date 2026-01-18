# Sprint 22 - Tests, Performance & UX Polish

## Phase 1: Corrections UTF-8
- [x] Corriger les accents dans src/app/(dashboard)/calendar/page.tsx ("evenements" → "événements")
- [ ] Corriger les accents dans src/app/(dashboard)/shopping/page.tsx ("Gerez" → "Gérez", "differentes" → "différentes")
- [ ] Auditer et corriger tous les accents manquants dans les fichiers .tsx restants

## Phase 2: Tests E2E pour les nouvelles features
- [ ] Créer e2e/calendar.spec.ts - Tests E2E pour le calendrier familial (navigation mois, création événement, modification, suppression)
- [ ] Créer e2e/shopping.spec.ts - Tests E2E pour la liste de courses (ajout item, toggle, suppression, catégories)
- [ ] Créer e2e/kids-dashboard.spec.ts - Tests E2E pour le dashboard enfant (connexion PIN, voir tâches, compléter tâche)
- [ ] Créer e2e/kids-shop.spec.ts - Tests E2E pour la boutique enfant (voir récompenses, acheter avec coins)
- [ ] Créer e2e/kids-badges.spec.ts - Tests E2E pour les badges enfant (voir badges, progression)

## Phase 3: Tests unitaires manquants
- [ ] Créer src/tests/calendar-actions.test.ts - Tests pour les server actions du calendrier
- [ ] Créer src/tests/shopping-actions.test.ts - Tests pour les server actions de la liste de courses
- [ ] Créer src/tests/kids-auth.test.ts - Tests pour l'authentification enfant par PIN
- [ ] Créer src/tests/kids-rewards.test.ts - Tests pour le système de récompenses enfant
- [ ] Créer src/tests/kids-challenges.test.ts - Tests pour les défis enfants

## Phase 4: Optimisation Performance
- [ ] Ajouter lazy loading pour les composants lourds (CalendarView, ShoppingList)
- [ ] Implémenter le prefetching des données calendrier lors du hover sur les mois adjacents
- [ ] Ajouter le cache local (localStorage) pour la liste de courses en mode hors-ligne
- [ ] Optimiser les requêtes SQL avec EXPLAIN ANALYZE et ajouter les index manquants
- [ ] Implémenter la pagination pour l'historique des événements calendrier

## Phase 5: UX Polish
- [ ] Ajouter des animations de transition entre les vues du calendrier (mois/semaine)
- [ ] Implémenter le drag & drop pour réorganiser les items de la liste de courses
- [ ] Ajouter des confettis/animations lors de la complétion d'une tâche par un enfant
- [ ] Créer des skeleton loaders pour les pages Calendar, Shopping et Kids
- [ ] Améliorer le feedback visuel lors des actions (toast notifications cohérentes)

## Phase 6: Accessibilité & i18n
- [ ] Audit WCAG 2.1 AA sur les nouvelles pages (Calendar, Shopping, Kids)
- [ ] Ajouter les attributs aria-* manquants sur les composants interactifs
- [ ] Vérifier le contraste des couleurs sur l'interface Kids
- [ ] Compléter les traductions françaises manquantes dans src/messages/fr.json
- [ ] Ajouter le support du mode sombre pour l'interface Kids

## Phase 7: Fonctionnalités supplémentaires
- [ ] Ajouter l'export PDF du calendrier mensuel
- [ ] Implémenter les notifications push pour les événements calendrier (rappel 1h avant)
- [ ] Ajouter le partage de liste de courses par lien (lecture seule)
- [ ] Créer une vue "cette semaine" pour les défis enfants
- [ ] Ajouter la synchronisation en temps réel de la liste de courses (Supabase Realtime)
