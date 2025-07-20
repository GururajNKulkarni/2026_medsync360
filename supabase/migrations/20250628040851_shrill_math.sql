/*
  # Fix research tables and add full-text search capabilities

  1. Changes
    - Check if unique constraints already exist before adding them
    - Recreate full-text search indexes with proper configuration
    - Ensure all operations are idempotent to prevent errors on reapplication

  2. Improvements
    - Better full-text search capabilities for research content
    - Optimized index configuration for performance
*/

-- Add unique constraints to research tables (only if they don't exist)
DO $$
BEGIN
  -- Add unique constraint for research_news title
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_news_title_key' AND conrelid = 'research_news'::regclass
  ) THEN
    ALTER TABLE research_news ADD CONSTRAINT research_news_title_key UNIQUE (title);
  END IF;

  -- Add unique constraint for research_drugs name
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_drugs_name_key' AND conrelid = 'research_drugs'::regclass
  ) THEN
    ALTER TABLE research_drugs ADD CONSTRAINT research_drugs_name_key UNIQUE (name);
  END IF;

  -- Add unique constraint for research_cases title
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_cases_title_key' AND conrelid = 'research_cases'::regclass
  ) THEN
    ALTER TABLE research_cases ADD CONSTRAINT research_cases_title_key UNIQUE (title);
  END IF;
END $$;

-- Recreate full-text search indexes with proper configuration
DROP INDEX IF EXISTS idx_research_news_fts;
DROP INDEX IF EXISTS idx_research_drugs_fts;
DROP INDEX IF EXISTS idx_research_cases_fts;

CREATE INDEX idx_research_news_fts ON research_news 
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || source || ' ' || category));

CREATE INDEX idx_research_drugs_fts ON research_drugs 
  USING gin(to_tsvector('english', name || ' ' || description || ' ' || company || ' ' || indication));

CREATE INDEX idx_research_cases_fts ON research_cases 
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || specialty));