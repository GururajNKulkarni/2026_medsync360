/*
  # Fix research tables constraints for seeding

  1. Changes
    - Add unique constraints to research tables for the title and name columns
    - This enables upsert operations with onConflict handling
    - Recreate full-text search indexes with proper configuration

  2. Purpose
    - Resolves the error "there is no unique or exclusion constraint matching the ON CONFLICT specification"
    - Enables proper seeding of research data
    - Improves search functionality
*/

-- Add unique constraint to research_news table
ALTER TABLE IF EXISTS research_news
  ADD CONSTRAINT research_news_title_key UNIQUE (title);

-- Add unique constraint to research_drugs table
ALTER TABLE IF EXISTS research_drugs
  ADD CONSTRAINT research_drugs_name_key UNIQUE (name);

-- Add unique constraint to research_cases table
ALTER TABLE IF EXISTS research_cases
  ADD CONSTRAINT research_cases_title_key UNIQUE (title);

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