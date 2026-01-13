-- Hsnzas Command Center Database Schema
-- Run this in your Supabase SQL Editor
-- ⚠️ WARNING: This will drop existing tables!

-- Drop existing tables and types (in correct order due to foreign keys)
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS task_category CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better type safety
CREATE TYPE task_priority AS ENUM ('Critical', 'Quick Win', 'High', 'Medium', 'Low');
CREATE TYPE task_category AS ENUM ('Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb', 'Voice Input');

-- Tasks table (using BIGINT id to support Date.now() timestamps)
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY,
    text TEXT NOT NULL,
    category task_category NOT NULL DEFAULT 'Personal',
    priority task_priority NOT NULL DEFAULT 'Medium',
    duration TEXT NOT NULL DEFAULT 'Unknown',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Time logs table for tracking work sessions
CREATE TABLE time_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX idx_time_logs_start_at ON time_logs(start_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for demo - adjust for production)
CREATE POLICY "Allow all tasks operations"
    ON tasks FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all time_logs operations"
    ON time_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
