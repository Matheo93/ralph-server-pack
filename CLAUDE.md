# CLAUDE.md - TOUS LES BUGS CORRIGES

## BUG 1: MICRO NE DEMANDE PAS LA PERMISSION - CORRIGE

Le hook `useVocalRecording.ts` demande maintenant correctement la permission microphone avec des messages d'erreur explicites:
- "Microphone non autorise. Veuillez autoriser l'acces au micro dans les parametres du navigateur."
- "Aucun microphone detecte sur cet appareil."

Le hook `useSpeechToText.ts` avait deja cette fonctionnalite.

---

## BUG 2: 3 BOUTONS EN BAS A DROITE DU DASHBOARD - CORRIGE

Les 3 composants (QuickActions, MagicNotepad, VocalRecorder) ont ete fusionnes en UN SEUL composant `UnifiedFAB.tsx`:
- Un bouton principal qui ouvre un menu
- Actions: Nouvelle tache, Carnet Magique (avec dictee vocale), Vue semaine, Toutes les taches
- Le carnet magique permet de dicter ou ecrire des notes et les classifier en taches avec l'IA

---

## BUG 3: ANIMATION D'INTRO LANDING PAGE - CORRIGE

Le composant `IntroAnimation.tsx` affiche une animation d'intro pour les nouveaux visiteurs:
- Logo anime avec effet de glow
- Titre "FamilyLoad" avec gradient
- Tagline "Liberez votre charge mentale"
- Stocke dans localStorage pour ne montrer qu'une fois
- Transition fluide vers la landing page

---

## COMMITS EFFECTUES

1. `fix: merge FAB buttons into single UnifiedFAB component`
2. `feat(marketing): add intro animation for first-time visitors`

---

## STACK

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| Framework | Next.js 15 App Router |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Tailwind v4 + shadcn/ui |
| Validation | Zod |
| Tests | Vitest + Playwright |
