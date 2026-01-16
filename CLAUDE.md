# CLAUDE.md - SEO PRIORITÉ MAXIMALE

## ✅ TERMINÉ
- Transition landing → login
- Onboarding tutorial avec react-joyride
- Traduction 100% français
- PWA installable

## 🎯 TÂCHE PRIORITAIRE: SEO - TOP RÉFÉRENCEMENT GOOGLE

L'objectif est d'avoir le MEILLEUR référencement possible sur Google.

### 1. MÉTADONNÉES (src/app/layout.tsx et pages)
- Title optimisé avec mots-clés
- Meta description accrocheuse (150-160 caractères)
- Open Graph complet (og:title, og:description, og:image, og:url)
- Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image)
- Canonical URLs

### 2. STRUCTURED DATA (JSON-LD)
Ajouter dans src/components/seo/JsonLd.tsx:
- Organization schema
- WebApplication schema
- FAQ schema (pour la section FAQ)
- BreadcrumbList schema
- SoftwareApplication schema

### 3. FICHIERS SEO RACINE (public/)
- robots.txt optimisé
- sitemap.xml dynamique
- manifest.json complet

### 4. PERFORMANCE SEO
- Images avec alt text descriptif
- Lazy loading des images
- Preconnect/Preload pour ressources critiques
- Core Web Vitals optimisés

### 5. CONTENU SEO
- H1/H2/H3 hiérarchie correcte
- Mots-clés: "charge mentale parentale", "organisation famille", "tâches familiales", "application parents"
- URLs propres et descriptives

### 6. ACCESSIBILITÉ (aide le SEO)
- aria-labels sur les boutons/liens
- Skip to content link
- Focus visible

### FICHIERS À CRÉER/MODIFIER:
- src/app/layout.tsx (metadata)
- src/app/page.tsx (metadata spécifique)
- src/components/seo/JsonLd.tsx
- src/app/sitemap.ts (Next.js sitemap)
- src/app/robots.ts (Next.js robots)
- public/manifest.json

### COMMIT
```bash
git add -A
git commit -m "feat(seo): implement comprehensive SEO optimization for top Google ranking"
git push
```

## OBJECTIF LIGHTHOUSE SEO: 100/100
