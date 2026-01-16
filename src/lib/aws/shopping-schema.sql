-- ============================================================
-- FAMILYLOAD - SHOPPING LIST SCHEMA
-- Liste de courses partagee
-- ============================================================

-- === TABLE SHOPPING_LISTS ===
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Liste principale',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TABLE SHOPPING_ITEMS ===
CREATE TABLE IF NOT EXISTS shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50), -- kg, g, L, ml, piece, pack, etc.
    category VARCHAR(100) DEFAULT 'Autres', -- Fruits, Legumes, Viandes, etc.
    is_checked BOOLEAN DEFAULT false,
    checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_at TIMESTAMP WITH TIME ZONE,
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT, -- Note optionnelle (marque preferee, etc.)
    priority INTEGER DEFAULT 0, -- 0=normal, 1=urgent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === TABLE SHOPPING_HISTORY (pour suggestions) ===
CREATE TABLE IF NOT EXISTS shopping_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    frequency INTEGER DEFAULT 1, -- Nombre de fois achete
    last_purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- === INDEXES SHOPPING_LISTS ===
CREATE INDEX IF NOT EXISTS idx_shopping_lists_household ON shopping_lists(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_active ON shopping_lists(household_id, is_active);

-- === INDEXES SHOPPING_ITEMS ===
CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);
CREATE INDEX IF NOT EXISTS idx_shopping_items_checked ON shopping_items(list_id, is_checked);

-- === INDEXES SHOPPING_HISTORY ===
CREATE INDEX IF NOT EXISTS idx_shopping_history_household ON shopping_history(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_history_frequency ON shopping_history(household_id, frequency DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_history_unique ON shopping_history(household_id, LOWER(item_name));

-- === RLS POLICIES SHOPPING_LISTS ===
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_lists_select" ON shopping_lists;
CREATE POLICY "shopping_lists_select" ON shopping_lists FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_lists_insert" ON shopping_lists;
CREATE POLICY "shopping_lists_insert" ON shopping_lists FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_lists_update" ON shopping_lists;
CREATE POLICY "shopping_lists_update" ON shopping_lists FOR UPDATE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_lists_delete" ON shopping_lists;
CREATE POLICY "shopping_lists_delete" ON shopping_lists FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

-- === RLS POLICIES SHOPPING_ITEMS ===
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_items_select" ON shopping_items;
CREATE POLICY "shopping_items_select" ON shopping_items FOR SELECT
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

DROP POLICY IF EXISTS "shopping_items_insert" ON shopping_items;
CREATE POLICY "shopping_items_insert" ON shopping_items FOR INSERT
    WITH CHECK (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

DROP POLICY IF EXISTS "shopping_items_update" ON shopping_items;
CREATE POLICY "shopping_items_update" ON shopping_items FOR UPDATE
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

DROP POLICY IF EXISTS "shopping_items_delete" ON shopping_items;
CREATE POLICY "shopping_items_delete" ON shopping_items FOR DELETE
    USING (list_id IN (
        SELECT sl.id FROM shopping_lists sl
        INNER JOIN household_members hm ON sl.household_id = hm.household_id
        WHERE hm.user_id = auth.uid() AND hm.is_active = true
    ));

-- === RLS POLICIES SHOPPING_HISTORY ===
ALTER TABLE shopping_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_history_select" ON shopping_history;
CREATE POLICY "shopping_history_select" ON shopping_history FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_history_insert" ON shopping_history;
CREATE POLICY "shopping_history_insert" ON shopping_history FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_history_update" ON shopping_history;
CREATE POLICY "shopping_history_update" ON shopping_history FOR UPDATE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

DROP POLICY IF EXISTS "shopping_history_delete" ON shopping_history;
CREATE POLICY "shopping_history_delete" ON shopping_history FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid() AND is_active = true
    ));

-- === FUNCTION: Upsert shopping history ===
CREATE OR REPLACE FUNCTION upsert_shopping_history(
    p_household_id UUID,
    p_item_name VARCHAR(255),
    p_category VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO shopping_history (household_id, item_name, category, frequency, last_purchased_at)
    VALUES (p_household_id, p_item_name, p_category, 1, NOW())
    ON CONFLICT (household_id, LOWER(item_name))
    DO UPDATE SET
        frequency = shopping_history.frequency + 1,
        last_purchased_at = NOW(),
        category = COALESCE(p_category, shopping_history.category);
END;
$$ LANGUAGE plpgsql;

-- === FUNCTION: Get shopping suggestions ===
CREATE OR REPLACE FUNCTION get_shopping_suggestions(
    p_household_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    item_name VARCHAR(255),
    category VARCHAR(100),
    frequency INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.item_name,
        sh.category,
        sh.frequency
    FROM shopping_history sh
    WHERE sh.household_id = p_household_id
    ORDER BY sh.frequency DESC, sh.last_purchased_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- === TRIGGER: Update updated_at for shopping_lists ===
CREATE OR REPLACE FUNCTION update_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER trigger_shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_lists_updated_at();

-- === TRIGGER: Update updated_at for shopping_items ===
CREATE OR REPLACE FUNCTION update_shopping_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopping_items_updated_at ON shopping_items;
CREATE TRIGGER trigger_shopping_items_updated_at
    BEFORE UPDATE ON shopping_items
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_items_updated_at();

-- === CATEGORIES PREDEFINIES (pour reference) ===
-- Fruits et legumes
-- Viandes et poissons
-- Produits laitiers
-- Boulangerie
-- Epicerie salee
-- Epicerie sucree
-- Boissons
-- Surgeles
-- Hygiene et beaute
-- Entretien
-- Bebe
-- Animaux
-- Autres
