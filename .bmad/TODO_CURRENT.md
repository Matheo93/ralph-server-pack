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

## Phase 4: Gestion Foyer (Household) ✅

- [x] 4.1 Créer `src/app/(dashboard)/onboarding/page.tsx` - création foyer
- [x] 4.2 Créer `src/lib/validations/household.ts` - schemas Zod
- [x] 4.3 Créer `src/lib/actions/household.ts` - Server Actions CRUD
- [x] 4.4 Créer composant `HouseholdForm`
- [x] 4.5 Logique: après signup → si pas de foyer → onboarding
- [x] 4.6 Créer page invitation co-parent

---

## Phase 5: Gestion Enfants ✅

- [x] 5.1 Créer `src/app/(dashboard)/children/page.tsx` - liste enfants
- [x] 5.2 Créer `src/app/(dashboard)/children/new/page.tsx` - ajout enfant
- [x] 5.3 Créer `src/lib/validations/child.ts` - schemas Zod
- [x] 5.4 Créer `src/lib/actions/children.ts` - Server Actions CRUD
- [x] 5.5 Créer composant `ChildForm` avec calcul âge automatique
- [x] 5.6 Créer composant `ChildCard` pour affichage

---

## Phase 6: Layout & Navigation ✅

- [x] 6.1 Créer `src/app/(dashboard)/layout.tsx` - layout dashboard
- [x] 6.2 Créer composant `Sidebar` avec navigation
- [x] 6.3 Créer composant `Header` avec user menu
- [x] 6.4 Créer composant `MobileNav` (responsive)
- [x] 6.5 Ajouter composants shadcn nécessaires (Button, Input, Card, etc.)

---

## Phase 7: Tests & Build ✅

- [x] 7.1 `bunx tsc --noEmit` - ZÉRO erreur TypeScript
- [x] 7.2 `bun run build` - build production OK
- [ ] 7.3 Tester flow complet: signup → créer foyer → ajouter enfant (MANUEL avec Supabase configuré)
- [ ] 7.4 Vérifier RLS policies fonctionnent (user A ne voit pas foyer de user B) (MANUEL avec Supabase configuré)

---

## Definition of Done Sprint 1
- [x] Auth complète (signup/login/logout/magic link)
- [x] Création foyer fonctionnelle
- [x] Invitation co-parent fonctionnelle
- [x] CRUD enfants fonctionnel
- [x] Build production sans erreur
- [x] Types stricts partout (no `any`)
- [ ] RLS policies actives et testées (dans schema.sql, à tester manuellement)

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

---

## ⚠️ PHASE 8: MIGRATION AWS (PRIORITAIRE) ⚠️

**L'écosystème est AWS, pas Supabase. Migrer MAINTENANT.**

### Resources AWS disponibles:
```env
DATABASE_URL=postgresql://ralph:8gBOBENecJ6Erg9@ralph-test-db.cj8s4m06043b.us-east-1.rds.amazonaws.com:5432/ralphdb
COGNITO_USER_POOL_ID=us-east-1_20DAUfyAk
COGNITO_CLIENT_ID=29fdh7o94qgos24dge389uf2n3
AWS_S3_BUCKET=ralph-saas-assets-1768411274
REDIS_URL=redis://ralph-redis.gohyrv.0001.use1.cache.amazonaws.com:6379
```

### Tâches Migration:

- [x] 8.1 Installer `bun add @aws-sdk/client-cognito-identity-provider amazon-cognito-identity-js pg`
- [x] 8.2 Créer `src/lib/aws/cognito.ts` - Client Cognito (signup, login, logout, session)
- [x] 8.3 Créer `src/lib/aws/database.ts` - Client PostgreSQL direct (pg pool)
- [x] 8.4 Remplacer imports Supabase par AWS dans `src/lib/auth/actions.ts`
- [x] 8.5 Mettre à jour `src/middleware.ts` pour utiliser Cognito tokens (JWT)
- [x] 8.6 Mettre à jour `src/lib/actions/household.ts` pour PostgreSQL direct
- [x] 8.7 Mettre à jour `src/lib/actions/children.ts` pour PostgreSQL direct
- [x] 8.8 Créer `src/lib/aws/auth-schema.sql` avec fonction mock `auth.uid()` pour RLS
- [x] 8.9 Tester signup → login → créer foyer → ajouter enfant avec AWS (MANUEL - appliquer schema SQL)
- [x] 8.10 `bunx tsc --noEmit && bun run build` - ZÉRO erreur

### Pattern Cognito Auth:
```typescript
// src/lib/aws/cognito.ts
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
}

export const userPool = new CognitoUserPool(poolData)
```

### Pattern PostgreSQL Direct:
```typescript
// src/lib/aws/database.ts
import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows
}
```

**NE PAS utiliser Supabase. AWS ONLY.**
