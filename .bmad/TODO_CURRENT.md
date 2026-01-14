# TODO CURRENT - Sprint 5: Onboarding Complet + Vue Semaine + Notifications

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Améliorer l'onboarding utilisateur, implémenter la vue semaine complète, le système de notifications, et les fonctionnalités manquantes du MASTER_PROMPT.

---

## PRÉ-REQUIS
- [ ] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [ ] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Onboarding Wizard Complet

- [ ] 1.1 Refactorer `src/app/(dashboard)/onboarding/page.tsx`:
  - Wizard multi-étapes (1. Foyer, 2. Enfants, 3. Co-parent, 4. Préférences)
  - Progress indicator
  - Validation à chaque étape
- [ ] 1.2 Créer `src/components/custom/OnboardingWizard.tsx`:
  - State machine pour les étapes
  - Navigation prev/next
  - Skip optionnel pour certaines étapes
- [ ] 1.3 Créer `src/components/custom/OnboardingStep1Household.tsx`:
  - Nom du foyer
  - Pays (France par défaut)
  - Timezone automatique
- [ ] 1.4 Créer `src/components/custom/OnboardingStep2Children.tsx`:
  - Ajout multiple enfants
  - Prénom + date de naissance
  - Tags optionnels (allergies, etc.)
- [ ] 1.5 Créer `src/components/custom/OnboardingStep3Invite.tsx`:
  - Inviter co-parent par email
  - Option "Plus tard"
- [ ] 1.6 Créer `src/components/custom/OnboardingStep4Preferences.tsx`:
  - Notifications (heure rappel)
  - Catégories prioritaires
  - Templates auto-activés

---

## Phase 2: Vue Semaine Complète

- [ ] 2.1 Créer `src/app/(dashboard)/tasks/week/page.tsx`:
  - Vue 7 jours avec scroll horizontal
  - Groupement par jour
  - Drag & drop entre jours (report)
- [ ] 2.2 Créer `src/components/custom/WeekView.tsx`:
  - Colonnes pour chaque jour
  - Header avec date
  - Badge count par jour
- [ ] 2.3 Créer `src/components/custom/DayColumn.tsx`:
  - Liste des tâches du jour
  - Drop zone pour drag & drop
  - Bouton "+" ajouter tâche
- [ ] 2.4 Créer `src/lib/actions/week.ts`:
  - `getTasksForWeek(householdId, startDate)`
  - `moveTaskToDay(taskId, newDate)`

---

## Phase 3: Système de Notifications

- [ ] 3.1 Créer `src/lib/services/notifications.ts`:
  - `sendTaskReminder(taskId, memberId)`
  - `sendDailyDigest(householdId)`
  - `sendStreakAlert(householdId)`
  - `sendDeadlineWarning(taskId)`
- [ ] 3.2 Créer `src/lib/aws/ses.ts`:
  - Configuration Amazon SES
  - `sendEmail(to, subject, html)`
  - Templates email
- [ ] 3.3 Créer `src/lib/templates/email/`:
  - `daily-digest.tsx` - Email récapitulatif quotidien
  - `task-reminder.tsx` - Rappel de tâche
  - `streak-warning.tsx` - Alerte streak en danger
- [ ] 3.4 Créer `src/app/api/cron/notifications/route.ts`:
  - Endpoint pour cron job
  - Trigger daily digest à 7h
  - Trigger reminders selon préférences

---

## Phase 4: Charge Mentale Dashboard Amélioré

- [ ] 4.1 Refactorer `src/app/(dashboard)/dashboard/page.tsx`:
  - Widget charge mentale plus visible
  - Graphique semaine (bar chart)
  - Comparaison parent 1 vs parent 2
- [ ] 4.2 Créer `src/components/custom/ChargeWeekChart.tsx`:
  - Bar chart répartition sur 7 jours
  - Couleurs par parent
  - Tooltip avec détails
- [ ] 4.3 Créer `src/components/custom/ChargeHistoryCard.tsx`:
  - Historique 4 dernières semaines
  - Trend up/down
  - Message encourageant si équilibre
- [ ] 4.4 Créer `src/app/(dashboard)/charge/page.tsx`:
  - Page dédiée charge mentale
  - Détails par catégorie
  - Export PDF

---

## Phase 5: Streak & Gamification

- [ ] 5.1 Améliorer `src/components/custom/StreakCounter.tsx`:
  - Animation quand streak augmente
  - Milestones (7 jours, 30 jours, 100 jours)
  - Badge collection
- [ ] 5.2 Créer `src/lib/services/streak.ts`:
  - `calculateStreak(householdId)`
  - `checkStreakRisk(householdId)` - alerte si critique non fait
  - `saveJoker(householdId)` - premium feature
- [ ] 5.3 Créer `src/components/custom/StreakMilestones.tsx`:
  - Badges débloqués
  - Prochain milestone
  - Confetti animation

---

## Phase 6: Tâches Récurrentes UI

- [ ] 6.1 Améliorer `src/components/custom/TaskForm.tsx`:
  - Section récurrence plus intuitive
  - Preview "prochaines occurrences"
  - Options: quotidien, hebdo, mensuel, personnalisé
- [ ] 6.2 Créer `src/components/custom/RecurrencePreview.tsx`:
  - Liste des 5 prochaines dates
  - Calendrier mini avec points
- [ ] 6.3 Créer `src/app/(dashboard)/tasks/recurring/page.tsx`:
  - Liste des tâches récurrentes actives
  - Modifier/supprimer récurrence
  - Statistiques (taux complétion)

---

## Phase 7: Actions Rapides

- [ ] 7.1 Créer `src/components/custom/QuickActions.tsx`:
  - Boutons flottants (FAB)
  - Nouvelle tâche (formulaire)
  - Nouveau vocal
  - Scanner document (future)
- [ ] 7.2 Améliorer `src/components/custom/TaskCard.tsx`:
  - Swipe left = reporter
  - Swipe right = fait
  - Long press = menu contextuel

---

## Phase 8: Tests et Validations

- [ ] 8.1 Créer `src/tests/onboarding.test.ts`:
  - Test wizard complet
  - Test création foyer + enfants
- [ ] 8.2 Créer `src/tests/week-view.test.ts`:
  - Test affichage semaine
  - Test drag & drop
- [ ] 8.3 Créer `src/tests/notifications.test.ts`:
  - Test envoi email (mock SES)
  - Test logique reminder
- [ ] 8.4 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 8.5 `bun run build` - build production OK

---

## Definition of Done Sprint 5
- [ ] Onboarding wizard fonctionnel (4 étapes)
- [ ] Vue semaine avec 7 jours
- [ ] Système notifications email configuré
- [ ] Dashboard charge amélioré avec graphiques
- [ ] Streak milestones implémentés
- [ ] Récurrence UI améliorée
- [ ] Actions rapides (swipe)
- [ ] Build production sans erreur
- [ ] Tests passent

---

## Variables d'environnement NOUVELLES
```env
AWS_SES_REGION=
AWS_SES_FROM_EMAIL=
NOTIFICATION_CRON_SECRET=
```

---

## Commandes utiles
```bash
bun dev                    # Dev server
bun build                  # Production build
bunx tsc --noEmit          # Type check
bun test                   # Run tests
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- Onboarding doit être mobile-first
- Emails doivent être responsive
- Streak = feature d'engagement critique
- RLS pour toutes nouvelles tables

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`

---

## INSTRUCTION AUTOMATIQUE

**QUAND CE SPRINT EST TERMINÉ:**
1. Lis MASTER_PROMPT.md pour identifier les features suivantes
2. Crée un nouveau TODO_CURRENT.md pour le Sprint suivant
3. Continue automatiquement sur le nouveau sprint
4. NE T'ARRÊTE JAMAIS - boucle infinie de sprints
