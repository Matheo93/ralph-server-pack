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
- [x] 0.1 Vérifier que le build passe: `bunx tsc --noEmit && bun run build`
- [x] 0.2 Vérifier les services AWS accessibles

---

## Phase 1: Onboarding Wizard Complet

- [x] 1.1 Refactorer `src/app/(dashboard)/onboarding/page.tsx`:
  - Wizard multi-étapes (1. Foyer, 2. Enfants, 3. Co-parent, 4. Préférences)
  - Progress indicator
  - Validation à chaque étape
- [x] 1.2 Créer `src/components/custom/OnboardingWizard.tsx`:
  - State machine pour les étapes
  - Navigation prev/next
  - Skip optionnel pour certaines étapes
- [x] 1.3 Créer `src/components/custom/OnboardingStep1Household.tsx`:
  - Nom du foyer
  - Pays (France par défaut)
  - Timezone automatique
- [x] 1.4 Créer `src/components/custom/OnboardingStep2Children.tsx`:
  - Ajout multiple enfants
  - Prénom + date de naissance
  - Tags optionnels (allergies, etc.)
- [x] 1.5 Créer `src/components/custom/OnboardingStep3Invite.tsx`:
  - Inviter co-parent par email
  - Option "Plus tard"
- [x] 1.6 Créer `src/components/custom/OnboardingStep4Preferences.tsx`:
  - Notifications (heure rappel)
  - Catégories prioritaires
  - Templates auto-activés

---

## Phase 2: Vue Semaine Complète

- [x] 2.1 Créer `src/app/(dashboard)/tasks/week/page.tsx`:
  - Vue 7 jours avec scroll horizontal
  - Groupement par jour
  - Drag & drop entre jours (report)
- [x] 2.2 Créer `src/components/custom/WeekView.tsx`:
  - Colonnes pour chaque jour
  - Header avec date
  - Badge count par jour
- [x] 2.3 Créer `src/components/custom/DayColumn.tsx`:
  - Liste des tâches du jour
  - Drop zone pour drag & drop
  - Bouton "+" ajouter tâche
- [x] 2.4 Créer `src/lib/actions/week.ts`:
  - `getTasksForWeek(householdId, startDate)`
  - `moveTaskToDay(taskId, newDate)`

---

## Phase 3: Système de Notifications

- [x] 3.1 Créer `src/lib/services/notifications.ts`:
  - `sendTaskReminder(taskId, memberId)`
  - `sendDailyDigest(householdId)`
  - `sendStreakAlert(householdId)`
  - `sendDeadlineWarning(taskId)`
- [x] 3.2 Créer `src/lib/aws/ses.ts`:
  - Configuration Amazon SES
  - `sendEmail(to, subject, html)`
  - Templates email
- [x] 3.3 Créer `src/lib/templates/email/`:
  - `daily-digest.ts` - Email récapitulatif quotidien
  - `task-reminder.ts` - Rappel de tâche
  - `streak-warning.ts` - Alerte streak en danger
- [x] 3.4 Créer `src/app/api/cron/notifications/route.ts`:
  - Endpoint pour cron job
  - Trigger daily digest à 7h
  - Trigger reminders selon préférences

---

## Phase 4: Charge Mentale Dashboard Am\u00e9lior\u00e9

- [x] 4.1 Refactorer `src/app/(dashboard)/dashboard/page.tsx`:
  - Widget charge mentale plus visible
  - Graphique semaine (bar chart)
  - Comparaison parent 1 vs parent 2
- [x] 4.2 Cr\u00e9er `src/components/custom/ChargeWeekChart.tsx`:
  - Bar chart r\u00e9partition sur 7 jours
  - Couleurs par parent
  - Tooltip avec d\u00e9tails
- [x] 4.3 Cr\u00e9er `src/components/custom/ChargeHistoryCard.tsx`:
  - Historique 4 derni\u00e8res semaines
  - Trend up/down
  - Message encourageant si \u00e9quilibre
- [x] 4.4 Cr\u00e9er `src/app/(dashboard)/charge/page.tsx`:
  - Page d\u00e9di\u00e9e charge mentale
  - D\u00e9tails par cat\u00e9gorie
  - Export PDF (nota: non impl\u00e9ment\u00e9, UI uniquement)

---

## Phase 5: Streak & Gamification

- [x] 5.1 Am\u00e9liorer `src/components/custom/StreakCounter.tsx`:
  - Animation quand streak augmente
  - Milestones (7 jours, 30 jours, 100 jours)
  - Badge collection
- [x] 5.2 Cr\u00e9er `src/lib/services/streak.ts`:
  - `calculateStreak(householdId)`
  - `checkStreakRisk(householdId)` - alerte si critique non fait
  - `saveJoker(householdId)` - premium feature
- [x] 5.3 Cr\u00e9er `src/components/custom/StreakMilestones.tsx`:
  - Badges d\u00e9bloqu\u00e9s
  - Prochain milestone
  - Confetti animation

---

## Phase 6: Taches Recurrentes UI

- [x] 6.1 Ameliorer `src/components/custom/TaskForm.tsx`:
  - Section recurrence plus intuitive
  - Preview "prochaines occurrences"
  - Options: quotidien, hebdo, mensuel, personnalise
- [x] 6.2 Creer `src/components/custom/RecurrencePreview.tsx`:
  - Liste des 5 prochaines dates
  - Calendrier mini avec points
- [x] 6.3 Creer `src/app/(dashboard)/tasks/recurring/page.tsx`:
  - Liste des taches recurrentes actives
  - Modifier/supprimer recurrence
  - Statistiques (taux completion)

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
