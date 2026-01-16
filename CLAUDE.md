# CLAUDE.md - TÂCHES RESTANTES

## ✅ FEATURES TERMINÉES
- Transition landing → login (OK)
- Onboarding tutorial avec react-joyride (OK)
- PWA installable (OK)

## 🎯 TÂCHE PRIORITAIRE: TRADUCTION 100% FRANÇAIS

Vérifier et corriger TOUS les textes en anglais dans l'application:

### À VÉRIFIER:
1. Tutorial joyride - le bouton "Next (Step 1 of 4)" doit être "Suivant (Étape 1 sur 4)"
2. Messages d'erreur
3. Placeholders des inputs
4. Boutons et labels
5. Toasts et notifications

### FICHIERS À VÉRIFIER:
- src/components/custom/OnboardingTutorial.tsx (locale joyride)
- src/components/custom/*.tsx
- src/app/**/*.tsx

### COMMIT
```bash
git commit -m "fix(i18n): translate all remaining English texts to French"
git push
```

## 🎯 TÂCHE 2: AMÉLIORER LES SUGGESTIONS

Quand l'utilisateur n'a pas de tâche pour aujourd'hui, proposer des suggestions:
- "Ajouter une tâche ménagère"
- "Planifier une activité avec les enfants"
- "Rappel médical"

