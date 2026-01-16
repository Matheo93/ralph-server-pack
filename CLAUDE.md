# CLAUDE.md - TRANSITION LANDING → LOGIN

## 🎯 À IMPLÉMENTER MAINTENANT

Quand l'utilisateur clique sur "Connexion" ou "Essai gratuit" sur la landing page, il faut une **transition fluide** vers la page de login/signup.

### PROBLÈME ACTUEL
- Clic sur bouton → changement de page brutal
- Pas d'animation de sortie de la landing
- Pas d'animation d'entrée sur login

### SOLUTION

1. **Ajouter framer-motion sur la landing page** (src/app/(marketing)/page.tsx ou layout.tsx)

2. **Animation de sortie** quand on clique sur Connexion/Essai gratuit:
```tsx
// Fade out + slide up de la landing
exit={{ opacity: 0, y: -50 }}
transition={{ duration: 0.4 }}
```

3. **Animation d'entrée** sur la page login:
```tsx
// Fade in + slide up
initial={{ opacity: 0, y: 30 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, delay: 0.1 }}
```

4. **OU utiliser View Transitions API** (plus moderne):
```tsx
// Dans le lien
<Link href="/login" onClick={(e) => {
  e.preventDefault()
  document.startViewTransition(() => {
    router.push('/login')
  })
}}>
```

### FICHIERS À MODIFIER
- src/app/(marketing)/page.tsx - Landing page
- src/app/(marketing)/layout.tsx - Layout marketing
- src/app/(auth)/login/page.tsx - Page login
- src/app/(auth)/layout.tsx - Layout auth

### TEST
Aller sur la landing, cliquer "Connexion" ou "Essai gratuit" → transition smooth

### COMMIT
```bash
git commit -m "feat(ui): add smooth transitions from landing to auth pages"
git push
```
