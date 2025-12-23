-- Create meal_logs table
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  log_time TIME,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  calories INTEGER,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  portion_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  log_time TIME,
  workout_name TEXT NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('cardio', 'strength', 'flexibility', 'hiit', 'mixed')),
  duration_minutes INTEGER,
  calories_burned INTEGER,
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),
  notes TEXT,
  exercises JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, log_date DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meal_logs
CREATE POLICY "Users can view their own meal logs"
  ON meal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal logs"
  ON meal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs"
  ON meal_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal logs"
  ON meal_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for workout_logs
CREATE POLICY "Users can view their own workout logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
  ON workout_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);
