# Test Workflow Skill - FamilyLoad

## Le Problème

Les tests E2E actuels utilisent des **MOCKS** :
```typescript
// ❌ Ce qu'on faisait (MAUVAIS)
await page.route("**/api/tasks**", async (route) => {
  await route.fulfill({ body: JSON.stringify({ tasks: fakeTasks }) })
})
```

**Résultat**: Tests passent même si le code est cassé.

---

## La Solution: Tests d'Intégration RÉELS

```typescript
// ✅ Ce qu'on fait maintenant (BON)
// 1. Login réel
await page.goto("/login")
await page.fill('[name="email"]', realEmail)
await page.fill('[name="password"]', realPassword)
await page.click('button[type="submit"]')

// 2. Action réelle
await page.fill('#task-title', 'Ma tâche')
await page.click('#create-task')

// 3. Vérification DB réelle
const task = await pool.query('SELECT * FROM tasks WHERE title = $1', ['Ma tâche'])
expect(task.rows.length).toBe(1)
```

---

## Workflow de Test Complet

### 1. Setup Environnement Test

```bash
# Créer une DB de test (ou utiliser la même avec préfixe)
export DATABASE_URL="postgresql://..."
export TEST_USER_EMAIL="test-e2e@familyload.test"
export TEST_USER_PASSWORD="TestE2E123!"
```

### 2. Créer Données de Test

```sql
-- Script: e2e/fixtures/seed-test-data.sql
-- Exécuter AVANT les tests

-- User de test
INSERT INTO users (id, email, name)
VALUES ('test-user-id', 'test-e2e@familyload.test', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- Household de test
INSERT INTO households (id, name, subscription_status)
VALUES ('test-household-id', 'Test Household', 'premium')
ON CONFLICT DO NOTHING;

-- Lier user au household
INSERT INTO household_members (user_id, household_id, role)
VALUES ('test-user-id', 'test-household-id', 'parent_principal')
ON CONFLICT DO NOTHING;

-- Enfant de test
INSERT INTO children (id, household_id, first_name, birthdate)
VALUES ('test-child-id', 'test-household-id', 'Johan', '2015-05-15')
ON CONFLICT DO NOTHING;

-- Compte enfant avec PIN 1234
INSERT INTO child_accounts (child_id, pin_hash)
VALUES ('test-child-id', '$2b$10$...')  -- Hash de 1234
ON CONFLICT DO NOTHING;
```

### 3. Structure des Tests

```
e2e/
├── fixtures/
│   ├── seed-test-data.sql
│   └── test-user.ts          # Credentials
├── helpers/
│   ├── db.ts                 # Pool PostgreSQL
│   ├── auth.ts               # Login helpers
│   └── cleanup.ts            # Nettoyage
├── integration/              # ⭐ NOUVEAUX TESTS RÉELS
│   ├── magic-chat-real.spec.ts
│   ├── kids-flow-real.spec.ts
│   ├── payment-real.spec.ts
│   └── task-lifecycle-real.spec.ts
└── unit/                     # Tests avec mocks (rapides)
    ├── navigation.spec.ts
    └── ui-components.spec.ts
```

### 4. Commandes

```bash
# Tests unitaires (rapides, avec mocks)
bunx playwright test e2e/unit/

# Tests d'intégration (lents, vraie DB)
DATABASE_URL=... bunx playwright test e2e/integration/

# Test spécifique
bunx playwright test e2e/integration/magic-chat-real.spec.ts

# Mode debug
bunx playwright test --ui

# Avec rapport
bunx playwright test --reporter=html
bunx playwright show-report
```

---

## Checklist Avant de Dire "Tests OK"

### Pour chaque flow critique:

```
□ Le test utilise la VRAIE base de données
□ Le test vérifie l'état AVANT l'action
□ Le test effectue l'action via l'UI
□ Le test vérifie l'état en DB APRÈS l'action
□ Le test vérifie l'UI reflète le changement
□ Le test nettoie ses données après
```

### Flows critiques à couvrir:

| Flow | Fichier Test | Status |
|------|--------------|--------|
| Signup → Onboarding | `signup-real.spec.ts` | ⏳ |
| Login Parent | `auth-real.spec.ts` | ⏳ |
| Login Enfant (PIN) | `kids-flow-real.spec.ts` | ✅ |
| Créer Tâche Manuelle | `task-lifecycle-real.spec.ts` | ⏳ |
| Créer Tâche via Chat | `magic-chat-real.spec.ts` | ✅ |
| Créer Tâche via Vocal | `voice-real.spec.ts` | ⏳ |
| Compléter Tâche (Parent) | `task-lifecycle-real.spec.ts` | ⏳ |
| Compléter Tâche (Enfant) | `kids-flow-real.spec.ts` | ✅ |
| Gagner XP | `kids-flow-real.spec.ts` | ✅ |
| Échanger XP (Shop) | `kids-shop-real.spec.ts` | ⏳ |
| Upgrade Premium | `payment-real.spec.ts` | ⏳ |
| Liste Courses | `shopping-real.spec.ts` | ⏳ |
| Calendrier | `calendar-real.spec.ts` | ⏳ |

---

## Anti-Patterns à Éviter

```typescript
// ❌ Mock l'API
await page.route("**/api/**", ...)

// ❌ Vérifier juste que "ça charge"
await page.goto("/dashboard")
// Fin du test

// ❌ Timeouts arbitraires
await page.waitForTimeout(5000)

// ❌ Pas de vérification DB
// "L'UI dit que c'est fait, donc c'est fait"

// ❌ Pas de cleanup
// Les données de test s'accumulent
```

---

## Pattern Recommandé

```typescript
test("create task via magic chat", async ({ page }) => {
  // ARRANGE - État initial
  const initialCount = await db.query("SELECT COUNT(*) FROM tasks WHERE household_id = $1", [hid])

  // ACT - Action utilisateur
  await loginAs(page, TEST_USER)
  await page.click('[data-testid="magic-chat"]')
  await page.fill('input', 'Faire les courses demain')
  await page.press('input', 'Enter')

  // ASSERT - Vérification UI
  await expect(page.getByText(/tâche créée/i)).toBeVisible()

  // ASSERT - Vérification DB
  const newCount = await db.query("SELECT COUNT(*) FROM tasks WHERE household_id = $1", [hid])
  expect(newCount.rows[0].count).toBe(initialCount.rows[0].count + 1)

  // ASSERT - Vérification données correctes
  const task = await db.query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 1")
  expect(task.rows[0].title).toContain("courses")
  expect(task.rows[0].due_date).toBeTruthy()

  // CLEANUP
  await db.query("DELETE FROM tasks WHERE id = $1", [task.rows[0].id])
})
```

---

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: familyload_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install deps
        run: bun install

      - name: Seed test data
        run: psql -f e2e/fixtures/seed-test-data.sql
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/familyload_test

      - name: Run E2E tests
        run: bunx playwright test e2e/integration/
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/familyload_test
          PLAYWRIGHT_BASE_URL: http://localhost:3000

      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```
