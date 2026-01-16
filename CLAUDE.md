# CLAUDE.md - 2 FEATURES À IMPLÉMENTER

## 🎯 FEATURE 1: TRANSITION LANDING → LOGIN
Transition fluide quand on clique sur "Connexion" ou "Essai gratuit"
- Fade out de la landing
- Fade in de la page login

## 🎯 FEATURE 2: ONBOARDING TUTORIAL (PREMIÈRE CONNEXION)

Quand un utilisateur crée son compte et se connecte pour la PREMIÈRE FOIS:

### 1. Animation de bienvenue
- "Bienvenue sur FamilyLoad!" avec animation sympa
- Confettis ou effet "wow"

### 2. Tutorial interactif (optionnel)
Proposer à l'utilisateur: "Voulez-vous une visite guidée?"
- Oui → Lance le tuto
- Non → Aller directement au dashboard

### 3. Le tuto présente les fonctionnalités:
- Étape 1: "Voici votre tableau de bord" (highlight du dashboard)
- Étape 2: "Ajoutez vos enfants ici" (highlight menu Enfants)
- Étape 3: "Créez des tâches facilement" (highlight bouton +)
- Étape 4: "Utilisez la commande vocale" (highlight micro)
- Étape 5: "Analysez votre charge mentale" (highlight Charge mentale)

### LIBRAIRIE RECOMMANDÉE: react-joyride
```bash
bun add react-joyride
```

### STOCKAGE
Utiliser localStorage ou la DB pour savoir si l'user a déjà vu le tuto:
```tsx
localStorage.getItem('hasSeenOnboarding')
```

### FICHIERS À CRÉER
- src/components/custom/OnboardingTutorial.tsx
- src/components/custom/WelcomeAnimation.tsx

### COMMIT
```bash
git commit -m "feat(onboarding): add welcome animation and tutorial for new users"
git push
```
