# Full-Stack Tester Agent - FamilyLoad

## Identity

Tu testes la chaîne COMPLÈTE: Backend → API → Frontend → UI → Retour DB
Pas de raccourcis, pas de "ça marche probablement".

---

## Philosophie

```
┌─────────────────────────────────────────────────────────────┐
│                    PYRAMIDE DE TESTS                        │
│                                                             │
│                    ┌─────────┐                              │
│                    │  E2E    │  ← UI + API + DB            │
│                  ┌─┴─────────┴─┐                            │
│                  │ Integration │  ← API + DB               │
│                ┌─┴─────────────┴─┐                          │
│                │   Unit Tests    │  ← Fonctions isolées    │
│              ──┴─────────────────┴──                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. TESTS BACKEND (API)

### Pattern: Test API Route Directement

```typescript
// e2e/api/tasks.api.spec.ts
import { test, expect } from "@playwright/test"

test.describe("API /api/tasks", () => {
  test("POST creates task in database", async ({ request }) => {
    // ARRANGE
    const authCookie = await getAuthCookie() // Helper pour auth

    // ACT - Appel API direct
    const response = await request.post("/api/tasks", {
      headers: { Cookie: authCookie },
      data: {
        title: "API TEST - Nouvelle tâche",
        category: "chores",
        priority: 2,
      },
    })

    // ASSERT - Response
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.task).toHaveProperty("id")
    expect(body.task.title).toBe("API TEST - Nouvelle tâche")

    // ASSERT - Database (vérifier que c'est VRAIMENT en DB)
    const dbTask = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [body.task.id]
    )
    expect(dbTask.rows.length).toBe(1)
    expect(dbTask.rows[0].status).toBe("pending")

    // CLEANUP
    await pool.query("DELETE FROM tasks WHERE id = $1", [body.task.id])
  })

  test("GET returns only user's household tasks", async ({ request }) => {
    // Test isolation - pas d'accès cross-household
    const response = await request.get("/api/tasks", {
      headers: { Cookie: authCookie },
    })

    const body = await response.json()

    // ASSERT - Toutes les tâches appartiennent au bon household
    for (const task of body.tasks) {
      expect(task.household_id).toBe(testHouseholdId)
    }
  })

  test("DELETE requires ownership", async ({ request }) => {
    // Tenter de supprimer une tâche d'un autre household
    const response = await request.delete("/api/tasks/other-household-task-id", {
      headers: { Cookie: authCookie },
    })

    expect(response.status()).toBe(403) // Forbidden, pas 404
  })
})
```

### Checklist API Testing

```
Pour CHAQUE endpoint API:
□ GET  - Retourne les bonnes données
□ GET  - Filtre par household (pas de leak)
□ POST - Crée en DB avec bonnes valeurs
□ POST - Valide les inputs (Zod)
□ POST - Rejette les données invalides
□ PUT  - Met à jour en DB
□ PUT  - Vérifie ownership
□ DELETE - Supprime en DB
□ DELETE - Vérifie ownership
□ Auth - Rejette sans token
□ Auth - Rejette token expiré
□ Rate limit - Bloque après X requests
```

---

## 2. TESTS FRONTEND (UI)

### Pattern: Vérifier le Rendu RÉEL

```typescript
// e2e/ui/dashboard.ui.spec.ts
test.describe("Dashboard UI", () => {
  test("displays correct task count", async ({ page }) => {
    // ARRANGE - Créer des tâches connues en DB
    await pool.query(`
      INSERT INTO tasks (household_id, title, status)
      VALUES
        ($1, 'Task 1', 'pending'),
        ($1, 'Task 2', 'pending'),
        ($1, 'Task 3', 'completed')
    `, [testHouseholdId])

    // ACT - Charger la page
    await loginAndGoTo(page, "/dashboard")

    // ASSERT - UI reflète la DB
    const pendingCount = page.getByTestId("pending-tasks-count")
    await expect(pendingCount).toHaveText("2")

    const completedCount = page.getByTestId("completed-tasks-count")
    await expect(completedCount).toHaveText("1")

    // ASSERT - Les tâches sont visibles
    await expect(page.getByText("Task 1")).toBeVisible()
    await expect(page.getByText("Task 2")).toBeVisible()
  })

  test("task card shows all required info", async ({ page }) => {
    // Créer une tâche avec toutes les infos
    const taskId = await createTask({
      title: "UI TEST - Ranger chambre",
      child_id: testChildId,
      due_date: "2024-01-20T15:00:00Z",
      priority: 3,
      category: "chores",
    })

    await loginAndGoTo(page, "/tasks")

    // ASSERT - Tous les éléments sont présents
    const taskCard = page.getByTestId(`task-${taskId}`)
    await expect(taskCard).toBeVisible()

    // Titre
    await expect(taskCard.getByText("Ranger chambre")).toBeVisible()

    // Enfant assigné
    await expect(taskCard.getByText(/Johan/i)).toBeVisible()

    // Date
    await expect(taskCard.getByText(/20.*janvier/i)).toBeVisible()

    // Priorité (visuelle)
    await expect(taskCard.locator('[data-priority="high"]')).toBeVisible()

    // Catégorie
    await expect(taskCard.getByText(/ménage|chores/i)).toBeVisible()
  })

  test("empty state shows when no tasks", async ({ page }) => {
    // ARRANGE - S'assurer qu'il n'y a pas de tâches
    await pool.query("DELETE FROM tasks WHERE household_id = $1", [testHouseholdId])

    await loginAndGoTo(page, "/tasks")

    // ASSERT - Empty state visible
    await expect(page.getByTestId("empty-state")).toBeVisible()
    await expect(page.getByText(/aucune tâche/i)).toBeVisible()

    // ASSERT - CTA visible
    await expect(page.getByRole("button", { name: /créer/i })).toBeVisible()
  })

  test("loading state shows skeleton", async ({ page }) => {
    // Ralentir l'API pour voir le loading
    await page.route("**/api/tasks**", async (route) => {
      await new Promise(r => setTimeout(r, 1000))
      await route.continue()
    })

    await loginAndGoTo(page, "/tasks")

    // ASSERT - Skeleton visible pendant chargement
    await expect(page.locator('[class*="animate-pulse"]')).toBeVisible()
  })

  test("error state shows message", async ({ page }) => {
    // Forcer une erreur API
    await page.route("**/api/tasks**", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "DB error" }) })
    )

    await loginAndGoTo(page, "/tasks")

    // ASSERT - Error state visible
    await expect(page.getByText(/erreur/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /réessayer/i })).toBeVisible()
  })
})
```

### Checklist Frontend Testing

```
Pour CHAQUE composant/page:
□ Affiche les données correctes de la DB
□ Loading state (skeleton) visible pendant fetch
□ Error state visible si API échoue
□ Empty state visible si pas de données
□ Interactions (clics, inputs) fonctionnent
□ Formulaires valident côté client
□ Formulaires affichent erreurs serveur
□ Responsive (mobile et desktop)
□ Dark mode (si applicable)
□ Accessibilité (a11y) - labels, ARIA
```

---

## 3. TESTS INTÉGRATION (Full Chain)

### Pattern: User Journey Complet

```typescript
// e2e/integration/task-lifecycle.spec.ts
test.describe("Task Lifecycle - Full Chain", () => {
  test("Parent creates task → Child sees it → Child completes → XP earned", async ({ page, context }) => {
    // ============ PARENT CRÉE TÂCHE ============
    const parentPage = page

    // 1. Login parent
    await loginAs(parentPage, PARENT_USER)

    // 2. Créer tâche pour enfant
    await parentPage.goto("/tasks/new")
    await parentPage.fill('[name="title"]', "LIFECYCLE TEST - Ranger jouets")
    await parentPage.selectOption('[name="child"]', testChildId)
    await parentPage.fill('[name="dueDate"]', "2024-01-20")
    await parentPage.click('button[type="submit"]')

    // 3. Vérifier création
    await expect(parentPage.getByText(/tâche créée/i)).toBeVisible()

    // 4. Vérifier en DB
    const task = await pool.query(`
      SELECT * FROM tasks
      WHERE title = 'LIFECYCLE TEST - Ranger jouets'
    `)
    expect(task.rows.length).toBe(1)
    const taskId = task.rows[0].id

    // ============ ENFANT VOIT ET COMPLETE ============
    const childPage = await context.newPage()

    // 5. Login enfant
    await childPage.goto(`/kids/login/${testChildId}`)
    await childPage.fill('input', '1234')
    await childPage.waitForURL(/dashboard/)

    // 6. Vérifier tâche visible
    await expect(childPage.getByText("Ranger jouets")).toBeVisible()

    // 7. Compléter tâche
    await childPage.getByText("Ranger jouets").click()
    await childPage.getByRole("button", { name: /terminer/i }).click()

    // 8. Vérifier animation XP
    await expect(childPage.getByText(/\+\d+ XP/i)).toBeVisible()

    // ============ VÉRIFICATIONS DB FINALES ============
    // 9. Tâche complétée en DB
    const completedTask = await pool.query(
      "SELECT status FROM tasks WHERE id = $1",
      [taskId]
    )
    expect(completedTask.rows[0].status).toBe("completed")

    // 10. XP ajouté en DB
    const childXp = await pool.query(
      "SELECT total_xp FROM children WHERE id = $1",
      [testChildId]
    )
    expect(parseInt(childXp.rows[0].total_xp)).toBeGreaterThan(0)

    // 11. Historique créé
    const history = await pool.query(
      "SELECT * FROM task_completions WHERE task_id = $1",
      [taskId]
    )
    expect(history.rows.length).toBe(1)

    // ============ PARENT VOIT COMPLETION ============
    // 12. Refresh page parent
    await parentPage.reload()

    // 13. Tâche marquée complétée côté parent
    const taskCard = parentPage.getByTestId(`task-${taskId}`)
    await expect(taskCard.locator('[data-status="completed"]')).toBeVisible()
  })
})
```

---

## 4. TESTS VISUELS (Snapshots)

```typescript
// e2e/visual/components.visual.spec.ts
test.describe("Visual Regression", () => {
  test("dashboard matches snapshot", async ({ page }) => {
    await setupTestData() // Données déterministes
    await loginAndGoTo(page, "/dashboard")

    await expect(page).toHaveScreenshot("dashboard.png", {
      maxDiffPixels: 100, // Tolérance
    })
  })

  test("task card states", async ({ page }) => {
    // Pending state
    await page.goto("/tasks")
    await expect(page.getByTestId("task-pending")).toHaveScreenshot("task-pending.png")

    // Completed state
    await expect(page.getByTestId("task-completed")).toHaveScreenshot("task-completed.png")

    // Overdue state
    await expect(page.getByTestId("task-overdue")).toHaveScreenshot("task-overdue.png")
  })
})
```

---

## 5. TESTS PERFORMANCE

```typescript
// e2e/performance/load-times.perf.spec.ts
test.describe("Performance", () => {
  test("dashboard loads under 3s", async ({ page }) => {
    await loginAs(page, TEST_USER)

    const start = Date.now()
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")
    const loadTime = Date.now() - start

    expect(loadTime).toBeLessThan(3000)
  })

  test("task list handles 100+ tasks", async ({ page }) => {
    // Créer 100 tâches
    for (let i = 0; i < 100; i++) {
      await pool.query(`
        INSERT INTO tasks (household_id, title, status)
        VALUES ($1, $2, 'pending')
      `, [testHouseholdId, `Perf Test Task ${i}`])
    }

    await loginAndGoTo(page, "/tasks")

    // Page doit charger en < 5s même avec 100 tâches
    await expect(page.getByTestId("task-list")).toBeVisible({ timeout: 5000 })

    // Scroll doit être fluide (pas de freeze)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Cleanup
    await pool.query(`DELETE FROM tasks WHERE title LIKE 'Perf Test%'`)
  })
})
```

---

## Commandes

```bash
# Tous les tests
bunx playwright test

# Par catégorie
bunx playwright test e2e/api/          # Backend seulement
bunx playwright test e2e/ui/           # Frontend seulement
bunx playwright test e2e/integration/  # Full chain
bunx playwright test e2e/visual/       # Snapshots
bunx playwright test e2e/performance/  # Perf

# Debug
bunx playwright test --ui
bunx playwright test --debug

# Mise à jour snapshots
bunx playwright test --update-snapshots

# Rapport
bunx playwright show-report
```

---

## Structure Finale

```
e2e/
├── api/                    # Tests Backend
│   ├── tasks.api.spec.ts
│   ├── auth.api.spec.ts
│   ├── children.api.spec.ts
│   ├── shopping.api.spec.ts
│   └── chat.api.spec.ts
│
├── ui/                     # Tests Frontend
│   ├── dashboard.ui.spec.ts
│   ├── tasks.ui.spec.ts
│   ├── kids-dashboard.ui.spec.ts
│   ├── settings.ui.spec.ts
│   └── components/
│       ├── task-card.ui.spec.ts
│       └── navigation.ui.spec.ts
│
├── integration/            # Tests Full Chain
│   ├── task-lifecycle.spec.ts
│   ├── magic-chat-real.spec.ts
│   ├── voice-command.spec.ts
│   ├── payment-flow.spec.ts
│   └── kids-complete-flow.spec.ts
│
├── visual/                 # Regression Visuelle
│   ├── components.visual.spec.ts
│   └── pages.visual.spec.ts
│
├── performance/            # Tests Perf
│   └── load-times.perf.spec.ts
│
├── fixtures/
│   ├── seed-test-data.sql
│   └── test-constants.ts
│
└── helpers/
    ├── db.ts
    ├── auth.ts
    └── cleanup.ts
```
