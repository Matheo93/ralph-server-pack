# CLAUDE.md - PRIORITÉS RALPH

## STATUS DES PRIORITÉS

### PRIORITÉ 1: MagicNotepad (TERMINÉE)
- MagicNotepad.tsx: Widget flottant style carnet
- classifyTasks.ts: Classification IA avec OpenAI
- useSpeechToText.ts: Hook Web Speech API
- Schemas Zod dans src/lib/schemas/classifyTasks.schema.ts

### PRIORITÉ 2: UX Réorganisation (TERMINÉE)
- CoachMarks.tsx: Guidage nouvel utilisateur
- QuickActions.tsx: Actions rapides visibles
- Dashboard redesign

### PRIORITÉ 3: Internationalisation (TERMINÉE)
- next-intl configuré
- src/messages/fr.json et en.json
- src/lib/i18n/config.ts

### PRIORITÉ 4: Notifications Push (TERMINÉE)
- public/sw.js: Service Worker
- src/lib/notifications/push-service.ts
- src/lib/pwa/push-subscription.ts

---

## SPRINT 2: AMÉLIORATIONS (TERMINÉ)

### Tests E2E MagicNotepad (TERMINÉ)
- e2e/magic-notepad.spec.ts: Tests complets
- Tests FAB, open/close, speech-to-text, classification
- Tests création de tâches et gestion d'erreurs
- Mock SpeechRecognition API

### Optimisation Performance (TERMINÉ)
- src/components/lazy/index.tsx: Lazy loading wrappers
- src/hooks/usePreloadComponents.ts: Preloading hooks
- Strategies: onIdle, onHover, onVisible, immediate
- 15+ composants avec lazy loading

### Analytics Feature Tracking (TERMINÉ)
- src/hooks/useFeatureTracking.ts: Hook de tracking
- Tracking automatique durée et interactions
- Events prédéfinis: task, vocal, magicNotepad, onboarding
- Hooks spécialisés pour chaque feature

### Offline Mode PWA (TERMINÉ)
- src/lib/offline/task-store.ts: IndexedDB store
- src/hooks/useOfflineTasks.ts: Hook offline-first
- Queue de mutations pour sync
- Auto-sync et sync on reconnect

---

## PROCHAINES SUGGESTIONS

1. **Dashboard Widgets** - Widgets personnalisables
2. **Gamification** - Badges et récompenses
3. **Calendar Integration** - Sync Google/Apple Calendar
4. **Reports** - Export PDF des statistiques

---

## CONVENTIONS

### Commits
```
type(scope): description

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Structure fichiers
- Schémas Zod dans `src/lib/schemas/`
- Actions serveur dans `src/lib/actions/`
- Hooks dans `src/hooks/`
- Composants custom dans `src/components/custom/`

### Build
```bash
npx tsc --noEmit && npm run build
```
