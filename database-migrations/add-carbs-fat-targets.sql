-- Add daily carbs and fat target columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS daily_carbs_target_g DECIMAL,
ADD COLUMN IF NOT EXISTS daily_fat_target_g DECIMAL;

-- Add comments to describe the columns
COMMENT ON COLUMN user_profiles.daily_carbs_target_g IS 'Daily carbohydrates target in grams';
COMMENT ON COLUMN user_profiles.daily_fat_target_g IS 'Daily fat target in grams';
