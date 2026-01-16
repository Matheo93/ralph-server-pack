# CLAUDE.md - Instructions COMPLÈTES pour Ralph

## 🚨 MODE: BOUCLE INFINIE - NE T'ARRÊTE JAMAIS 🚨

Tu dois corriger TOUS ces bugs et features. Teste avec Puppeteer après chaque changement.

---

## BUGS CRITIQUES À CORRIGER

### 1. ❌ /settings/invite NE MARCHE PAS
- L'URL https://gather-cage-helping-candles.trycloudflare.com/settings/invite est cassée
- Vérifier que la route existe dans app/settings/invite/page.tsx
- Corriger immédiatement

### 2. ✅ BOUTONS REDONDANTS - CORRIGÉ (commit c057239)
La Card "Actions rapides" dans la sidebar a été supprimée.
Maintenant seul le FAB (Floating Action Button) est utilisé pour les actions rapides.
- Interface simplifiée
- Un seul point d'entrée pour les actions rapides
- Le FAB s'ouvre avec animation pour révéler les options

### 3. ❌ ACCENTS MANQUANTS
Chercher et corriger:
- "tache" → "tâche"
- "Priorite" → "Priorité"  
- "Categorie" → "Catégorie"
- "supplementaires" → "supplémentaires"

### 4. ❌ MICRO/DICTÉE NE MARCHE PAS
- Le bouton de dictée vocale doit FONCTIONNER
- Web Speech API nécessite HTTPS (OK avec Cloudflare)
- Afficher message clair si micro refusé

### 5. ❌ TRADUCTION 100% FRANÇAIS
- AUCUN texte en anglais
- Vérifier TOUS les fichiers
- Placeholders, boutons, messages d'erreur

---

## FEATURES À IMPLÉMENTER

### 1. ENFANT RELIÉ AUX TÂCHES
L'enfant ne doit pas être juste une donnée isolée!
- Pouvoir filtrer les tâches par enfant
- Afficher l'enfant concerné sur chaque tâche
- Dashboard: "Tâches de [Nom enfant]"
- L'enfant doit avoir un sens dans l'app!

### 2. SUGGESTIONS QUAND PAS DE TÂCHES
Quand le dashboard est vide, proposer:
- Option 1: "💬 Chat rapide" pour créer une tâche
- Option 2: "📋 Utiliser un template"
Ne pas laisser l'utilisateur seul face à une page vide!

### 3. ANIMATION LANDING PAGE
- Animation d'intro quand on arrive pour la 1ère fois
- Style comme entraide-souverainiste.com
- L'animation se fond ensuite dans le décor
- Effet "wow" à l'arrivée

### 4. SMOOTH SCROLL
Ajouter dans globals.css:
html {
  scroll-behavior: smooth;
}

### 5. PWA / APP MOBILE
- manifest.json complet
- Service worker pour offline
- Icônes pour écran d'accueil iOS/Android
- Tester l'installation sur mobile

---

## COMMANDES DE TEST

```bash
# Test automatique Puppeteer
node test-auto.js

# Type check
bun run type-check

# Build
bun run build

# Test URL spécifique
curl -s https://gather-cage-helping-candles.trycloudflare.com/settings/invite
```

---

## WORKFLOW OBLIGATOIRE

1. git pull
2. Lire ce fichier
3. Corriger UN bug
4. bun run type-check (doit passer)
5. bun run build (doit passer)
6. node test-auto.js (vérifier)
7. git add . && git commit -m "fix: description"
8. git push
9. RECOMMENCER AU STEP 1

⚠️ NE T'ARRÊTE JAMAIS. BOUCLE INDÉFINIMENT.
⚠️ TESTE CHAQUE CHANGEMENT AVANT DE COMMIT.

