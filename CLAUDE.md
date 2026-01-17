# CLAUDE.md - Instructions RALPH

## STATUS - 2026-01-17 05:10 UTC

Le serveur fonctionne correctement. Toutes les pages principales sont OK.

### Pages testees
- ✅ Landing page (/) - OK
- ✅ Kids page (/kids) - OK
- ✅ Kids login (/kids/login) - OK
- ✅ Dashboard (/dashboard) - redirige vers /login (normal)
- ✅ Challenges (/challenges) - OK avec auth

---

## FEATURES A IMPLEMENTER

1. Animation landing page (style entraide-souverainiste)
2. Suggestions quand dashboard vide (Chat rapide / Templates)
3. Smooth scroll (html { scroll-behavior: smooth; })
4. PWA complete (manifest.json, service worker, icones)
5. Enfant relie aux taches (filtrer, afficher sur taches)
6. Accents UTF-8 dans le code (ex: "Defis" -> "Défis")

---

## WORKFLOW
1. git pull
2. Corriger UN bug ou implementer UNE feature
3. bun run build
4. Tester avec curl
5. Si OK: git commit && git push
6. Recommencer

NE JAMAIS COMMIT SANS TESTER!
