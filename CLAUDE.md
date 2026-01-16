# CLAUDE.md - 3 BUGS RESTANTS À CORRIGER

## 🔴 BUG 1: MICRO NE DEMANDE PAS LA PERMISSION 🔴

Le micro ne demande JAMAIS la permission à l'utilisateur!
Ajouter `navigator.mediaDevices.getUserMedia({ audio: true })` pour déclencher la popup.

---

## 🔴 BUG 2: 3 BOUTONS EN BAS À DROITE DU DASHBOARD 🔴

Fusionner les 3 boutons flottants en UN SEUL FAB avec menu.

---

## 🔴 BUG 3: ANIMATION D'INTRO LANDING PAGE 🔴

Quand l'utilisateur arrive sur le site pour la PREMIÈRE FOIS:
- Animation d'intro full-screen (logo qui apparaît, texte qui s'anime)
- Style comme entraide-souverainiste.com
- Après l'animation, ça se fond dans la landing page normale
- Utiliser localStorage pour ne montrer qu'une fois

**EXEMPLE**:
```jsx
// components/IntroAnimation.tsx
'use client'
import { useEffect, useState } from 'react'

export function IntroAnimation({ children }) {
  const [showIntro, setShowIntro] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro')
    if (!hasSeenIntro) {
      setShowIntro(true)
      localStorage.setItem('hasSeenIntro', 'true')
      setTimeout(() => setAnimationDone(true), 3000) // 3 secondes d'animation
    } else {
      setAnimationDone(true)
    }
  }, [])
  
  if (!animationDone && showIntro) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-rose-100 to-orange-50 flex items-center justify-center z-50 animate-fade-out">
        <div className="text-center animate-scale-in">
          <div className="text-6xl font-bold text-rose-500 animate-bounce">FamilyLoad</div>
          <p className="text-xl text-gray-600 mt-4 animate-slide-up">Libérez votre charge mentale</p>
        </div>
      </div>
    )
  }
  
  return children
}
```

---

## WORKFLOW

1. Corriger UN bug
2. `bun run build`
3. `node test-auto.js`
4. `git commit && git push`
5. Recommencer

⚠️ NE T'ARRÊTE JAMAIS!
