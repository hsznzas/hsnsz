-- The Super To Do List - ADHD-Optimized Database Schema
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
CREATE TYPE task_category AS ENUM ('Sinjab', 'Ajdel', 'Personal', 'Haseeb', 'Raqeeb', 'Voice Input', 'Today', 'Streaks');

-- Tasks table (using BIGINT id to support Date.now() timestamps)
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY,
    text TEXT NOT NULL,
    category task_category NOT NULL DEFAULT 'Personal',
    priority task_priority NOT NULL DEFAULT 'Medium',
    duration TEXT NOT NULL DEFAULT 'Unknown',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    pinned_to_today BOOLEAN NOT NULL DEFAULT FALSE,
    is_streak BOOLEAN NOT NULL DEFAULT FALSE,
    streak_current INTEGER DEFAULT 0,
    streak_target INTEGER DEFAULT 30,
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
    duration_seconds INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_pinned_to_today ON tasks(pinned_to_today);
CREATE INDEX idx_tasks_is_streak ON tasks(is_streak);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
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

-- Function to handle streak completion
CREATE OR REPLACE FUNCTION handle_streak_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- If task is a streak and being completed
    IF NEW.is_streak = TRUE AND NEW.completed = TRUE AND OLD.completed = FALSE THEN
        -- Check if already completed today
        IF OLD.completed_at IS NOT NULL AND 
           DATE(OLD.completed_at) = CURRENT_DATE THEN
            -- Already completed today, don't increment
            RETURN NEW;
        END IF;
        
        -- Increment streak
        NEW.streak_current := COALESCE(OLD.streak_current, 0) + 1;
        NEW.completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for streak handling
CREATE TRIGGER handle_task_streak
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.is_streak = TRUE)
    EXECUTE FUNCTION handle_streak_completion();

-- Function to reset daily streaks (run via cron or scheduled function)
CREATE OR REPLACE FUNCTION reset_daily_streaks()
RETURNS void AS $$
BEGIN
    -- Reset completed status for streak tasks that were completed yesterday or earlier
    UPDATE tasks 
    SET completed = FALSE
    WHERE is_streak = TRUE 
      AND completed = TRUE
      AND completed_at IS NOT NULL
      AND DATE(completed_at) < CURRENT_DATE;
    
    -- Reset streak count for tasks not completed yesterday (broken streak)
    UPDATE tasks 
    SET streak_current = 0
    WHERE is_streak = TRUE 
      AND completed = FALSE
      AND completed_at IS NOT NULL
      AND DATE(completed_at) < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

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

-- Comments for documentation
COMMENT ON TABLE tasks IS 'The Super To Do List - ADHD-optimized task management';
COMMENT ON COLUMN tasks.pinned_to_today IS 'Tasks pinned to Today view for hyper-focus';
COMMENT ON COLUMN tasks.is_streak IS 'Whether this is a daily streak task';
COMMENT ON COLUMN tasks.streak_current IS 'Current streak count in days';
COMMENT ON COLUMN tasks.streak_target IS 'Target streak goal in days';
COMMENT ON COLUMN tasks.completed_at IS 'When the task was completed (for archive)';
COMMENT ON COLUMN tasks.due_date IS 'Task due date for urgency calculation';
COMMENT ON COLUMN time_logs.duration_seconds IS 'Total duration in seconds (calculated on stop)';
