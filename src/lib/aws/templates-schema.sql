-- =============================================
-- TASK TEMPLATES SCHEMA - FamilyLoad
-- Catalogue automatique de tâches par âge/période
-- =============================================

-- Table: task_templates
-- Templates de tâches applicables selon âge et période
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Localisation
    country VARCHAR(2) NOT NULL DEFAULT 'FR',

    -- Critères d'application
    age_min INTEGER NOT NULL DEFAULT 0,
    age_max INTEGER NOT NULL DEFAULT 18,

    -- Classification
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),

    -- Contenu
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- Récurrence (cron-like: "0 0 1 9 *" = 1er septembre)
    -- Format: minute hour day month weekday
    -- Ou patterns spéciaux: @yearly, @monthly, @weekly
    cron_rule VARCHAR(100),

    -- Charge mentale (poids)
    weight INTEGER NOT NULL DEFAULT 3,

    -- Jours avant deadline pour générer la tâche
    days_before_deadline INTEGER NOT NULL DEFAULT 7,

    -- Période de l'année (optionnel, pour filtres)
    period VARCHAR(50), -- 'rentree', 'noel', 'ete', 'printemps', etc.

    -- Statut
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT valid_age_range CHECK (age_min >= 0 AND age_max <= 25 AND age_min <= age_max),
    CONSTRAINT valid_weight CHECK (weight >= 1 AND weight <= 10)
);

-- Index pour recherche par critères
CREATE INDEX IF NOT EXISTS idx_templates_country ON task_templates(country);
CREATE INDEX IF NOT EXISTS idx_templates_age ON task_templates(age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_templates_category ON task_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_period ON task_templates(period);
CREATE INDEX IF NOT EXISTS idx_templates_active ON task_templates(is_active);

-- =============================================
-- GENERATED TASKS - Tâches générées depuis templates
-- =============================================

CREATE TABLE IF NOT EXISTS generated_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

    -- Tâche générée (copie vers tasks ou référence)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Métadonnées génération
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deadline DATE NOT NULL,

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),

    -- Pour éviter les doublons
    generation_key VARCHAR(200) NOT NULL,

    -- Contraintes
    CONSTRAINT valid_status CHECK (status IN ('pending', 'created', 'skipped', 'expired')),
    CONSTRAINT unique_generation UNIQUE (template_id, child_id, generation_key)
);

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_generated_template ON generated_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_child ON generated_tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_generated_household ON generated_tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_generated_status ON generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_deadline ON generated_tasks(deadline);

-- =============================================
-- HOUSEHOLD TEMPLATE SETTINGS
-- Permet de désactiver des templates par foyer
-- =============================================

CREATE TABLE IF NOT EXISTS household_template_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,

    -- Peut désactiver un template pour ce foyer
    is_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Personnalisations optionnelles
    custom_days_before INTEGER,
    custom_weight INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_household_template UNIQUE (household_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_household_template_settings ON household_template_settings(household_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- task_templates: lecture publique, écriture admin uniquement
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les templates actifs
CREATE POLICY "task_templates_select_public" ON task_templates
    FOR SELECT
    USING (is_active = true);

-- Seuls les admins peuvent insérer/modifier (via service role)
-- Pas de policy INSERT/UPDATE/DELETE = interdit pour users normaux

-- generated_tasks: via household_members
ALTER TABLE generated_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_tasks_select" ON generated_tasks
    FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "generated_tasks_insert" ON generated_tasks
    FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "generated_tasks_update" ON generated_tasks
    FOR UPDATE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "generated_tasks_delete" ON generated_tasks
    FOR DELETE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

-- household_template_settings: via household_members
ALTER TABLE household_template_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_template_settings_select" ON household_template_settings
    FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "household_template_settings_insert" ON household_template_settings
    FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "household_template_settings_update" ON household_template_settings
    FOR UPDATE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "household_template_settings_delete" ON household_template_settings
    FOR DELETE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- TRIGGER: Updated_at automatique
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_templates_updated_at
    BEFORE UPDATE ON task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_template_settings_updated_at
    BEFORE UPDATE ON household_template_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE task_templates IS 'Catalogue de templates de tâches par âge et période';
COMMENT ON TABLE generated_tasks IS 'Tâches générées automatiquement depuis les templates';
COMMENT ON TABLE household_template_settings IS 'Personnalisation des templates par foyer';

COMMENT ON COLUMN task_templates.cron_rule IS 'Format cron: minute hour day month weekday, ou @yearly/@monthly/@weekly';
COMMENT ON COLUMN task_templates.weight IS 'Poids charge mentale de 1 (léger) à 10 (lourd)';
COMMENT ON COLUMN task_templates.days_before_deadline IS 'Nombre de jours avant la deadline pour générer la tâche';
COMMENT ON COLUMN generated_tasks.generation_key IS 'Clé unique pour éviter les doublons (ex: 2024-09 pour septembre 2024)';
