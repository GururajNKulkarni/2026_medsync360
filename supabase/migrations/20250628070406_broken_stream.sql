/*
  # Fix research tables constraints for seeding

  1. Changes
    - Add unique constraints to research tables for the title and name columns (only if they don't exist)
    - This enables upsert operations with onConflict handling
    - Recreate full-text search indexes with proper configuration

  2. Purpose
    - Resolves the error "there is no unique or exclusion constraint matching the ON CONFLICT specification"
    - Enables proper seeding of research data
    - Improves search functionality
*/

-- Add unique constraint to research_news table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_news_title_key' AND conrelid = 'research_news'::regclass
  ) THEN
    ALTER TABLE research_news ADD CONSTRAINT research_news_title_key UNIQUE (title);
  END IF;
END $$;

-- Add unique constraint to research_drugs table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_drugs_name_key' AND conrelid = 'research_drugs'::regclass
  ) THEN
    ALTER TABLE research_drugs ADD CONSTRAINT research_drugs_name_key UNIQUE (name);
  END IF;
END $$;

-- Add unique constraint to research_cases table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'research_cases_title_key' AND conrelid = 'research_cases'::regclass
  ) THEN
    ALTER TABLE research_cases ADD CONSTRAINT research_cases_title_key UNIQUE (title);
  END IF;
END $$;

-- Recreate full-text search indexes with proper configuration
DROP INDEX IF EXISTS idx_research_news_fts;
CREATE INDEX idx_research_news_fts ON research_news
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || source || ' ' || category));

DROP INDEX IF EXISTS idx_research_drugs_fts;
CREATE INDEX idx_research_drugs_fts ON research_drugs
  USING gin(to_tsvector('english', name || ' ' || description || ' ' || company || ' ' || indication));

DROP INDEX IF EXISTS idx_research_cases_fts;
CREATE INDEX idx_research_cases_fts ON research_cases
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || specialty));