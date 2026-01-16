# CLAUDE.md - 2 BUGS RESTANTS À CORRIGER

## 🔴 BUG 1: MICRO NE DEMANDE PAS LA PERMISSION 🔴

Le micro ne demande JAMAIS la permission à l'utilisateur!

**PROBLÈME**: Quand on clique sur le bouton dictée, rien ne se passe.
Le navigateur devrait afficher une popup demandant l'accès au micro.

**SOLUTION**:
```javascript
// Avant d'utiliser Web Speech API, demander la permission
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// Cela déclenche la popup de permission du navigateur
```

Fichier à modifier: chercher dans components/ le hook useSpeechRecognition ou similaire.

---

## 🔴 BUG 2: 3 BOUTONS EN BAS À DROITE DU DASHBOARD 🔴

Sur le dashboard, il y a ENCORE 3 boutons flottants en bas à droite:
- Un bouton "+"
- Un bouton "Vue semaine" ou calendrier
- Un autre bouton

**SOLUTION**: Les fusionner en UN SEUL FAB avec un menu

---

## WORKFLOW

1. Corriger UN bug
2. `bun run build`
3. `node test-auto.js`
4. `git commit && git push`
5. Recommencer
