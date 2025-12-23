-- Create food_items table (shared across all users)
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('food', 'drink', 'snack')) NOT NULL DEFAULT 'food',
  brand TEXT,
  serving_size TEXT NOT NULL,
  serving_unit TEXT, -- e.g., 'cup', 'oz', 'g', 'piece'
  calories INTEGER NOT NULL,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  fiber_g DECIMAL,
  sugar_g DECIMAL,
  sodium_mg INTEGER,
  common_portions JSONB, -- Array of common serving sizes like ["1 cup", "1 serving", "100g"]
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE, -- Admin can verify accurate entries
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for search and performance
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category);
CREATE INDEX IF NOT EXISTS idx_food_items_usage_count ON food_items(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm ON food_items USING gin(name gin_trgm_ops);

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to search food items
CREATE OR REPLACE FUNCTION search_food_items(search_term TEXT, item_category TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  brand TEXT,
  serving_size TEXT,
  calories INTEGER,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  usage_count INTEGER,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.category,
    f.brand,
    f.serving_size,
    f.calories,
    f.protein_g,
    f.carbs_g,
    f.fat_g,
    f.usage_count,
    similarity(f.name, search_term) as sim
  FROM food_items f
  WHERE
    (item_category IS NULL OR f.category = item_category)
    AND (
      f.name ILIKE '%' || search_term || '%'
      OR similarity(f.name, search_term) > 0.3
    )
  ORDER BY
    sim DESC,
    f.usage_count DESC,
    f.name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_food_item_usage(item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE food_items
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All users can read, only authenticated users can insert
CREATE POLICY "Anyone can view food items"
  ON food_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert food items"
  ON food_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own food items"
  ON food_items FOR UPDATE
  USING (created_by_user_id = auth.uid());

-- Add some common starter items
INSERT INTO food_items (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, common_portions, is_verified) VALUES
  ('Water', 'drink', '1 cup', 'cup', 0, 0, 0, 0, '["1 cup", "1 glass", "8 oz", "500ml"]', true),
  ('Coffee (black)', 'drink', '1 cup', 'cup', 2, 0.3, 0, 0, '["1 cup", "8 oz", "12 oz", "16 oz"]', true),
  ('Banana', 'food', '1 medium', 'piece', 105, 1.3, 27, 0.4, '["1 small", "1 medium", "1 large", "100g"]', true),
  ('Chicken Breast (grilled)', 'food', '4 oz', 'oz', 187, 35, 0, 4, '["3 oz", "4 oz", "6 oz", "100g"]', true),
  ('White Rice (cooked)', 'food', '1 cup', 'cup', 205, 4.3, 45, 0.4, '["1/2 cup", "1 cup", "1.5 cups", "100g"]', true),
  ('Eggs (large)', 'food', '1 large', 'piece', 72, 6.3, 0.4, 5, '["1 egg", "2 eggs", "3 eggs"]', true),
  ('Greek Yogurt (plain)', 'food', '1 cup', 'cup', 100, 17, 6, 0.7, '["1/2 cup", "1 cup", "6 oz"]', true),
  ('Almonds', 'snack', '1 oz', 'oz', 164, 6, 6, 14, '["1 oz", "handful", "23 nuts"]', true),
  ('Apple', 'food', '1 medium', 'piece', 95, 0.5, 25, 0.3, '["1 small", "1 medium", "1 large", "100g"]', true),
  ('Milk (2%)', 'drink', '1 cup', 'cup', 122, 8, 12, 5, '["1 cup", "8 oz", "12 oz", "16 oz"]', true)
ON CONFLICT DO NOTHING;
