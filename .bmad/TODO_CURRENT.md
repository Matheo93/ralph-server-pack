# TODO CURRENT - Sprint 1: Fondations Tech

## INSTRUCTIONS CRITIQUES
**NE POSE JAMAIS DE QUESTIONS - CONTINUE AUTOMATIQUEMENT**
**ÉCRIS DU CODE RÉEL - PAS DE MOCKS**
**TESTS OBLIGATOIRES POUR CHAQUE FEATURE**
**LIS MASTER_PROMPT.md AVANT DE COMMENCER**
**LIS RALPH_BRIEFING.md POUR LES PIÈGES À ÉVITER**

---

## Sprint Goal
Avoir l'authentification, la gestion du foyer et des enfants fonctionnels.

---

## PRÉ-REQUIS
- [x] 0.1 Lire MASTER_PROMPT.md entièrement
- [x] 0.2 Lire RALPH_BRIEFING.md (leçons apprises)
- [x] 0.3 Vérifier que les variables d'env AWS sont disponibles

---

## Phase 1: Setup Projet Next.js ✅

- [x] 1.1 Initialiser Next.js 15 avec `bunx create-next-app@latest familyload-web --typescript --tailwind --eslint --app --src-dir`
- [x] 1.2 Configurer TypeScript strict mode dans tsconfig.json
- [x] 1.3 Installer dépendances: `bun add zod @supabase/supabase-js @supabase/ssr stripe`
- [x] 1.4 Installer shadcn/ui: `bunx shadcn@latest init`
- [x] 1.5 Créer structure dossiers:
  ```
  src/
  ├── app/
  ├── components/
  │   ├── ui/        (shadcn)
  │   └── custom/    (nos composants)
  ├── lib/
  │   ├── supabase/
  │   ├── utils/
  │   └── validations/
  ├── hooks/
  └── types/
  ```

---

## Phase 2: Configuration Supabase ✅

- [x] 2.1 Créer `src/lib/supabase/client.ts` (client browser)
- [x] 2.2 Créer `src/lib/supabase/server.ts` (client server)
- [x] 2.3 Créer `src/lib/supabase/middleware.ts` (refresh session)
- [x] 2.4 Créer fichier `.env.local` avec variables Supabase
- [x] 2.5 Exécuter le schema.sql dans Supabase (depuis .bmad/schema.sql) - MANUEL: copier .bmad/schema.sql dans l'éditeur SQL Supabase
- [x] 2.6 Générer types: `bunx supabase gen types typescript --project-id XXX > src/types/database.ts` - Types créés manuellement

---

## Phase 3: Authentification ✅

- [x] 3.1 Créer `src/app/(auth)/login/page.tsx` - page login
- [x] 3.2 Créer `src/app/(auth)/signup/page.tsx` - page signup
- [x] 3.3 Créer `src/app/(auth)/callback/route.ts` - OAuth callback
- [x] 3.4 Créer `src/lib/auth/actions.ts` - Server Actions (login, signup, logout)
- [x] 3.5 Créer `src/middleware.ts` - protection routes
- [x] 3.6 Créer composant `AuthForm` avec validation Zod
- [x] 3.7 Ajouter support Magic Link
- [ ] 3.8 Tester: signup → email confirmation → login → session (MANUEL)

---

## Phase 4: Gestion Foyer (Household)

- [ ] 4.1 Créer `src/app/(dashboard)/onboarding/page.tsx` - création foyer
- [ ] 4.2 Créer `src/lib/validations/household.ts` - schemas Zod
- [ ] 4.3 Créer `src/lib/actions/household.ts` - Server Actions CRUD
- [ ] 4.4 Créer composant `HouseholdForm`
- [ ] 4.5 Logique: après signup → si pas de foyer → onboarding
- [ ] 4.6 Créer page invitation co-parent

---

## Phase 5: Gestion Enfants

- [ ] 5.1 Créer `src/app/(dashboard)/children/page.tsx` - liste enfants
- [ ] 5.2 Créer `src/app/(dashboard)/children/new/page.tsx` - ajout enfant
- [ ] 5.3 Créer `src/lib/validations/child.ts` - schemas Zod
- [ ] 5.4 Créer `src/lib/actions/children.ts` - Server Actions CRUD
- [ ] 5.5 Créer composant `ChildForm` avec calcul âge automatique
- [ ] 5.6 Créer composant `ChildCard` pour affichage

---

## Phase 6: Layout & Navigation

- [ ] 6.1 Créer `src/app/(dashboard)/layout.tsx` - layout dashboard
- [ ] 6.2 Créer composant `Sidebar` avec navigation
- [ ] 6.3 Créer composant `Header` avec user menu
- [ ] 6.4 Créer composant `MobileNav` (responsive)
- [ ] 6.5 Ajouter composants shadcn nécessaires (Button, Input, Card, etc.)

---

## Phase 7: Tests & Build

- [ ] 7.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [ ] 7.2 `bun run build` - build production OK
- [ ] 7.3 Tester flow complet: signup → créer foyer → ajouter enfant
- [ ] 7.4 Vérifier RLS policies fonctionnent (user A ne voit pas foyer de user B)

---

## Definition of Done Sprint 1
- [ ] Auth complète (signup/login/logout/magic link)
- [ ] Création foyer fonctionnelle
- [ ] Invitation co-parent fonctionnelle
- [ ] CRUD enfants fonctionnel
- [ ] Build production sans erreur
- [ ] Types stricts partout (no `any`)
- [ ] RLS policies actives et testées

---

## Variables d'environnement requises
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Commandes utiles
```bash
bun dev              # Dev server
bun build            # Production build
bunx tsc --noEmit    # Type check
bunx supabase db push # Push migrations
```

---

## Notes
- Commit après CHAQUE tâche terminée
- Message format: `feat(scope): description`
- Documenter choix dans .bmad/DECISIONS.md
- Si bloqué sur RLS → voir RALPH_BRIEFING.md

**Signal fin sprint**: `<promise>TASK_COMPLETE</promise>`
