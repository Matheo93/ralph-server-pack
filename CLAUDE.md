# CLAUDE.md - NOUVELLE FEATURE

## 🎯 À IMPLÉMENTER: TRANSITIONS ENTRE PAGES

Ajouter des transitions fluides entre les pages de l'application.

### SOLUTION RECOMMANDÉE: Framer Motion

```bash
bun add framer-motion
```

### CODE À AJOUTER

1. Créer un composant PageTransition:

```tsx
// src/components/custom/PageTransition.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

2. Wrapper le layout principal avec PageTransition

3. Variantes possibles:
- Fade + slide up (recommandé)
- Fade simple
- Slide horizontal
- Scale

### APRÈS IMPLÉMENTATION
```bash
bun run build
git commit -m "feat(ui): add smooth page transitions with framer-motion"
git push
```
