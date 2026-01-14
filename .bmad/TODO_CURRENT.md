# TODO CURRENT - Sprint 3: Catalogue Automatique + Recurring Tasks + Settings

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Implémenter le catalogue de tâches automatiques (OR MASSIF), les tâches récurrentes, et les pages settings/profile.

---

## PRÉ-REQUIS
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Schéma Base de Données - Task Templates

- [x] 1.1 Créer schema `task_templates` dans `src/lib/aws/templates-schema.sql`:
  - id, country (pays)
  - age_min, age_max
  - category, subcategory
  - title, description
  - cron_rule (récurrence)
  - weight (poids_charge)
  - days_before_deadline
  - is_active, created_at
- [x] 1.2 Créer schema `generated_tasks` (tâches générées depuis templates):
  - id, template_id, child_id, household_id
  - generated_at, deadline
  - status, acknowledged
- [x] 1.3 RLS policies pour task_templates (lecture publique, écriture admin)
- [x] 1.4 RLS policies pour generated_tasks (via household_members)

---

## Phase 2: Types TypeScript Templates

- [x] 2.1 Créer `src/types/template.ts`:
  - TaskTemplate interface
  - TaskTemplateCreate type
  - AgeGroup enum (0-3, 3-6, 6-11, 11-15, 15-18)
  - PeriodType enum (rentrée, vacances, etc.)
  - GeneratedTask interface

---

## Phase 3: Validations Zod Templates

- [x] 3.1 Créer `src/lib/validations/template.ts`:
  - TaskTemplateSchema
  - TaskTemplateFilterSchema (age, category, country)
  - CronRuleSchema (validation cron)

---

## Phase 4: Data Seed - French Templates

- [x] 4.1 Créer `src/lib/data/templates-fr.ts` avec templates France:
  - 0-3 ans: vaccins, PMI, mode de garde
  - 3-6 ans: inscription maternelle, assurance, réunions
  - 6-11 ans: fournitures, cantine, sorties
  - 11-15 ans: orientation, brevet
  - 15-18 ans: permis, bac, parcoursup
- [x] 4.2 Templates par période (septembre, décembre, juin, etc.)
- [x] 4.3 Au moins 50 templates couvrant les catégories principales (76 templates)

---

## Phase 5: Services Templates

- [x] 5.1 Créer `src/lib/services/templates.ts`:
  - `getTemplatesForChild(childId)` - templates applicables à un enfant (par âge)
  - `generateTasksFromTemplates(childId)` - génération auto
  - `getUpcomingTemplates(householdId, days)` - prochaines tâches
- [x] 5.2 Créer `src/lib/services/scheduler.ts`:
  - `checkAndGenerateTasks()` - vérification quotidienne
  - `calculateNextDeadline(cronRule, baseDate)` - calcul deadline
  - `shouldGenerateTask(template, child)` - règles de génération

---

## Phase 6: Récurrence System

- [x] 6.1 Mettre à jour `src/types/task.ts`:
  - RecurrenceRule type (daily, weekly, monthly, yearly, custom)
  - RecurrenceConfig interface
- [x] 6.2 Créer `src/lib/services/recurrence.ts`:
  - `createRecurringTask(task, rule)` - création tâche récurrente
  - `generateNextOccurrence(task)` - génération prochaine occurrence
  - `getRecurrenceLabel(rule)` - label lisible ("Tous les lundis")
- [x] 6.3 Mettre à jour `src/lib/actions/tasks.ts`:
  - Ajouter support récurrence dans createTask
  - Hook pour générer occurrence suivante après completion

---

## Phase 7: Composants UI Templates

- [x] 7.1 Créer `src/components/custom/TemplateCard.tsx`:
  - Affichage template
  - Badge âge/catégorie
  - Preview tâche générée
- [x] 7.2 Créer `src/components/custom/TemplateList.tsx`:
  - Liste templates par catégorie
  - Filtres âge/catégorie
- [x] 7.3 Créer `src/components/custom/UpcomingTasks.tsx`:
  - Tâches automatiques à venir
  - Option "Ignorer cette fois"

---

## Phase 8: Pages Settings

- [x] 8.1 Créer `src/app/(dashboard)/settings/page.tsx` - hub settings
- [x] 8.2 Créer `src/app/(dashboard)/settings/profile/page.tsx`:
  - Modifier nom, email (lecture seule)
  - Langue, timezone
  - Préférences notifications
- [x] 8.3 Créer `src/app/(dashboard)/settings/household/page.tsx`:
  - Nom foyer
  - Inviter co-parent
  - Liste membres
  - Supprimer foyer
- [x] 8.4 Créer `src/app/(dashboard)/settings/notifications/page.tsx`:
  - Toggle notifications push
  - Heure rappels quotidiens
  - Notifications email
- [x] 8.5 Créer `src/app/(dashboard)/settings/templates/page.tsx`:
  - Voir templates actifs pour le foyer
  - Désactiver templates spécifiques
  - Preview calendrier automatique

---

## Phase 9: Composants Settings

- [x] 9.1 Créer `src/components/custom/SettingsNav.tsx` - navigation settings
- [x] 9.2 Créer `src/components/custom/ProfileForm.tsx` - formulaire profil
- [x] 9.3 Créer `src/components/custom/HouseholdSettings.tsx` - gestion foyer
- [x] 9.4 Créer `src/components/custom/NotificationSettings.tsx` - préférences notifs
- [x] 9.5 Créer `src/components/custom/TemplateSwitches.tsx` - toggle templates

---

## Phase 10: Server Actions Settings

- [x] 10.1 Créer `src/lib/actions/settings.ts`:
  - `updateProfile(data)` - mise à jour profil
  - `updateHousehold(data)` - mise à jour foyer
  - `updateNotificationPreferences(data)` - préférences notifs
  - `deleteAccount()` - suppression compte (RGPD)
- [x] 10.2 Créer `src/lib/actions/templates.ts`:
  - `getActiveTemplates(householdId)` - templates actifs
  - `toggleTemplate(templateId, active)` - activer/désactiver
  - `previewCalendar(householdId, months)` - preview tâches futures

---

## Phase 11: API Routes Templates

- [x] 11.1 Créer `src/app/api/templates/generate/route.ts`:
  - Endpoint pour cron job (génération quotidienne)
  - Auth via API key
- [x] 11.2 Créer `src/app/api/cron/daily/route.ts`:
  - Vérification tâches à générer
  - Notifications rappels

---

## Phase 12: Validations Settings

- [x] 12.1 Créer `src/lib/validations/settings.ts`:
  - ProfileUpdateSchema
  - HouseholdUpdateSchema
  - NotificationPreferencesSchema
  - DeleteAccountSchema (confirmation)

---

## Phase 13: Tests

- [x] 13.1 Créer `src/tests/templates-test.ts`:
  - Test génération par âge
  - Test filtres templates
  - Test calcul deadline
- [x] 13.2 Créer `src/tests/recurrence-test.ts`:
  - Test règles récurrence
  - Test génération occurrences
- [x] 13.3 Créer `src/tests/settings-test.ts`:
  - Test validations settings

---

## Phase 14: Build & Validation

- [x] 14.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [x] 14.2 `bun run build` - build production OK
- [ ] 14.3 Test manuel: voir templates applicables à un enfant
- [ ] 14.4 Test manuel: créer tâche récurrente → compléter → voir nouvelle occurrence

---

## Definition of Done Sprint 3
- [x] Catalogue 50+ templates français par âge/période
- [x] Service génération automatique tâches depuis templates
- [x] Système récurrence (daily, weekly, monthly)
- [x] Page settings complète (profil, foyer, notifications)
- [x] Page templates avec toggle activation
- [x] Build production sans erreur
- [x] Types stricts partout

---

## Variables d'environnement (existantes suffisantes)
```env
DATABASE_URL=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
AWS_S3_BUCKET=
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
bun run src/tests/templates-test.ts   # Test templates
bun run src/tests/recurrence-test.ts  # Test recurrence
bun run src/tests/settings-test.ts    # Test settings
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- Templates français pour MVP, autres pays en v2
- Cron job via Vercel cron ou AWS EventBridge
- RLS critique pour generated_tasks

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints

