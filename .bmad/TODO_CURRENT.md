# TODO CURRENT - Sprint 14: Task Catalogue & i18n

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter le catalogue de tâches automatiques (génération selon âge enfant), le système de jokers premium, et préparer l'internationalisation.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Task Catalogue System

- [ ] 1.1 Créer `src/lib/services/task-catalogue.ts`:
  - getTasksForChildAge() - Tâches selon l'âge
  - getSeasonalTasks() - Tâches selon la période (rentrée, Noël, etc.)
  - generateAutomaticTasks() - Génération hebdomadaire
  - getCatalogueCategories() - Liste des catégories

- [ ] 1.2 Créer table catalogue_tasks:
  ```sql
  CREATE TABLE catalogue_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_fr TEXT NOT NULL,
    title_en TEXT,
    description_fr TEXT,
    category_code TEXT NOT NULL,
    min_age_months INT,
    max_age_months INT,
    period TEXT[], -- ['september', 'january']
    recurrence TEXT, -- yearly, monthly, once
    typical_deadline_days INT DEFAULT 7,
    charge_weight INT DEFAULT 3,
    country_codes TEXT[] DEFAULT '{ALL}'
  );
  ```

- [ ] 1.3 Seed catalogue initial (20+ tâches):
  - Rentrée scolaire (septembre)
  - Vaccins par âge
  - Inscriptions activités
  - Paperasse CAF/impôts
  - Anniversaires enfants

- [ ] 1.4 Créer API endpoints:
  - `src/app/api/catalogue/route.ts` - Liste du catalogue
  - `src/app/api/catalogue/suggestions/route.ts` - Suggestions personnalisées

- [ ] 1.5 Tests catalogue (≥15 tests)

---

## Phase 2: Joker System (Premium Feature)

- [ ] 2.1 Créer `src/lib/services/joker.ts`:
  - useJoker() - Utiliser un joker pour sauver le streak
  - getJokerStatus() - Nombre restant
  - resetMonthlyJokers() - Reset mensuel
  - checkJokerEligibility() - Peut-on utiliser un joker?

- [ ] 2.2 Ajouter champs household:
  - jokers_available INT DEFAULT 0
  - joker_last_used_at TIMESTAMP
  - joker_reset_at TIMESTAMP

- [ ] 2.3 Créer composants UI:
  - `src/components/custom/JokerButton.tsx`
  - `src/components/custom/JokerModal.tsx`
  - `src/components/custom/StreakRecovery.tsx`

- [ ] 2.4 Tests joker (≥10 tests)

---

## Phase 3: Internationalization Setup

- [ ] 3.1 Installer et configurer next-intl:
  - next-intl package
  - Middleware pour locale detection
  - Structure messages/fr.json, messages/en.json

- [ ] 3.2 Créer dictionnaires:
  - common.json - Mots communs
  - tasks.json - Tâches et catégories
  - notifications.json - Messages notifications
  - errors.json - Messages d'erreur

- [ ] 3.3 Migrer composants principaux:
  - Dashboard
  - TaskCard
  - Navigation
  - Forms

- [ ] 3.4 Tests i18n (≥10 tests)

---

## Phase 4: Balance Alerts Enhancement

- [ ] 4.1 Améliorer `src/lib/services/charge-balance.ts`:
  - Alertes automatiques > 60/40
  - Suggestions rééquilibrage
  - Rapport hebdomadaire

- [ ] 4.2 Créer notifications balance:
  - Email résumé hebdomadaire
  - Push si déséquilibre critique
  - In-app banners

- [ ] 4.3 Créer composants:
  - `src/components/custom/BalanceAlert.tsx`
  - `src/components/custom/WeeklyReport.tsx`

- [ ] 4.4 Tests balance (≥10 tests)

---

## Phase 5: PDF Export

- [ ] 5.1 Installer react-pdf ou jspdf
- [ ] 5.2 Créer `src/lib/services/pdf-export.ts`:
  - exportWeeklyReport() - Rapport semaine
  - exportMonthlyReport() - Rapport mois
  - exportChildHistory() - Historique enfant

- [ ] 5.3 Créer API endpoint:
  - `src/app/api/export/pdf/route.ts`

- [ ] 5.4 Tests export (≥5 tests)

---

## Definition of Done Sprint 14
- [ ] Catalogue de tâches automatiques fonctionnel
- [ ] Système de jokers implémenté
- [ ] i18n setup complet (FR/EN)
- [ ] Alertes balance automatiques
- [ ] Export PDF disponible
- [ ] Build production OK: `bunx tsc --noEmit && bun run build`
- [ ] Tous les tests passent: `bun test src/tests/`
- [ ] ≥50 nouveaux tests

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
