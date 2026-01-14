# TODO CURRENT - Sprint 2: Tasks Core + Vocal MVP + Dashboard

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Avoir le système de tâches fonctionnel avec création vocale et dashboard de visualisation.

---

## PRÉ-REQUIS
- [x] 0.1 Lire MASTER_PROMPT.md entièrement
- [x] 0.2 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.3 Vérifier que les services AWS sont accessibles (Cognito, PostgreSQL)

---

## Phase 1: Schéma Base de Données Tasks

- [x] 1.1 Schéma `tasks` déjà présent dans `src/lib/aws/auth-schema.sql`
- [x] 1.2 RLS policies pour tasks (SELECT, INSERT, UPDATE via household_members)
- [ ] 1.3 Exécuter le schema SQL dans PostgreSQL AWS (MANUEL)

---

## Phase 2: Validations Zod Tasks

- [x] 2.1 Créer `src/lib/validations/task.ts`:
  - TaskCreateSchema (title, category, deadline?, child_id?, priority?, description?)
  - TaskUpdateSchema (partial)
  - TaskStatusSchema (status enum)
  - TaskCategorySchema (enum des catégories)
  - TaskFilterSchema (pour query)

---

## Phase 3: Server Actions Tasks CRUD

- [x] 3.1 Créer `src/lib/actions/tasks.ts` avec:
  - `createTask(data)` - création manuelle
  - `updateTask(id, data)` - modification
  - `deleteTask(id)` - suppression
  - `completeTask(id)` - marquer comme fait
  - `postponeTask(id, newDeadline)` - reporter
  - `getTasks(filters)` - liste avec filtres
  - `getTasksByChild(childId)` - tâches par enfant
  - `getTodayTasks()` - tâches du jour
  - `getWeekTasks()` - tâches de la semaine
  - `reassignTask(id, userId)` - changer assignation

---

## Phase 4: Types TypeScript Tasks

- [x] 4.1 Créer/mettre à jour `src/types/task.ts`:
  - Task interface
  - TaskCreate type
  - TaskUpdate type
  - TaskCategory enum
  - TaskStatus enum
  - TaskPriority enum
  - TaskSource enum
  - TaskFilter type

---

## Phase 5: Composants UI Tasks

- [x] 5.1 Créer `src/components/custom/TaskForm.tsx` - formulaire création/édition
- [x] 5.2 Créer `src/components/custom/TaskCard.tsx` - affichage tâche avec actions
- [x] 5.3 Créer `src/components/custom/TaskList.tsx` - liste de tâches groupées
- [x] 5.4 Créer `src/components/custom/TaskFilters.tsx` - filtres (catégorie, statut, enfant)
- [x] 5.5 Créer `src/components/custom/TaskPriorityBadge.tsx` - badge priorité coloré
- [x] 5.6 Créer `src/components/custom/TaskCategoryIcon.tsx` - icône par catégorie
- [x] 5.7 Ajouter composants shadcn nécessaires (Select, Badge, Calendar, etc.)

---

## Phase 6: Pages Tasks

- [x] 6.1 Créer `src/app/(dashboard)/tasks/page.tsx` - liste toutes les tâches
- [x] 6.2 Créer `src/app/(dashboard)/tasks/new/page.tsx` - création tâche manuelle
- [x] 6.3 Créer `src/app/(dashboard)/tasks/[id]/page.tsx` - détail/édition tâche
- [x] 6.4 Créer `src/app/(dashboard)/tasks/today/page.tsx` - vue "Aujourd'hui"

---

## Phase 7: Vocal MVP - Infrastructure

- [x] 7.1 Installer dépendances: `bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner openai`
- [x] 7.2 Créer `src/lib/aws/s3.ts`:
  - `generateUploadUrl(filename)` - URL présignée pour upload
  - `generateDownloadUrl(key)` - URL présignée pour download
  - `deleteFile(key)` - suppression fichier
- [x] 7.3 Créer `src/lib/vocal/transcribe.ts`:
  - `transcribeAudio(audioUrl)` - appel Whisper API
  - Configuration OpenAI client

---

## Phase 8: Vocal MVP - Analyse Sémantique

- [x] 8.1 Créer `src/lib/vocal/analyze.ts`:
  - `analyzeTranscript(text)` - extraction via LLM
  - Prompt sémantique (action, enfant, date, catégorie, urgence)
  - `matchChild(name, householdId)` - trouver enfant par prénom
  - `inferDeadline(text)` - déduire deadline du contexte
- [x] 8.2 Créer `src/lib/validations/vocal.ts`:
  - VocalAnalysisSchema - résultat analyse LLM
  - VocalTaskSchema - tâche extraite

---

## Phase 9: Vocal MVP - Composants

- [x] 9.1 Créer `src/components/custom/VocalButton.tsx`:
  - Bouton micro avec états (idle, recording, processing)
  - Feedback visuel (animation pulsation)
  - Timer max 30s
  - Upload automatique
- [x] 9.2 Créer `src/components/custom/VocalConfirmation.tsx`:
  - Affichage tâche extraite
  - Boutons confirmer/modifier/annuler
  - Édition rapide si besoin
- [x] 9.3 Créer `src/hooks/useVocalRecording.ts`:
  - MediaRecorder API
  - Gestion états
  - Upload vers S3
  - Appel transcription

---

## Phase 10: Vocal MVP - API Routes

- [x] 10.1 Créer `src/app/api/vocal/upload/route.ts`:
  - Générer URL présignée S3
  - Retourner URL et key
- [x] 10.2 Créer `src/app/api/vocal/transcribe/route.ts`:
  - Récupérer audio depuis S3
  - Appeler Whisper API
  - Retourner transcription
- [x] 10.3 Créer `src/app/api/vocal/analyze/route.ts`:
  - Analyser transcription avec LLM
  - Extraire champs tâche
  - Matcher enfant si mentionné
  - Retourner TaskCreate pré-rempli
- [x] 10.4 Créer `src/app/api/vocal/create-task/route.ts`:
  - Créer tâche depuis analyse vocale
  - Stocker transcript original

---

## Phase 11: Dashboard Principal

- [x] 11.1 Mettre à jour `src/app/(dashboard)/dashboard/page.tsx` - dashboard home:
  - Section "Aujourd'hui" (tâches urgentes)
  - Section "Cette semaine" (vue 7 jours)
  - Bouton vocal flottant
  - Streak du foyer
- [x] 11.2 Créer `src/components/custom/DashboardToday.tsx`:
  - Liste tâches du jour par priorité
  - Quick actions (fait/reporté)
  - Compteur tâches restantes
- [x] 11.3 Créer `src/components/custom/DashboardWeek.tsx`:
  - Vue semaine condensée
  - Indicateurs par jour
- [x] 11.4 Créer `src/components/custom/StreakCounter.tsx`:
  - Affichage streak actuel
  - Animation si streak maintenu
- [x] 11.5 Créer `src/components/custom/ChargeBalance.tsx`:
  - % charge par parent (barre visuelle)
  - Alerte si déséquilibre > 60/40

---

## Phase 12: Calcul Charge Mentale

- [x] 12.1 Créer `src/lib/services/charge.ts`:
  - `calculateCharge(userId, period)` - somme poids tâches
  - `getHouseholdBalance(householdId)` - répartition par parent
  - `assignToLeastLoaded(householdId)` - auto-assignation
- [x] 12.2 Créer constantes poids par catégorie dans `src/lib/constants/task-weights.ts`

---

## Phase 13: Tests

- [x] 13.1 Créer `src/tests/tasks-test.ts`:
  - Test CRUD tâches (validations)
  - Test filtres
  - Test calcul charge
- [x] 13.2 Créer `src/tests/vocal-test.ts`:
  - Test upload S3 (schemas)
  - Test transcription (schemas)
  - Test analyse sémantique
- [ ] 13.3 Vérifier RLS: un user ne peut pas voir les tâches d'un autre foyer (MANUEL)

---

## Phase 14: Build & Validation

- [x] 14.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [x] 14.2 `bun run build` - build production OK
- [ ] 14.3 Test manuel: créer tâche manuelle → voir dans dashboard
- [ ] 14.4 Test manuel: enregistrement vocal → transcription → création tâche

---

## Definition of Done Sprint 2
- [x] CRUD tâches complet et fonctionnel
- [x] Enregistrement vocal fonctionnel (max 30s)
- [x] Transcription Whisper intégrée
- [x] Analyse sémantique LLM fonctionnelle
- [x] Dashboard avec vue "Aujourd'hui" et "Semaine"
- [x] Bouton vocal accessible depuis dashboard
- [x] Calcul charge mentale par parent
- [x] Build production sans erreur
- [x] Types stricts partout (no `any`)

---

## Variables d'environnement requises (ajouter)
```env
# Existantes
DATABASE_URL=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
AWS_S3_BUCKET=

# Nouvelles Sprint 2
OPENAI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

---

## Commandes utiles
```bash
bun dev                    # Dev server
bun build                  # Production build
bunx tsc --noEmit          # Type check
bun run src/tests/tasks-test.ts    # Test tasks
bun run src/tests/vocal-test.ts    # Test vocal
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- Si bloqué sur S3 → vérifier credentials AWS
- Si Whisper rate limit → implémenter retry avec backoff
- Poids catégories: voir MASTER_PROMPT.md section "Poids par type"

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## ⚠️ INSTRUCTION AUTOMATIQUE ⚠️

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints

