# TODO CURRENT - Sprint 16: Voice & Task Catalog

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter la fonctionnalité vocale (dictée → tâche automatique) et le catalogue automatique de tâches par âge/période.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier que les tests passent: `bun test src/tests/`

---

## Phase 1: Voice Input Pipeline ✅

- [x] 1.1 Créer `src/lib/voice/transcription.ts`:
  - Intégration Whisper API (OpenAI)
  - Fallback Deepgram (si configuré)
  - Normalisation du texte
  - Gestion des langues (fr, en)

- [x] 1.2 Créer `src/lib/voice/semantic-analysis.ts`:
  - Analyse sémantique LLM (GPT-4/Claude)
  - Extraction des champs: action, enfant, date, catégorie, urgence
  - Scoring de confiance
  - Prompt optimisé pour tâches parentales

- [x] 1.3 Créer API endpoints vocaux:
  - `src/app/api/voice/transcribe/route.ts` - STT
  - `src/app/api/voice/analyze/route.ts` - Analyse sémantique
  - `src/app/api/voice/create-task/route.ts` - Pipeline complet

- [x] 1.4 Créer composant VoiceButton:
  - `src/components/voice/VoiceButton.tsx`
  - `src/components/voice/VoiceRecorder.tsx`
  - Feedback visuel (recording, processing)
  - Hook `useVoiceRecording`

- [x] 1.5 Tests voice pipeline (30 tests)

---

## Phase 2: Task Catalog System ✅

- [x] 2.1 Créer schéma task_templates:
  - `src/lib/catalog/types.ts` - Types pour templates
  - `src/lib/catalog/templates.ts` - Catalogue par âge/période (50+ templates)
  - Règles par tranche d'âge (0-3, 3-6, 6-11, 11-15, 15-18)
  - Règles par période (septembre, décembre, juin...)

- [x] 2.2 Créer `src/lib/catalog/generator.ts`:
  - Génération automatique de tâches
  - Filtrage par âge des enfants
  - Filtrage par période de l'année
  - Calcul poids de charge

- [x] 2.3 Créer API endpoints catalog:
  - `src/app/api/catalog/templates/route.ts`
  - `src/app/api/catalog/generate/route.ts`
  - `src/app/api/catalog/suggestions/route.ts`

- [x] 2.4 Créer composants catalog:
  - `src/components/catalog/TaskTemplateCard.tsx`
  - `src/components/catalog/CatalogBrowser.tsx`
  - `src/components/catalog/SuggestedTasks.tsx`

- [x] 2.5 Tests catalog (38 tests)

---

## Phase 3: Load Distribution Engine ✅

- [x] 3.1 Créer `src/lib/distribution/calculator.ts`:
  - Calcul charge par parent
  - Poids par type de tâche
  - Score hebdomadaire

- [x] 3.2 Créer `src/lib/distribution/assigner.ts`:
  - Assignation automatique au parent le moins chargé
  - Rotation si égalité
  - Gestion des exclusions temporaires

- [x] 3.3 Créer API endpoints distribution:
  - `src/app/api/distribution/stats/route.ts`
  - `src/app/api/distribution/balance/route.ts`

- [x] 3.4 Créer composants distribution:
  - `src/components/distribution/LoadChart.tsx`
  - `src/components/distribution/BalanceAlert.tsx`
  - `src/components/distribution/WeeklyStats.tsx`

- [x] 3.5 Tests distribution (34 tests)

---

## Phase 4: Streak System ✅

- [x] 4.1 Créer `src/lib/streak/calculator.ts`:
  - Calcul streak quotidien
  - Règles de rupture
  - Joker premium

- [x] 4.2 Créer API endpoints streak:
  - `src/app/api/streak/status/route.ts`
  - `src/app/api/streak/validate/route.ts`

- [x] 4.3 Créer composants streak:
  - `src/components/streak/StreakCounter.tsx`
  - `src/components/streak/StreakAnimation.tsx`

- [x] 4.4 Tests streak (27 tests)

---

## Definition of Done Sprint 16 ✅
- [x] Voice pipeline fonctionnel (dictée → tâche)
- [x] Catalogue tâches par âge/période
- [x] Moteur de répartition opérationnel
- [x] Streak system implémenté
- [x] Build production OK: `bunx tsc --noEmit && bun run build`
- [x] Tous les tests passent: `bun test src/tests/`
- [x] ≥45 nouveaux tests (129+ tests: 30 voice + 38 catalog + 34 distribution + 27 streak)

---

## Sprint 16 COMPLETED ✅

**Résumé:**
- 4 phases complétées
- 129+ nouveaux tests ajoutés
- Build production OK
- 1435 tests totaux passent

**Files créés:**
- Voice: useVoiceRecording hook, VoiceRecorder, VoiceButton, API endpoints
- Catalog: 50+ task templates, generator, browser components
- Distribution: calculator, assigner, LoadChart, BalanceAlert, WeeklyStats
- Streak: calculator with milestones/joker, StreakCounter, StreakAnimation

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
