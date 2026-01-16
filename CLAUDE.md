# CLAUDE.md - Instructions RALPH

## 🚨 BUGS DÉTECTÉS PAR PUPPETEER - À CORRIGER MAINTENANT 🚨

✅ Tous les bugs corrigés!

---

## APRÈS CHAQUE CORRECTION, EXÉCUTE:
```bash
node test-auto.js
```

---

## FEATURES À IMPLÉMENTER

✅ 1. Animation landing page (style entraide-souverainiste) - ScrollReveal animations
✅ 2. Suggestions quand dashboard vide (Chat rapide / Templates) - EmptySuggestions component
✅ 3. Smooth scroll (html { scroll-behavior: smooth; }) - Already in globals.css
✅ 4. PWA complète (manifest.json, service worker, icônes) - Already implemented
✅ 5. Enfant relié aux tâches (filtrer, afficher sur tâches) - TaskFilters + TaskCard

---

## WORKFLOW
1. git pull
2. Corriger UN bug
3. bun run build
4. node test-auto.js
5. Si OK: git commit && git push
6. Recommencer

⚠️ NE JAMAIS COMMIT SANS TESTER!
