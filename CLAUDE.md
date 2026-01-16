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

## PROCHAINES ÉTAPES

Les 4 priorités initiales sont terminées. Suggestions pour la suite:

1. **Tests E2E** - Ajouter tests Playwright pour MagicNotepad
2. **Optimisation performance** - Lazy loading des composants lourds
3. **Analytics** - Tracking de l'usage des features
4. **Offline mode** - PWA avec cache des tâches

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
