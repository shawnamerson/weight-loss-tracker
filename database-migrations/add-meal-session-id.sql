-- Migration: Add meal_session_id to meal_logs table
-- This allows grouping multiple food items into a single meal

-- Add meal_session_id column to meal_logs table
ALTER TABLE meal_logs
ADD COLUMN IF NOT EXISTS meal_session_id UUID;

-- Create an index for faster queries on meal_session_id
CREATE INDEX IF NOT EXISTS idx_meal_logs_session_id ON meal_logs(meal_session_id);

-- Add comment to explain the column
COMMENT ON COLUMN meal_logs.meal_session_id IS 'Groups multiple food items logged together as a single meal';
