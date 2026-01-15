# TODO CURRENT - Sprint 10: Automatic Task Generation & Robustness

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter la génération automatique de tâches basée sur l'âge des enfants (le "catalogue automatique" du MASTER_PROMPT), améliorer la robustesse avec les tests E2E, et ajouter les features premium manquantes.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Catalogue Automatique par Âge (Feature Core)

- [ ] 1.1 Créer `src/lib/services/age-based-tasks.ts`:
  - Calculer l'âge de chaque enfant à partir de birth_date
  - Mapper l'âge aux règles du MASTER_PROMPT (0-3, 3-6, 6-11, 11-15, 15-18)
  - Récupérer les templates applicables pour l'âge
  - Générer les tâches automatiques

- [ ] 1.2 Créer `src/lib/data/age-based-templates.ts`:
  - Templates 0-3 ans: vaccins, visites PMI, mode de garde
  - Templates 3-6 ans: inscription école, assurance scolaire, réunions
  - Templates 6-11 ans: fournitures, cantine, études, sorties
  - Templates 11-15 ans: orientation, brevet, activités ados
  - Templates 15-18 ans: permis, bac, parcoursup

- [ ] 1.3 Créer `src/lib/services/period-tasks.ts`:
  - Règles par période (septembre, octobre, décembre, janvier, juin)
  - Détecter la période actuelle
  - Générer les tâches saisonnières

- [ ] 1.4 Créer API `src/app/api/cron/generate-tasks/route.ts`:
  - Endpoint pour génération quotidienne
  - Parcourir tous les foyers actifs
  - Générer les tâches pour chaque enfant
  - Éviter les duplicatas

- [ ] 1.5 Tests unitaires génération automatique

---

## Phase 2: Joker Streak (Feature Premium)

- [ ] 2.1 Créer migration `src/lib/aws/joker-schema.sql`:
  - Table `streak_jokers` (household_id, used_at, month)
  - 1 joker/mois pour abonnés premium

- [ ] 2.2 Ajouter action `src/lib/actions/streak.ts`:
  - `useJoker()` - utiliser le joker pour sauver le streak
  - `getJokerStatus()` - vérifier si joker disponible
  - Validation: abonnement actif + pas déjà utilisé ce mois

- [ ] 2.3 Créer composant `src/components/custom/JokerButton.tsx`:
  - Bouton pour utiliser le joker
  - État disabled si non premium ou déjà utilisé
  - Animation de confirmation

- [ ] 2.4 Intégrer dans `StreakCounter.tsx`:
  - Afficher le bouton joker quand streak à risque
  - Message d'avertissement avant rupture

- [ ] 2.5 Tests joker streak

---

## Phase 3: Exclusions Temporaires (Compléter)

- [ ] 3.1 Améliorer `src/lib/actions/settings.ts`:
  - `createExclusion(userId, startDate, endDate, reason)`
  - `getActiveExclusions(householdId)`
  - `deleteExclusion(exclusionId)`

- [ ] 3.2 Créer composant `src/components/custom/ExclusionForm.tsx`:
  - Formulaire de création d'exclusion
  - Raisons prédéfinies: voyage, maladie, fatigue, autre
  - Dates de début et fin

- [ ] 3.3 Créer page `src/app/(dashboard)/settings/exclusions/page.tsx`:
  - Liste des exclusions actives et passées
  - Bouton créer nouvelle exclusion
  - Suppression d'exclusion

- [ ] 3.4 Intégrer dans le moteur d'assignation:
  - Modifier `src/lib/services/assignment.ts`
  - Exclure les membres avec exclusion active
  - Réassigner automatiquement

- [ ] 3.5 Tests exclusions

---

## Phase 4: Tests E2E Playwright

- [ ] 4.1 Setup Playwright:
  - `bun add -D @playwright/test`
  - Créer `playwright.config.ts`
  - Créer `src/e2e/` directory

- [ ] 4.2 Tests authentification:
  - `src/e2e/auth.spec.ts`
  - Login, signup, logout flows
  - Protection des routes

- [ ] 4.3 Tests onboarding:
  - `src/e2e/onboarding.spec.ts`
  - Flow complet onboarding
  - Création foyer et enfants

- [ ] 4.4 Tests tâches:
  - `src/e2e/tasks.spec.ts`
  - CRUD tâches
  - Completion et suppression
  - Vue semaine

- [ ] 4.5 Tests charge mentale:
  - `src/e2e/charge.spec.ts`
  - Affichage balance
  - Graphique semaine

---

## Phase 5: Amélioration UX Dashboard

- [ ] 5.1 Améliorer `DashboardToday.tsx`:
  - Grouper les tâches par enfant
  - Tri par priorité + deadline
  - Quick actions plus visibles

- [ ] 5.2 Créer `src/components/custom/TaskSummaryCard.tsx`:
  - Card récapitulatif du jour
  - Nombre de tâches par statut
  - Tâches en retard highlight

- [ ] 5.3 Améliorer notifications in-app:
  - Badge notification dans header
  - Liste des notifications non lues
  - Mark as read

- [ ] 5.4 Ajouter tutoriel first-time user:
  - Overlay d'aide au premier login
  - Highlights des fonctionnalités clés
  - Skip option

- [ ] 5.5 Tests UX dashboard

---

## Phase 6: Performance & Monitoring

- [ ] 6.1 Ajouter métriques de performance:
  - Web Vitals tracking
  - API response times
  - Error rates

- [ ] 6.2 Optimiser les requêtes Supabase:
  - Indexes manquants
  - Pagination sur les listes longues
  - Cache Redis pour queries fréquentes

- [ ] 6.3 Implémenter rate limiting robuste:
  - Par endpoint
  - Par user
  - Alertes si dépassement

- [ ] 6.4 Audit sécurité:
  - Vérifier toutes les RLS policies
  - Tester injection SQL
  - Vérifier sanitization inputs

---

## Definition of Done Sprint 10
- [ ] Génération automatique de tâches basée sur l'âge fonctionnelle
- [ ] Joker streak implémenté pour premium users
- [ ] Exclusions temporaires complètes avec UI
- [ ] Tests E2E Playwright configurés et passants
- [ ] Dashboard UX amélioré
- [ ] Performance et monitoring en place
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
