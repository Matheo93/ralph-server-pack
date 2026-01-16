# CLAUDE.md - Instructions RALPH (AUTO-TEST MODE)

## 🚨 OBLIGATOIRE: TESTER AVEC PUPPETEER APRÈS CHAQUE COMMIT 🚨

Après CHAQUE modification, tu DOIS exécuter:
```bash
node test-auto.js
```

Si les tests échouent, tu dois corriger et recommencer!

---

## RÉSULTATS DES DERNIERS TESTS

```
✅ Landing page: OK
✅ Login: OK  
✅ Dashboard: OK (boutons fusionnés!)
✅ Settings household: OK
❌ Children: Age calculation bug ENCORE PRÉSENT
```

---

## BUG CRITIQUE À CORRIGER MAINTENANT

### ❌ AGE CALCULATION BUG
Le test Puppeteer détecte encore le bug d'âge sur la page /children.
Cherche dans ChildCard.tsx ou child-card.tsx le calcul d'âge.

Le problème est probablement:
- Date de naissance mal formatée
- Calcul avec mauvais timestamp

VÉRIFIE et CORRIGE!

---

## FEATURES À IMPLÉMENTER

### 1. ANIMATION LANDING PAGE
Animation d'intro au premier chargement, style entraide-souverainiste.com

### 2. SUGGESTIONS DASHBOARD VIDE  
Quand pas de tâches: proposer Chat rapide ou Templates

### 3. SMOOTH SCROLL
```css
html { scroll-behavior: smooth; }
```

### 4. PWA COMPLÈTE
- manifest.json
- Service worker
- Icônes iOS/Android

### 5. ENFANT RELIÉ AUX TÂCHES
- Filtrer tâches par enfant
- Afficher enfant sur chaque tâche

---

## WORKFLOW OBLIGATOIRE

```bash
# 1. Pull
git pull

# 2. Corriger un bug

# 3. Build
bun run build

# 4. TESTER AVEC PUPPETEER ⚠️
node test-auto.js

# 5. Si tests passent, commit
git add . && git commit -m "fix: description"
git push

# 6. Recommencer
```

⚠️ NE JAMAIS COMMIT SANS TESTER D'ABORD!
⚠️ BOUCLE INDÉFINIMENT!
