# CLAUDE.md - Instructions RALPH

## 🚨 BUGS DÉTECTÉS PAR PUPPETEER - À CORRIGER MAINTENANT 🚨

❌ Dashboard error: Navigation timeout of 30000 ms exceeded
❌ Settings household error: Navigation timeout of 30000 ms exceeded
❌ Children error: Navigating frame was detached
  ❌ Dashboard: Navigation timeout of 30000 ms exceeded
  ❌ Settings household: Navigation timeout of 30000 ms exceeded

---

## APRÈS CHAQUE CORRECTION, EXÉCUTE:
```bash
node test-auto.js
```

---

## FEATURES À IMPLÉMENTER

1. Animation landing page (style entraide-souverainiste)
2. Suggestions quand dashboard vide (Chat rapide / Templates)
3. Smooth scroll (html { scroll-behavior: smooth; })
4. PWA complète (manifest.json, service worker, icônes)
5. Enfant relié aux tâches (filtrer, afficher sur tâches)

---

## WORKFLOW
1. git pull
2. Corriger UN bug
3. bun run build
4. node test-auto.js
5. Si OK: git commit && git push
6. Recommencer

⚠️ NE JAMAIS COMMIT SANS TESTER!
