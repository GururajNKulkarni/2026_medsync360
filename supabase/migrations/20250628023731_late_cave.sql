/*
  # Create research content tables for persistent storage

  1. New Tables
    - `research_news` - Stores medical news articles
    - `research_drugs` - Stores drug development information
    - `research_cases` - Stores medical case studies
    - `user_bookmarks` - Tracks user bookmarks and preferences
    - `content_categories` - Manages medical specialties and categories

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read content
    - Add policies for users to manage their bookmarks
*/

-- Create tables for research content
CREATE TABLE IF NOT EXISTS research_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  source text NOT NULL,
  published_at timestamptz NOT NULL,
  category text NOT NULL,
  read_time integer NOT NULL DEFAULT 5,
  url text,
  image_url text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  company text NOT NULL,
  phase text NOT NULL,
  indication text NOT NULL,
  published_at timestamptz NOT NULL,
  significance text NOT NULL CHECK (significance IN ('High', 'Medium', 'Low')),
  url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  specialty text NOT NULL,
  summary text NOT NULL,
  key_learnings text[] NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  read_time integer NOT NULL DEFAULT 10,
  published_at timestamptz NOT NULL,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('news', 'drug', 'case')),
  content_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

CREATE TABLE IF NOT EXISTS content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES content_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE research_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can read research news"
  ON research_news
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read research drugs"
  ON research_drugs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read research cases"
  ON research_cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read categories"
  ON content_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own bookmarks"
  ON user_bookmarks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_research_news_updated_at
  BEFORE UPDATE ON research_news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_drugs_updated_at
  BEFORE UPDATE ON research_drugs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_cases_updated_at
  BEFORE UPDATE ON research_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_research_news_category ON research_news(category);
CREATE INDEX idx_research_news_published_at ON research_news(published_at DESC);
CREATE INDEX idx_research_drugs_indication ON research_drugs(indication);
CREATE INDEX idx_research_drugs_significance ON research_drugs(significance);
CREATE INDEX idx_research_cases_specialty ON research_cases(specialty);
CREATE INDEX idx_research_cases_difficulty ON research_cases(difficulty);
CREATE INDEX idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_content ON user_bookmarks(content_type, content_id);

-- Create full-text search indexes
CREATE INDEX idx_research_news_fts ON research_news 
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || source || ' ' || category));

CREATE INDEX idx_research_drugs_fts ON research_drugs 
  USING gin(to_tsvector('english', name || ' ' || description || ' ' || company || ' ' || indication));

CREATE INDEX idx_research_cases_fts ON research_cases 
  USING gin(to_tsvector('english', title || ' ' || summary || ' ' || specialty));

-- Insert initial categories
INSERT INTO content_categories (name, description) VALUES
('Cardiology', 'Heart and cardiovascular system'),
('Neurology', 'Brain, spinal cord, and nervous system'),
('Oncology', 'Cancer and tumors'),
('Infectious Disease', 'Bacterial, viral, and fungal infections'),
('Endocrinology', 'Hormones and endocrine system'),
('Gastroenterology', 'Digestive system'),
('Pulmonology', 'Lungs and respiratory system'),
('Nephrology', 'Kidneys and renal system'),
('Rheumatology', 'Autoimmune and inflammatory conditions'),
('Dermatology', 'Skin conditions'),
('Ophthalmology', 'Eye diseases and vision'),
('Orthopedics', 'Bones, joints, and musculoskeletal system'),
('Psychiatry', 'Mental health and behavioral disorders'),
('Pediatrics', 'Child and adolescent health'),
('Emergency Medicine', 'Acute care and trauma')
ON CONFLICT (name) DO NOTHING;