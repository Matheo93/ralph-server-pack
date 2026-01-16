# CLAUDE.md - PRIORITÉS ABSOLUES POUR RALPH

## 🚨 DEMANDES DU CLIENT - À IMPLÉMENTER MAINTENANT 🚨

### 1. ❌ TRADUCTION 100% FRANÇAIS
- Le site doit être 100% en français
- AUCUN texte en anglais
- Vérifier TOUS les fichiers: boutons, placeholders, messages d'erreur
- Chercher: Loading, Submit, Cancel, Error, Success, etc.

### 2. ❌ APP MOBILE (PWA)
- manifest.json complet
- Service worker pour offline
- Icônes iOS/Android pour écran d'accueil
- L'app doit être installable sur mobile

### 3. ❌ ENFANT MIS EN RELATION AVEC L'APP
L'enfant ne doit PAS être juste une donnée isolée!
- Filtrer les tâches PAR ENFANT
- Sélectionner un enfant et voir SES tâches
- Afficher l'enfant concerné sur chaque tâche
- TOUT doit être mis en relation!

### 4. ❌ SUGGESTIONS SI PAS DE TÂCHE
Quand le dashboard est VIDE, proposer 2 solutions rapides:
- Option 1: "💬 Chat rapide" pour créer une tâche vocalement
- Option 2: "📋 Utiliser un template"
NE PAS laisser l'utilisateur face à une page vide!

### 5. ❌ ANIMATION LANDING PAGE
- Animation d'intro quand on arrive la PREMIÈRE FOIS
- Style comme entraide-souverainiste.com
- L'animation se fond ensuite dans le décor
- Effet "wow" à l'arrivée

### 6. ❌ FUSIONNER LES BOUTONS REDONDANTS
Ces 5 boutons sont REDONDANTS et créent la confusion:
- "Toutes les tâches"
- "Analyse charge mentale"
- "Nouvelle tâche"
- "Vue semaine"
- "Toutes les taches" (doublon!)

SOLUTION: Les fusionner en UN menu ou les organiser proprement

### 7. ❌ MICRO/DICTÉE NE MARCHE PAS
- Le bouton de dictée vocale DOIT fonctionner
- Web Speech API sur HTTPS
- Tester sur le tunnel Cloudflare
- Afficher message clair si micro refusé

---

## COMMANDES DE TEST

```bash
# Tester avec Puppeteer
node test-auto.js

# Build
bun run build

# Type check
bun run type-check
```

---

## WORKFLOW OBLIGATOIRE

1. git pull
2. Implémenter UNE feature
3. bun run build
4. node test-auto.js
5. git commit && git push
6. RECOMMENCER

⚠️ NE T'ARRÊTE JAMAIS!
