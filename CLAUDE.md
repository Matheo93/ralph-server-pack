# CLAUDE.md - FamilyLoad

## ✅ FEATURE IMPLÉMENTÉE: TRANSITIONS ENTRE PAGES

Les transitions fluides entre les pages sont implémentées avec Framer Motion.

### Composants disponibles

**Fichier:** `src/components/custom/PageTransition.tsx`

| Composant | Description |
|-----------|-------------|
| `PageTransitionProvider` | Contexte pour gérer l'état des transitions |
| `PageWrapper` | Wrapper avec animation fade simple |
| `AnimatedPage` | Animation avancée avec variantes (slide, fade, slideUp, scale) |
| `SharedElement` | Transitions d'éléments partagés entre pages |
| `StaggerChildren` / `StaggerItem` | Animations échelonnées pour listes |
| `LoadingState` | États de chargement animés |
| `PageLoadingOverlay` | Overlay de chargement plein écran |

### Utilisation

```tsx
// Dans un layout (déjà fait dans (dashboard)/layout.tsx)
import { PageTransitionProvider, PageWrapper } from "@/components/custom/PageTransition"

<PageTransitionProvider>
  <PageWrapper>
    {children}
  </PageWrapper>
</PageTransitionProvider>
```

### Accessibilité
- Support `useReducedMotion` pour respecter les préférences utilisateur
- Animations désactivées automatiquement si l'utilisateur préfère réduire les mouvements
