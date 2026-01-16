# CLAUDE.md - Instructions pour Ralph

## NOUVELLES TÂCHES PRIORITAIRES

### 1. TRADUCTION 100% FRANÇAIS
- Vérifier que TOUT le site est en français
- Aucun texte en anglais ne doit apparaître
- Traduire tous les messages, boutons, placeholders

### 2. ENFANT - MISE EN RELATION
- L'enfant doit être lié aux tâches
- Pouvoir assigner une tâche à un enfant spécifique
- Afficher les tâches par enfant
- L'enfant ne doit pas être juste une donnée isolée

### 3. PAGE VIDE - SUGGESTIONS
Quand l'utilisateur n'a pas de tâches, proposer:
- Option 1: Chat rapide pour créer une tâche
- Option 2: Templates pour créer rapidement

### 4. ANIMATION LANDING PAGE
- Animation d'intro au premier chargement (comme entraide souverainiste)
- L'animation se fond ensuite dans le décor de la landing page
- Effet "wow" à l'arrivée

### 5. FUSIONNER LES BOUTONS REDONDANTS
Ces boutons doivent être fusionnés/réorganisés:
- "Toutes les tâches"
- "Analyse charge mentale"
- "Nouvelle tâche"
- "Vue semaine"
- "Toutes les taches"

Trop de boutons similaires = confusion. Simplifier l'interface.

### 6. MICRO QUI NE MARCHE PAS
Le bouton "Dicter" ne fonctionne pas réellement.
- Vérifier l'implémentation Web Speech API
- Tester sur HTTPS (obligatoire pour le micro)
- Ajouter gestion d'erreur si micro non disponible

### 7. APP MOBILE (PWA)
- Vérifier si PWA est bien configurée
- Installer le manifest.json
- Service worker pour offline
- Icônes pour l'écran d'accueil

## BUGS CORRIGÉS (vérifié le 16/01/2026)

| Bug | Statut | Commit |
|-----|--------|--------|
| Dashboard non sync | ✅ CORRIGÉ | edbd5c9 - force-dynamic rendering |
| Invitation cassée | ✅ CORRIGÉ | d2d93f8, 488acb3 - InviteForm fonctionnel |
| Templates non modifiables | ✅ PAR DESIGN | Les templates sont statiques, on peut créer des tâches à partir d'eux |
| Age enfant -78490 | ✅ CORRIGÉ | 46c2e79, be174c4 - sanity check et to_char |
| Micro dictée | ✅ CORRIGÉ | 5396978, 9c7b255 - gestion d'erreurs améliorée |

## COMMITS RÉCENTS (pour référence)
- 4bed372 fix(i18n): add missing French accents in UI components
- 2e68ef5 fix(i18n): correct French accents in UI components
- 5396978 fix(speech): improve dictation error handling and UX
- 46c2e79 fix(children): prevent invalid age calculation (-78490)
- d2d93f8 fix(household): allow parent_principal role to access invite form
- edbd5c9 fix(dashboard): force dynamic rendering for fresh data sync
- ed07239 docs: update CLAUDE.md with bug fix status
- a0bfe7d fix(templates): use non-empty value for Select.Item
- 488acb3 fix(household): replace placeholder with working invite form
- 0cd060f fix(dashboard): show unscheduled tasks and correct total count
- 9c7b255 fix(speech): initialize isSupported to true for SSR
- be174c4 fix(children): use to_char for birthdate

## OBJECTIF
Rendre l'app COHÉRENTE et UTILISABLE. Tout doit être connecté.

### 8. SMOOTH SCROLL
- Ajouter smooth scroll sur toute la landing page
- scroll-behavior: smooth dans le CSS global
- Animations fluides lors de la navigation

## BUG CRITIQUE NON CORRIGÉ - BOUTONS REDONDANTS

**STATUS: NON CORRIGÉ ❌**

Sur le dashboard, il y a TOUJOURS 3 boutons en bas à droite:
1. "+ Nouvelle tâche" (rose)
2. "Vue semaine" (bleu)
3. "Toutes les tâches" (rose)

Ces boutons DOIVENT être fusionnés ou réorganisés!
- C'est redondant
- Ça prend trop de place
- L'utilisateur est confus

**SOLUTION PROPOSÉE:**
- Un seul bouton FAB "Nouvelle tâche"
- Intégrer "Vue semaine" et "Toutes les tâches" dans la navigation ou filtres
