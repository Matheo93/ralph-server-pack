# MASTER PROMPT - FamilyLoad Features

## FEATURES À IMPLÉMENTER

### FEATURE 1: CALENDRIER FAMILIAL
- Route: /calendar dans (dashboard)
- Vue mois + semaine switchable
- Table: calendar_events
- Server actions: getEvents, createEvent, updateEvent, deleteEvent
- Composants: CalendarView, CalendarHeader, EventCard, EventFormDialog
- Ajouter dans sidebar entre Tâches et Charge mentale

### FEATURE 2: LISTE DE COURSES
- Route: /shopping dans (dashboard)  
- 13 catégories avec emojis
- Tables: shopping_lists, shopping_items, shopping_history
- Server actions: getActiveList, addItem, toggleItem, deleteItem, clearChecked
- Composants: ShoppingListView, ShoppingItem, AddItemForm, CategorySection
- Ajouter dans sidebar après Calendrier

### FEATURE 3: INTERFACE KIDS GAMIFICATION
- Route group séparé: (kids)
- Routes: /kids, /kids/[childId]/login, /kids/[childId]/dashboard, /kids/[childId]/badges, /kids/[childId]/shop
- Auth par PIN 4 chiffres (pas Cognito)
- Tables: child_accounts, xp_levels, badges, child_badges, xp_transactions, task_proofs, rewards, reward_redemptions
- Server actions: verifyPin, createSession, getMyTasks, completeTask, getStats, getBadges, getRewards, redeemReward
- Composants kids: ProfileSelector, PinLoginForm, KidsDashboard, TaskCard, XpGainAnimation, BadgeCard, RewardCard, StreakFlame
- Settings parent: /settings/kids pour valider preuves et récompenses
- Animations Framer Motion style Duolingo

## RÈGLES
- TypeScript strict, ZERO any
- Zod pour validation
- Server Components par défaut
- bun pas npm
- Commit après chaque feature majeure

## BRIEF DÉTAILLÉ
Voir /tmp/RALPH_FEATURES_BRIEF.md pour les specs SQL complètes
