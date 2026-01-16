# CLAUDE.md - BUGS URGENTS À CORRIGER

## 🔴 BUGS CRITIQUES - CORRIGER MAINTENANT 🔴

### 1. ❌ MICRO NE DEMANDE PAS LA PERMISSION
Le micro ne demande JAMAIS la permission à l'utilisateur!
- Ajouter navigator.mediaDevices.getUserMedia() pour demander accès
- Afficher popup de permission du navigateur
- Gérer le cas où l'utilisateur refuse

### 2. ❌ 3 BOUTONS EN BAS À DROITE À FUSIONNER
Sur le dashboard, il y a ENCORE 3 boutons en bas à droite:
- "+" (bleu)
- "Vue semaine" ou autre
- Un autre bouton

ILS DOIVENT ÊTRE FUSIONNÉS EN UN SEUL!
Solution: Un seul FAB qui ouvre un menu

---

## AUTRES FEATURES À FAIRE

1. Traduction 100% français
2. PWA / App mobile installable
3. Enfant relié aux tâches (pas juste une donnée)
4. Suggestions si dashboard vide
5. Animation landing page

---

## TEST OBLIGATOIRE

```bash
node test-auto.js
```

Après CHAQUE changement!

⚠️ NE T'ARRÊTE JAMAIS!
