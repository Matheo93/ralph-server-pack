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

---

## ✅ BUG i18n - CORRIGÉ

**Date fix**: 2026-01-16
**Commit**: fix(i18n): persist locale cookie on profile language change

**Solution appliquée**:
- ProfileForm écrit maintenant le cookie `locale` après sauvegarde réussie
- Force un `window.location.reload()` pour appliquer la nouvelle locale
- La langue est sauvée en DB ET dans le cookie que next-intl lit

---

## 🎨 REFACTORING UX - PRIORITÉ HAUTE (Demande utilisateur)

**Date**: 2026-01-16 02:45 UTC
**Feature**: Fusion des widgets dans le bouton MagicNotepad

### Problème actuel:
Le dashboard est surchargé avec trop d'éléments éparpillés:
- "Vous êtes à jour"
- Calendrier semaine (Ven 16 - Jeu 22)
- Streak du foyer (0 jours)
- Historique (4 semaines)
- Charge mentale (déséquilibre, pourcentages)
- Actions rapides (Nouvelle tâche, Gérer enfants, Toutes les tâches, Analyse)

### Solution demandée:
**Fusionner TOUT dans le bouton violet/gradient en bas à droite (MagicNotepad)**

Le bouton devient un "Hub" qui ouvre un panneau/modal avec:
1. **Onglet Carnet** - Notes + Classification IA (existant)
2. **Onglet Actions** - Nouvelle tâche, Vue semaine, Toutes les tâches
3. **Onglet Stats** - Streak, Historique, Charge mentale

### Comportement souhaité:
- Clic sur le bouton → ouvre un panneau glissant depuis la droite
- Navigation par onglets ou swipe
- Le dashboard principal devient MINIMAL (juste les 4 cards stats + message "Bravo")

### Wireframe:
```
+---------------------------+
|  ✨ Hub FamilyLoad    [X] |
+---------------------------+
| [Carnet] [Actions] [Stats]|
+---------------------------+
|                           |
|  (Contenu de l'onglet)    |
|                           |
+---------------------------+
```

### Avantages:
- Dashboard épuré
- Toutes les actions dans un seul endroit
- Meilleure découvrabilité
- UX mobile optimale

**IMPLÉMENTER CETTE REFONTE**

---

## 📝 AMÉLIORATION MagicNotepad - Ajouter un titre

**Date**: 2026-01-16 02:55 UTC

### Demande:
Ajouter un **titre** au-dessus du champ de saisie dans le MagicNotepad (petit chat).

### Exemple:
```
+---------------------------+
|  ✨ Carnet Magique    [X] |
+---------------------------+
|  📝 Mes notes du jour     |  <-- NOUVEAU TITRE ICI
+---------------------------+
|                           |
|  [Zone de texte]          |
|                           |
+---------------------------+
| [Dicter]    [Classer]     |
+---------------------------+
```

### Comportement:
- Titre stylé, peut-être avec une icône 📝
- Donne du contexte à l'utilisateur
- Peut être "Mes notes", "Quoi de neuf ?", ou personnalisable

**À IMPLÉMENTER**

---

## ❓ CLARIFICATION - Calcul de la Charge Mentale

**Date**: 2026-01-16 02:55 UTC
**Question utilisateur**: "Je ne comprends pas l'onglet charge mentale. Comment il est calculé ? Forcément vu que tu ajoutes tout sur ton compte la charge ne peut qu'augmenter."

### Comportement attendu:
La charge mentale doit être un indicateur **dynamique** qui:
1. **AUGMENTE** quand on ajoute des tâches non complétées
2. **DIMINUE** quand on complète des tâches
3. Reflète l'**équilibre** entre les membres du foyer

### Calcul suggéré:
```
Charge actuelle = SUM(load_weight) des tâches NON COMPLÉTÉES assignées à l'utilisateur
Équilibre = Comparaison entre charges de tous les membres du foyer
```

### Affichage:
- Si je suis à 60% et mon partenaire à 40% → "Déséquilibré"
- Si nous sommes à 50%/50% → "Équilibré"
- Quand je complète une tâche → ma charge diminue en temps réel

### Vérifier:
1. Le calcul prend-il bien en compte UNIQUEMENT les tâches status != 'completed' ?
2. Le % affiché est-il relatif aux autres membres ?
3. La mise à jour est-elle en temps réel après complétion ?

**À VÉRIFIER ET DOCUMENTER**

---

## 🎯 PROBLÈME UX MAJEUR - Découvrabilité des fonctionnalités

**Date**: 2026-01-16 02:58 UTC
**Problème**: "La belle chambre au 3ème étage" - Les meilleures features sont cachées !

### Fonctionnalités CACHÉES dans Paramètres:
- **Profil** - Langue, préférences
- **Foyer** - Membres, invitations (CRITIQUE pour le partage!)
- **Préférences** - Assignation par catégorie
- **Notifications** - Rappels et alertes
- **Templates** - Tâches automatiques (SUPER UTILE!)
- **Confidentialité** - Données et sécurité

### Le problème:
L'utilisateur doit:
1. Cliquer sur "Paramètres" dans la sidebar (personne ne fait ça)
2. Découvrir par hasard ces fonctionnalités
3. Ne jamais utiliser Templates, Invitations, etc.

### Solution proposée - Hub avec accès rapide:

Le bouton MagicNotepad devient un **Hub central** avec:
```
+--------------------------------+
|  ✨ Hub FamilyLoad         [X] |
+--------------------------------+
| [📝 Notes] [⚡ Actions] [⚙️ Plus] |
+--------------------------------+

Onglet "Plus" / "Raccourcis":
- 👥 Inviter un membre
- 🔄 Créer un template
- 🔔 Gérer notifications
- 🌍 Changer la langue
- 📊 Voir mes stats
+--------------------------------+
```

### Avantages:
- Plus besoin d'aller dans Paramètres
- Les features clés sont à 1 clic
- Onboarding naturel
- UX mobile-first

**PRIORITÉ MAXIMALE - IMPLÉMENTER**

---

## 🚨 BUGS SIGNALÉS PAR UTILISATEUR

**Date**: 2026-01-16 03:00 UTC

### BUG 1: Inviter un co-parent ne fonctionne pas
**Chemin**: Paramètres > Foyer > Membres et invitations
**Problème**: L'invitation ne fonctionne pas (détails à investiguer)
**Impact**: CRITIQUE - Impossible de partager le foyer avec le partenaire

### BUG 2: Templates non modifiables
**Chemin**: Paramètres > Templates
**Problème actuel**: On ne peut pas copier/modifier un template
**Comportement attendu**: 
1. Cliquer sur un template
2. Une popup s'ouvre avec les champs PRÉ-REMPLIS
3. L'utilisateur peut MODIFIER les valeurs avant de créer la tâche
   - Ex: Template dit "dans 12 mois" → utilisateur change à "dans 8 mois"
4. Bouton "Créer cette tâche" pour valider

### Exemple d'UX souhaitée pour Templates:
```
+----------------------------------+
|  📋 Vaccination annuelle      [X]|
+----------------------------------+
| Titre: [Vaccination annuelle   ] |
| Date:  [Dans 8 mois          v] | ← Modifiable!
| Enfant: [Emma                v] |
| Priorité: [Normale           v] |
+----------------------------------+
| [Annuler]    [Créer la tâche]   |
+----------------------------------+
```

**À FIXER EN PRIORITÉ**

---

## 🚨🚨 BUG CRITIQUE - Dashboard non synchronisé avec les tâches

**Date**: 2026-01-16 03:02 UTC
**Sévérité**: CRITIQUE

### Problème:
Le dashboard affiche des données **INCOHÉRENTES** avec la page Tâches.

### Reproduction:
1. Page Tâches → affiche "3 tâches à gérer"
   - Payer la facture EDF
   - Faire les devoirs
   - Acheter du lait
2. Dashboard → affiche:
   - "Aujourd'hui: 0 à faire" ❌
   - "Cette semaine: 0 tâches" ❌
   - "Bravo, tout est fait !" ❌

### Impact:
- L'utilisateur pense qu'il n'a rien à faire
- Les compteurs sont FAUX
- Perte de confiance dans l'app

### Cause probable:
1. Les tâches créées via MagicNotepad n'ont pas de `deadline` → pas comptées dans "Aujourd'hui"
2. Le compteur "Cette semaine" ne compte que les tâches avec deadline dans la semaine
3. Les tâches "Sans date" ne sont comptées nulle part sur le dashboard

### Solution:
1. Ajouter un compteur "Tâches sans date" ou "À planifier"
2. OU inclure les tâches sans date dans "À faire"
3. Le message "Bravo" ne doit s'afficher QUE si vraiment 0 tâches actives

**FIXER IMMÉDIATEMENT - L'APP EST INUTILISABLE SINON**

---

## 🚨 BUGS MULTIPLES SIGNALÉS

**Date**: 2026-01-16 03:05 UTC

### BUG 3: Calcul d'âge enfant cassé
**Chemin**: Enfants > Ajouter un enfant
**Problème**: 
- Date entrée: 05/15/2018
- Âge affiché: "-78490 an" ❌
- Erreur: "La date doit être dans le passé" alors qu'elle L'EST
**Cause probable**: Bug de parsing de date ou timezone

### BUG 4: Micro (dictée) ne fonctionne pas dans MagicNotepad
**Chemin**: Bouton MagicNotepad > Dicter
**Problème**: Le bouton "Dicter" ne fait rien ou ne démarre pas la reconnaissance vocale
**À vérifier**:
- Permissions microphone demandées ?
- Web Speech API activée ?
- HTTPS requis pour le micro (OK avec Cloudflare)

### Récapitulatif des bugs critiques:
1. ✅ Dashboard non synchronisé avec les tâches - **CORRIGÉ** (commit 0cd060f)
2. ✅ Invitation co-parent ne fonctionne pas - **CORRIGÉ** (commits ba9712f, 488acb3)
3. ✅ Templates non modifiables (pas de popup pré-remplie) - **CORRIGÉ** (commit 5edca68)
4. ✅ Calcul d'âge enfant cassé - **CORRIGÉ** (commit be174c4)
5. ✅ Micro/dictée ne fonctionne pas - **CORRIGÉ** (commit 9c7b255)

**TOUS LES 5 BUGS ONT ÉTÉ CORRIGÉS LE 2026-01-16**

---

## ✅ BUGS CRITIQUES - TOUS CORRIGÉS (2026-01-16)

### BUG 1: Dashboard non synchronisé avec les tâches - CORRIGÉ
**Commit**: 0cd060f
**Solution**: Ajouté getAllPendingTasksCount() et getUnscheduledTasks(), nouveau composant DashboardUnscheduled

### BUG 2: Invitation co-parent ne fonctionne pas - CORRIGÉ
**Commits**: ba9712f, 488acb3
**Solution**: Le formulaire affiche maintenant le lien d'invitation avec bouton copier et envoi par email

### BUG 3: Templates non modifiables - CORRIGÉ
**Commit**: 5edca68
**Solution**: Nouveau composant TemplateTaskDialog, clic sur template ouvre popup pré-rempli pour créer la tâche

### BUG 4: Calcul de l'âge des enfants cassé - CORRIGÉ
**Commit**: be174c4
**Solution**: Utilisation de to_char(birthdate, 'YYYY-MM-DD') dans les requêtes PostgreSQL pour format cohérent

### BUG 5: Micro/Dictée ne fonctionne pas dans MagicNotepad - CORRIGÉ
**Commit**: 9c7b255
**Solution**: isSupported initialisé à true par défaut pour SSR, vérifié après mount côté client


### BUG 6: Ajout enfant crash (NOUVEAU - TypeError)
**Priorité**: CRITIQUE
**Symptôme**: Cliquer sur "Ajouter un enfant" provoque une erreur:
```
TypeError: Cannot read properties of undefined (reading 'logs')
```
**Reproduction**:
1. Aller sur /children
2. Cliquer sur "Ajouter un enfant"
3. Page d'erreur s'affiche
**Fix attendu**: Vérifier le code d'ajout d'enfant, probablement un objet non initialisé

