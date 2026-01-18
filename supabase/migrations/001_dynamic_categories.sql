-- Migration: Dynamic Categories
-- This allows the AI to create new project lists dynamically
-- Run this in your Supabase SQL Editor

-- 1. Create the categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT 'slate',
    icon TEXT DEFAULT 'folder',
    sort_order INTEGER DEFAULT 0,
    is_project BOOLEAN DEFAULT TRUE,  -- FALSE for system categories like 'Today', 'Streaks'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed with existing categories
INSERT INTO categories (name, color, icon, is_project, sort_order) VALUES
    ('Sinjab', 'purple', 'briefcase', TRUE, 1),
    ('Ajdel', 'blue', 'rocket', TRUE, 2),
    ('Personal', 'green', 'user', TRUE, 3),
    ('Haseeb', 'orange', 'code', TRUE, 4),
    ('Raqeeb', 'pink', 'target', TRUE, 5),
    ('Voice Input', 'indigo', 'mic', FALSE, 100),
    ('Today', 'amber', 'sun', FALSE, 101),
    ('Streaks', 'emerald', 'flame', FALSE, 102)
ON CONFLICT (name) DO NOTHING;

-- 3. Change tasks.category from ENUM to TEXT
-- First, we need to alter the column type
ALTER TABLE tasks 
    ALTER COLUMN category TYPE TEXT
    USING category::TEXT;

-- 4. Drop the old enum type (if it exists)
DROP TYPE IF EXISTS task_category CASCADE;

-- 5. Enable Row Level Security on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 6. Create policy to allow all operations on categories (for demo)
CREATE POLICY "Allow all categories operations"
    ON categories FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Enable realtime for categories
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_is_project ON categories(is_project);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Comments for documentation
COMMENT ON TABLE categories IS 'Dynamic project list categories - can be created via AI';
COMMENT ON COLUMN categories.is_project IS 'TRUE for user project lists, FALSE for system categories';
COMMENT ON COLUMN categories.sort_order IS 'Display order in the UI';
