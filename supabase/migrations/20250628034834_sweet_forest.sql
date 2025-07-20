/*
  # Fix Research Content Tables Constraints

  1. Changes
    - Add unique constraints to research tables for proper upsert operations
    - Add title unique constraint to research_news
    - Add name unique constraint to research_drugs
    - Add title unique constraint to research_cases
    - Fix full-text search indexes for better performance

  2. Security
    - No changes to security policies
*/

-- Add unique constraints to research tables
ALTER TABLE research_news 
  ADD CONSTRAINT research_news_title_key UNIQUE (title);

ALTER TABLE research_drugs 
  ADD CONSTRAINT research_drugs_name_key UNIQUE (name);

ALTER TABLE research_cases 
  ADD CONSTRAINT research_cases_title_key UNIQUE (title);

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