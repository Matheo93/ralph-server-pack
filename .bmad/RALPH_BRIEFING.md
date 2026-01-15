# BRIEFING POUR RALPH - Leçons apprises sur EasyLife

## DE LA PART DE TON COLLEGUE CLAUDE (Matheo93's machine)

Salut Ralph ! J'ai baby-sitté le projet EasyLife pendant 9 sprints et 261,122 lignes de code. Voici ce que j'ai appris pour que tu ne refasses pas mes erreurs.

---

## LES PIÈGES À ÉVITER

### 1. NE JAMAIS POSER DE QUESTIONS
Sérieusement. Le user dort pendant que tu bosses. Si tu poses une question, tu bloques tout le sprint pendant 8h.

**MAUVAIS:**
```
"Voulez-vous que j'utilise Zustand ou Redux pour le state management?"
```

**BON:**
```
// J'ai choisi Zustand car plus léger et suffisant pour ce use case
// Voir documentation du choix dans /docs/DECISIONS.md
```

### 2. LES TESTS QUI CASSENT TOUT
Sur EasyLife, j'ai eu des tests Playwright qui échouaient à cause de:
- Timeouts trop courts (utilise 30s minimum)
- Sélecteurs fragiles (préfère `data-testid` aux classes CSS)
- Tests qui dépendent de l'ordre d'exécution

**Pattern qui marche:**
```typescript
// Toujours attendre explicitement
await page.waitForSelector('[data-testid="submit-btn"]', { timeout: 30000 })
await page.click('[data-testid="submit-btn"]')
await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
```

### 3. SUPABASE RLS - LE PIÈGE CLASSIQUE
J'ai passé 3 itérations à debug des erreurs "permission denied" parce que j'oubliais les RLS policies.

**Checklist obligatoire après chaque nouvelle table:**
```sql
-- 1. Activer RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT
CREATE POLICY "Users can view own data" ON my_table
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Policy INSERT
CREATE POLICY "Users can insert own data" ON my_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Policy UPDATE
CREATE POLICY "Users can update own data" ON my_table
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Policy DELETE
CREATE POLICY "Users can delete own data" ON my_table
  FOR DELETE USING (auth.uid() = user_id);
```

### 4. IMPORTS CIRCULAIRES
Next.js 15 déteste ça. Si tu vois "Maximum call stack size exceeded", c'est probablement ça.

**Structure safe:**
```
lib/
├── db.ts          # Client Supabase uniquement
├── auth.ts        # Importe db.ts
├── utils.ts       # Aucun import local
└── actions/
    └── user.ts    # Importe auth.ts et db.ts
```

### 5. 'use client' CONTAMINATION
Une fois que tu mets 'use client', tous les enfants deviennent client. J'ai eu des bundles de 500KB à cause de ça.

**Pattern:**
```typescript
// page.tsx (Server Component)
export default async function Page() {
  const data = await getData() // Server-side fetch
  return <ClientWrapper initialData={data} />
}

// ClientWrapper.tsx
'use client'
export function ClientWrapper({ initialData }) {
  // Interactivité ici seulement
}
```

---

## WORKFLOW QUI MARCHE

### Avant chaque tâche:
1. Lis TODO_CURRENT.md EN ENTIER
2. Identifie les dépendances (cette tâche a besoin de quoi?)
3. Vérifie que le build passe AVANT de commencer

### Pendant la tâche:
1. UNE seule chose à la fois
2. Commit après chaque sous-étape fonctionnelle
3. Lance `bun run build` régulièrement

### Après la tâche:
1. `bunx tsc --noEmit` - zéro erreur TypeScript
2. `bun run build` - build OK
3. Coche la tâche dans TODO_CURRENT.md
4. Commit avec message clair

---

## COMMANDES UTILES

```bash
# Vérification rapide
bunx tsc --noEmit && bun run build

# Reset si tout est cassé
rm -rf node_modules .next && bun install

# Voir les erreurs de type en détail
bunx tsc --noEmit --pretty 2>&1 | head -50

# Lancer UN test spécifique
bun run test -- --grep "nom du test"
```

---

## STRUCTURE DE COMMIT

```
type(scope): description courte

- Détail 1
- Détail 2

🤖 Ralph Wiggum - Sprint X
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## QUAND TU ES BLOQUÉ

1. **Build qui casse** → Vérifie les imports, cherche les dépendances circulaires
2. **Tests qui échouent** → Augmente les timeouts, utilise data-testid
3. **Erreur Supabase 403** → RLS policies manquantes
4. **"Module not found"** → `bun install` puis vérifie le package.json
5. **Hydration mismatch** → Tu as du 'use client' mal placé

---

## MESSAGE FINAL

Le user (Matheo93) dort. Il te fait confiance. Ne le déçois pas.

Chaque ligne de code que tu écris doit être:
- Typée strictement (ZERO `any`)
- Validée avec Zod
- Testée
- Commitée

Quand le sprint est fini, output: `<promise>TASK_COMPLETE</promise>`

Bonne chance collègue ! 🍩

---

*- Claude, depuis la machine de Matheo93*
*P.S: J'ai survécu à 261,122 lignes de code. Tu peux le faire aussi.*
