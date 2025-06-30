/*
  # Memory Jar Database Schema

  1. New Tables
    - `memories`
      - `id` (uuid, primary key)
      - `user_id` (text) - identifies the memory owner
      - `emotion` (text) - happy, sad, grateful, excited
      - `transcript` (text) - transcribed audio content
      - `audio_url` (text) - URL to stored audio file
      - `created_at` (timestamp)
      - `blockchain_tx` (text) - Algorand transaction hash
    
    - `stories`
      - `id` (uuid, primary key)
      - `user_id` (text) - story creator
      - `memory_ids` (text[]) - array of memory IDs used
      - `story_text` (text) - AI generated story content
      - `audio_url` (text) - URL to narrated story audio
      - `created_at` (timestamp)
    
    - `family_members`
      - `id` (uuid, primary key)
      - `user_id` (text) - family circle owner
      - `member_email` (text) - invited member email
      - `access_level` (text) - all, selected, none
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for family member access
*/

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  emotion text NOT NULL CHECK (emotion IN ('happy', 'sad', 'grateful', 'excited')),
  transcript text NOT NULL,
  audio_url text,
  created_at timestamptz DEFAULT now(),
  blockchain_tx text
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  memory_ids text[] NOT NULL DEFAULT '{}',
  story_text text NOT NULL,
  audio_url text,
  created_at timestamptz DEFAULT now()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  member_email text NOT NULL,
  access_level text NOT NULL DEFAULT 'selected' CHECK (access_level IN ('all', 'selected', 'none')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, member_email)
);

-- Enable Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policies for memories table
CREATE POLICY "Users can read own memories"
  ON memories
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own memories"
  ON memories
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policies for stories table
CREATE POLICY "Users can read own stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own stories"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own stories"
  ON stories
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own stories"
  ON stories
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policies for family_members table
CREATE POLICY "Users can read own family members"
  ON family_members
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own family members"
  ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
CREATE INDEX IF NOT EXISTS memories_created_at_idx ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS stories_user_id_idx ON stories(user_id);
CREATE INDEX IF NOT EXISTS family_members_user_id_idx ON family_members(user_id);
CREATE INDEX IF NOT EXISTS family_members_email_idx ON family_members(member_email);