# FamilyLoad - Architecture Technique

## Vue d'ensemble

FamilyLoad est une application SaaS de gestion de la charge mentale familiale. Elle permet aux familles de répartir équitablement les tâches domestiques et parentales entre les membres du foyer.

### Stack Technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Bun |
| Framework | Next.js 15 (App Router) |
| Base de données | PostgreSQL (AWS RDS) |
| Auth | AWS Cognito |
| Cache | Redis (ElastiCache) |
| Stockage | AWS S3 |
| Paiements | Stripe |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |
| Tests | Vitest + Playwright |

---

## Architecture des Dossiers

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes authentification (login, signup, callback)
│   ├── (dashboard)/       # Routes tableau de bord protégées
│   ├── (kids)/            # Interface enfants gamifiée
│   ├── (marketing)/       # Landing page, CGU, politique de confidentialité
│   └── api/               # Routes API
│       ├── v1/            # API REST v1
│       ├── v2/            # API REST v2 (pagination améliorée)
│       ├── billing/       # Stripe webhooks et portail
│       ├── vocal/         # Commandes vocales
│       └── ...
├── components/            # Composants React réutilisables
│   ├── ui/               # Composants shadcn/ui
│   └── ...
├── lib/                   # Logique métier et utilitaires
│   ├── aws/              # Schémas SQL et config AWS
│   ├── actions/          # Server Actions Next.js
│   └── ...
└── types/                 # Types TypeScript
```

---

## Schéma de Base de Données

### Diagramme Entité-Relation

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│     users       │───────│  household_members   │───────│   households    │
└─────────────────┘       └──────────────────────┘       └─────────────────┘
        │                          │                            │
        │                          │                            │
        ▼                          ▼                            ▼
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│  notifications  │       │       tasks          │◄──────│    children     │
└─────────────────┘       └──────────────────────┘       └─────────────────┘
                                   │                            │
                                   │                            │
                                   ▼                            ▼
                          ┌──────────────────────┐       ┌─────────────────┐
                          │    task_history      │       │ child_accounts  │
                          └──────────────────────┘       └─────────────────┘
```

---

## Tables Principales

### 1. Users (Utilisateurs)

Table des utilisateurs (parents et adultes).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    auth_provider TEXT DEFAULT 'cognito',      -- cognito, google, apple
    language TEXT DEFAULT 'fr',
    timezone TEXT DEFAULT 'Europe/Paris',
    role TEXT DEFAULT 'parent_principal',      -- parent_principal, co_parent, tiers
    avatar_url TEXT,
    device_tokens JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{"push": true, "email": true, "reminder_time": "08:00"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Households (Foyers)

Un foyer représente une famille ou un groupe de personnes partageant des responsabilités.

```sql
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT DEFAULT 'FR',
    timezone TEXT DEFAULT 'Europe/Paris',
    streak_current INT DEFAULT 0,              -- Série actuelle de jours sans retard
    streak_best INT DEFAULT 0,                 -- Meilleur streak
    streak_last_update DATE DEFAULT CURRENT_DATE,
    subscription_status TEXT DEFAULT 'trial',  -- trial, active, cancelled, expired
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Household Members (Membres du foyer)

Relation N:N entre users et households.

```sql
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,                     -- Cognito user ID
    role TEXT DEFAULT 'co_parent',             -- parent_principal, co_parent, tiers
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(household_id, user_id)
);
```

### 4. Children (Enfants)

Les enfants du foyer (pas des utilisateurs authentifiés).

```sql
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    birthdate DATE NOT NULL,
    gender TEXT,                               -- M, F, null
    school_name TEXT,
    school_level TEXT,                         -- maternelle, primaire, college, lycee
    school_class TEXT,                         -- PS, MS, GS, CP, CE1, etc.
    tags JSONB DEFAULT '[]',                   -- ["allergie_gluten", "PAP", etc.]
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Tasks (Tâches)

La table centrale de l'application.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    category_id UUID REFERENCES task_categories(id),
    template_id UUID REFERENCES task_templates(id),

    title TEXT NOT NULL,
    description TEXT,

    source TEXT NOT NULL,                      -- auto, vocal, manual
    vocal_transcript TEXT,
    vocal_audio_url TEXT,

    status TEXT DEFAULT 'pending',             -- pending, done, postponed, cancelled
    priority TEXT DEFAULT 'normal',            -- low, normal, high, critical

    deadline DATE,
    deadline_flexible BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE,
    postponed_to DATE,

    assigned_to UUID,                          -- Cognito user ID
    created_by UUID,                           -- Cognito user ID

    load_weight INT DEFAULT 3,                 -- Poids de charge mentale (1-10)
    is_critical BOOLEAN DEFAULT false,         -- Si true, casse le streak

    recurrence_rule JSONB,
    parent_task_id UUID REFERENCES tasks(id),

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. Task Categories (Catégories)

Catégories prédéfinies pour classifier les tâches.

```sql
CREATE TABLE task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,                 -- ecole, sante, admin, quotidien, social, activites, logistique
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INT DEFAULT 0
);
```

**Données initiales:**
| Code | Nom FR | Icône | Couleur |
|------|--------|-------|---------|
| ecole | École | 🏫 | #4CAF50 |
| sante | Santé | 🏥 | #F44336 |
| admin | Administratif | 📋 | #2196F3 |
| quotidien | Quotidien | 🏠 | #FF9800 |
| social | Social | 🎉 | #9C27B0 |
| activites | Activités | ⚽ | #00BCD4 |
| logistique | Logistique | 🚗 | #795548 |

---

## Tables de Gamification (Interface Enfants)

### 7. Child Accounts (Comptes enfants)

Comptes gamifiés pour les enfants avec PIN d'accès.

```sql
CREATE TABLE child_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    current_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id)
);
```

### 8. XP Levels (Niveaux)

Configuration des niveaux de progression.

```sql
CREATE TABLE xp_levels (
    level INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    xp_required INTEGER NOT NULL,
    icon VARCHAR(50)
);
```

**Niveaux:**
| Niveau | Nom | XP Requis | Icône |
|--------|-----|-----------|-------|
| 1 | Débutant | 0 | 🌱 |
| 2 | Apprenti | 100 | 🌿 |
| 3 | Assistant | 300 | 🌳 |
| 4 | Expert | 600 | ⭐ |
| 5 | Champion | 1000 | 🏆 |
| 6 | Super-Héros | 1500 | 🦸 |
| 7 | Légende | 2500 | 👑 |

### 9. Badges

Badges débloquables par les enfants.

```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    condition_type VARCHAR(50) NOT NULL,       -- tasks_completed, streak_days, level_reached, special
    condition_value INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. Rewards (Récompenses)

Récompenses créées par les parents que les enfants peuvent échanger contre des XP.

```sql
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    xp_cost INTEGER NOT NULL,
    reward_type VARCHAR(30) NOT NULL,          -- screen_time, money, privilege, custom
    icon VARCHAR(50) DEFAULT '🎁',
    screen_time_minutes INTEGER,
    money_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    max_redemptions_per_week INTEGER,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Tables de Fonctionnalités

### 11. Calendar Events (Événements calendrier)

Calendrier familial partagé.

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    recurrence VARCHAR(50),                    -- none, daily, weekly, monthly, yearly
    recurrence_end_date DATE,
    color VARCHAR(7) DEFAULT '#6366f1',
    assigned_to UUID REFERENCES users(id),
    child_id UUID REFERENCES children(id),
    event_type VARCHAR(50) DEFAULT 'general',  -- general, medical, school, activity, birthday, reminder
    location TEXT,
    reminder_minutes INTEGER DEFAULT 30,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12. Shopping Lists (Listes de courses)

```sql
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Liste principale',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50),                          -- kg, g, L, ml, piece, pack
    category VARCHAR(100) DEFAULT 'Autres',
    is_checked BOOLEAN DEFAULT false,
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMP WITH TIME ZONE,
    added_by UUID NOT NULL REFERENCES users(id),
    note TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 13. Challenges (Défis)

Système de défis/quêtes pour les enfants.

```sql
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    template_id UUID REFERENCES challenge_templates(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT '🎯',
    trigger_type VARCHAR(30) NOT NULL,         -- task_category, task_any, specific_task
    trigger_category_code VARCHAR(50),
    trigger_task_keyword VARCHAR(100),
    required_count INTEGER NOT NULL DEFAULT 1,
    timeframe_days INTEGER,
    reward_xp INTEGER NOT NULL DEFAULT 50,
    reward_badge_id UUID REFERENCES badges(id),
    reward_custom TEXT,
    child_ids UUID[] NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Tables de Support

### 14. Invitations

Invitations pour rejoindre un foyer.

```sql
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'co_parent',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 15. Notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,                        -- reminder, alert, streak, load_imbalance
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 16. Subscriptions (Abonnements)

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    status TEXT DEFAULT 'trial',               -- trial, active, past_due, cancelled
    plan TEXT DEFAULT 'monthly',               -- monthly, yearly
    amount INT,                                -- en centimes
    currency TEXT DEFAULT 'EUR',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 17. Streak History

Historique des séries (streaks) du foyer.

```sql
CREATE TABLE streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    streak_value INT NOT NULL,
    was_broken BOOLEAN DEFAULT false,
    joker_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, streak_date)
);
```

### 18. Streak Jokers

Jokers mensuels pour les abonnés premium (1 par mois).

```sql
CREATE TABLE streak_jokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    month INT NOT NULL,
    year INT NOT NULL,
    streak_value_saved INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, month, year)
);
```

### 19. Vocal Commands

Historique des commandes vocales.

```sql
CREATE TABLE vocal_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    parsed_action TEXT NOT NULL,
    parsed_child TEXT,
    parsed_date TIMESTAMPTZ,
    parsed_category TEXT NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending, success, corrected, cancelled
    correction_notes TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 20. Device Tokens

Tokens pour les notifications push.

```sql
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'web',               -- web, android, ios
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);
```

### 21. Web Push Subscriptions

Abonnements Web Push (VAPID).

```sql
CREATE TABLE web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 22. User Preferences

Préférences utilisateur pour les notifications.

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    daily_reminder_time TIME DEFAULT '08:00',
    weekly_summary_enabled BOOLEAN DEFAULT true,
    reminder_before_deadline_hours INT DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 23. Member Exclusions

Exclusions temporaires pour l'équilibrage de charge (voyage, maladie, etc.).

```sql
CREATE TABLE member_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    exclude_from TIMESTAMP WITH TIME ZONE NOT NULL,
    exclude_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,                      -- voyage, maladie, surcharge_travail, garde_alternee, autre
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT exclude_dates_valid CHECK (exclude_until > exclude_from)
);
```

---

## Tables Templates

### 24. Task Templates

Catalogue de templates de tâches automatiques par âge et période.

```sql
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country TEXT DEFAULT 'FR',
    category_id UUID REFERENCES task_categories(id),
    age_min INT,
    age_max INT,
    school_level TEXT,
    title_fr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    recurrence_rule JSONB,
    period_trigger TEXT,                       -- rentree, vacances_ete, janvier, etc.
    default_deadline_days INT DEFAULT 7,
    load_weight INT DEFAULT 3,
    is_critical BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 25. Challenge Templates

Templates de défis prédéfinis.

```sql
CREATE TABLE challenge_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT '🎯',
    trigger_type VARCHAR(30) NOT NULL,
    trigger_category_code VARCHAR(50),
    trigger_task_keyword VARCHAR(100),
    required_count INTEGER NOT NULL DEFAULT 1,
    timeframe_days INTEGER,
    reward_xp INTEGER NOT NULL DEFAULT 50,
    reward_badge_id UUID REFERENCES badges(id),
    difficulty VARCHAR(20) DEFAULT 'medium',
    age_min INTEGER,
    age_max INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Sécurité (RLS Policies)

Toutes les tables utilisent Row Level Security (RLS) avec les règles suivantes:

### Pattern Principal

```sql
-- L'utilisateur ne voit que ses propres données
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Les membres du foyer voient les données du foyer
CREATE POLICY "household_data_select" ON [table]
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );
```

### Tables Publiques (lecture seule)

- `task_categories` - Catégories de tâches
- `task_templates` - Templates de tâches (is_active = true)
- `xp_levels` - Niveaux XP
- `badges` - Badges disponibles
- `challenge_templates` - Templates de défis

---

## Index de Performance

```sql
-- Tasks
CREATE INDEX idx_tasks_household ON tasks(household_id);
CREATE INDEX idx_tasks_child ON tasks(child_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);

-- Children
CREATE INDEX idx_children_household ON children(household_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for)
    WHERE is_sent = false;

-- Calendar
CREATE INDEX idx_calendar_events_date_range ON calendar_events(household_id, start_date, end_date);

-- Shopping
CREATE INDEX idx_shopping_items_list ON shopping_items(list_id);
CREATE INDEX idx_shopping_items_checked ON shopping_items(list_id, is_checked);

-- Challenges
CREATE INDEX idx_challenges_active ON challenges(household_id, is_active)
    WHERE is_active = true;
CREATE INDEX idx_challenge_progress_active ON challenge_progress(child_id, is_completed)
    WHERE is_completed = false;
```

---

## Fonctions SQL Utilitaires

### Calcul d'âge

```sql
CREATE OR REPLACE FUNCTION calculate_age(birthdate DATE)
RETURNS INT AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birthdate));
END;
$$ LANGUAGE plpgsql;
```

### Mise à jour automatique de updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Niveau selon XP

```sql
CREATE OR REPLACE FUNCTION get_level_for_xp(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    result_level INTEGER;
BEGIN
    SELECT level INTO result_level
    FROM xp_levels
    WHERE xp_required <= xp
    ORDER BY level DESC
    LIMIT 1;
    RETURN COALESCE(result_level, 1);
END;
$$ LANGUAGE plpgsql;
```

### Vérification joker disponible

```sql
CREATE OR REPLACE FUNCTION can_use_joker(p_household_id UUID)
RETURNS BOOLEAN AS $$
-- Vérifie si le foyer est premium et n'a pas utilisé son joker ce mois
...
$$ LANGUAGE plpgsql STABLE;
```

---

## API Endpoints

### V1 API (Stable)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/tasks` | Liste des tâches |
| POST | `/api/v1/tasks` | Créer une tâche |
| GET | `/api/v1/tasks/:id` | Détail d'une tâche |
| PUT | `/api/v1/tasks/:id` | Modifier une tâche |
| DELETE | `/api/v1/tasks/:id` | Supprimer une tâche |
| GET | `/api/v1/children` | Liste des enfants |
| POST | `/api/v1/children` | Ajouter un enfant |
| GET | `/api/v1/household` | Infos du foyer |
| POST | `/api/v1/sync` | Sync mobile |

### V2 API (Améliorations)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v2/tasks` | Tâches avec pagination curseur |
| GET | `/api/v2/children` | Enfants avec stats |
| GET | `/api/v2/household` | Foyer avec membres |
| GET | `/api/v2/notifications` | Notifications paginées |

### Autres Endpoints

| Catégorie | Endpoints |
|-----------|-----------|
| Auth | `/api/(auth)/callback` |
| Billing | `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook` |
| Vocal | `/api/vocal/analyze`, `/api/vocal/transcribe`, `/api/vocal/create-task` |
| Streak | `/api/streak/status`, `/api/streak/validate` |
| Distribution | `/api/distribution/balance`, `/api/distribution/stats` |
| Notifications | `/api/notifications/push`, `/api/notifications/schedule` |
| Cron | `/api/cron/daily`, `/api/cron/generate-tasks` |

---

## Flux de Données

### Création d'une tâche vocale

```
1. Utilisateur -> /api/vocal/transcribe (audio)
2. Transcription -> /api/vocal/analyze (NLP)
3. Parsing -> { action, child, date, category }
4. Validation -> /api/vocal/create-task
5. Insertion -> tasks table
6. Notification -> /api/notifications/push
```

### Complétion d'une tâche par un enfant

```
1. Enfant complète tâche -> Server Action
2. Update tasks.status = 'done'
3. Trigger: update_challenge_progress_on_task_complete()
4. Si challenge complété:
   - Award XP
   - Award badge
5. Update child_accounts.current_xp
6. Check level up
7. Notification aux parents
```

### Équilibrage de charge

```
1. Cron /api/cron/daily
2. Pour chaque foyer:
   - Calcul load_snapshots
   - Détection déséquilibre (>20% différence)
   - Si déséquilibre: alert_history + notification
3. Suggestion réassignation tâches
```

---

## Conventions

### Nommage

- Tables: snake_case, pluriel (`users`, `tasks`, `children`)
- Colonnes: snake_case (`created_at`, `household_id`)
- Fonctions SQL: snake_case (`calculate_age`, `update_updated_at`)
- Index: `idx_[table]_[colonnes]` (`idx_tasks_household`)
- Policies: `[table]_[operation]` (`tasks_select`, `tasks_insert`)

### Types de données

- IDs: `UUID` avec `DEFAULT uuid_generate_v4()`
- Dates: `DATE` pour jours, `TIMESTAMP WITH TIME ZONE` pour instants
- JSON: `JSONB` pour données structurées
- Texte: `TEXT` (PostgreSQL gère efficacement)
- Monétaire: `DECIMAL(10,2)` ou centimes en `INT`

### Soft Delete vs Hard Delete

- `is_active BOOLEAN` pour soft delete (`children`, `shopping_lists`)
- `ON DELETE CASCADE` pour hard delete avec propagation
- `ON DELETE SET NULL` pour conserver l'historique (`tasks.child_id`)

---

*Document généré le 2026-01-18*
