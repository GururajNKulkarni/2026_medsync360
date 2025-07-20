/*
  # Create users table for medical staff management

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - User ID from Supabase Auth
      - `email` (text, unique, not null) - User email address
      - `full_name` (text, not null) - Full name of the medical staff
      - `role` (enum) - Medical role: PG, Senior Resident, House, Consultant
      - `department` (text, not null) - Medical department
      - `kmc_number` (text, nullable) - Karnataka Medical Council number
      - `aadhar_number` (text, nullable) - Aadhar identification number
      - `phone` (text, nullable) - Contact phone number
      - `avatar_url` (text, nullable) - Profile picture URL
      - `is_active` (boolean, default true) - Account status
      - `created_at` (timestamptz, default now()) - Record creation time
      - `updated_at` (timestamptz, default now()) - Last update time

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to read other users' basic info
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('PG', 'Senior Resident', 'House', 'Consultant');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'PG',
  department text NOT NULL DEFAULT '',
  kmc_number text,
  aadhar_number text,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read other users basic info"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();