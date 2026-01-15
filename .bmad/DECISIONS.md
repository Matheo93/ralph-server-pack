# Decisions - FamilyLoad Sprint 1

## Architecture Choices

### 1. Next.js 15 with App Router
- **Choice**: App Router avec Server Components par défaut
- **Reason**: Performance optimale, moins de JavaScript côté client, meilleure SEO
- **Trade-off**: Courbe d'apprentissage plus élevée vs Pages Router

### 2. TypeScript Strict Mode
- **Choice**: `strict: true` + options supplémentaires (noUncheckedIndexedAccess, noImplicitOverride, etc.)
- **Reason**: Sécurité maximale du typage, détection d'erreurs à la compilation
- **Trade-off**: Plus verbose mais moins d'erreurs runtime

### 3. Zod v4 without Defaults
- **Choice**: Ne pas utiliser `.default()` dans les schemas Zod pour les formulaires
- **Reason**: Incompatibilité avec react-hook-form et zodResolver (types divergents input/output)
- **Solution**: Définir les valeurs par défaut dans `defaultValues` du formulaire

### 4. Server Actions
- **Choice**: Server Actions au lieu d'API Routes
- **Reason**: Code plus simple, moins de boilerplate, typage de bout en bout
- **Trade-off**: Moins de contrôle sur les responses HTTP

### 5. Soft Delete for Children
- **Choice**: `is_active = false` au lieu de DELETE
- **Reason**: Préserver l'historique des tâches liées à l'enfant
- **Trade-off**: Données "orphelines" dans la BDD

## UI/UX Choices

### 1. shadcn/ui
- **Choice**: shadcn/ui avec style "new-york"
- **Reason**: Composants accessibles, personnalisables, pas de dépendance package
- **Trade-off**: Plus de fichiers à gérer vs library externe

### 2. Responsive Layout
- **Choice**: Sidebar desktop + Sheet mobile
- **Reason**: UX optimale sur tous les écrans
- **Pattern**: `lg:hidden` / `hidden lg:flex`

### 3. French as Default Language
- **Choice**: Messages et labels en français
- **Reason**: Marché cible initial = France
- **Future**: i18n à implémenter pour internationalisation

## Security Choices

### 1. RLS Policies
- **Choice**: Row Level Security sur toutes les tables sensibles
- **Reason**: Isolation des données par foyer
- **Implementation**: Dans schema.sql, basé sur household_members

### 2. Password Validation
- **Choice**: Min 8 chars, 1 majuscule, 1 minuscule, 1 chiffre
- **Reason**: Sécurité standard sans être trop contraignant
- **Trade-off**: UX vs sécurité

### 3. Invitation Tokens
- **Choice**: Tokens crypto.randomBytes(32) avec expiration 7 jours
- **Reason**: Sécurité suffisante pour invitations
- **Trade-off**: Pas de rate limiting implémenté (à faire)

## What's Not Implemented (Intentionally)

1. **Tests automatisés** - Repoussés car Supabase non configuré
2. **Email sending** - TODO dans les actions, nécessite config SES/SMTP
3. **Tasks CRUD** - Phase 2 (après les fondations)
4. **Load calculation** - Phase 2
5. **Vocal transcription** - Phase 3
6. **Stripe integration** - Phase 4

---

*Last updated: Sprint 1 completion*
