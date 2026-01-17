# CLAUDE.md - Instructions RALPH

## 🚨 BUGS DÉTECTÉS PAR PUPPETEER - À CORRIGER MAINTENANT 🚨

❌ Landing page error: net::ERR_SOCKET_NOT_CONNECTED at http://localhost:3000
❌ Dashboard error: net::ERR_CONNECTION_REFUSED at http://localhost:3000/dashboard
❌ Settings household error: net::ERR_CONNECTION_REFUSED at http://localhost:3000/settings/household
❌ Children error: net::ERR_CONNECTION_REFUSED at http://localhost:3000/children
  ❌ Landing page: net::ERR_SOCKET_NOT_CONNECTED at http://localhost:3000

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
