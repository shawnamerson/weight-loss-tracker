# Database Migrations

This directory contains SQL migrations for the weight loss tracker app.

## Setup Instructions

### Step 1: Run Activity Logs Migration

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Open the file `add-activity-logs.sql` in this directory
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see two new tables:
     - `meal_logs`
     - `workout_logs`

### Step 2: Run Food Database Migration

1. **In the SQL Editor, create a new query**

2. **Run the Migration**
   - Open the file `add-food-database.sql` in this directory
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify Table Was Created**
   - Go to "Table Editor" in the left sidebar
   - You should see a new table:
     - `food_items`
   - The table should already have ~10 starter food items

### Step 3: Run Meal Session ID Migration

1. **In the SQL Editor, create a new query**

2. **Run the Migration**
   - Open the file `add-meal-session-id.sql` in this directory
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify Column Was Added**
   - Go to "Table Editor" in the left sidebar
   - Open the `meal_logs` table
   - You should see a new column: `meal_session_id`

## What This Migration Does

### Creates Tables
- **meal_logs**: Stores all meal entries logged by users
- **workout_logs**: Stores all workout entries logged by users
- **food_items**: Shared database of food/drink items with nutritional info

### Features
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see/edit their own logs
- ✅ Proper indexes for fast queries
- ✅ Foreign key relationships to users table
- ✅ **Multi-item meal logging**: Groups multiple food items into one meal via `meal_session_id`

### Fields in meal_logs
- Date and time of meal
- Meal type (breakfast, lunch, dinner, snack)
- Meal name
- Nutritional info (calories, protein, carbs, fat)
- Portion size
- Notes

### Fields in workout_logs
- Date and time of workout
- Workout name and type
- Duration and intensity
- Calories burned
- Exercise details (JSON)
- Notes

### Fields in food_items (Shared Database)
- Food/drink name
- Category (food, drink, snack)
- Brand (optional)
- Serving size and unit
- Complete nutritional info (calories, protein, carbs, fat, fiber, sugar, sodium)
- Common portion sizes (JSON array)
- Usage tracking
- Creator tracking

## After Running the Migrations

You can now use the "Log Activity" page in your dashboard to:
- **Log meals throughout the day** with autocomplete search
- **Add multiple items to a single meal** with running totals
- **Search existing foods/drinks** from shared database
- **Get AI nutritional info** for new items automatically
- **Track workouts and exercise**
- **View your daily nutrition and activity summary**

### Food Database Features

The food database is shared across all users and:
- ✅ Starts with 10 common food items
- ✅ Grows as users add new items
- ✅ Uses OpenAI to get accurate nutritional data
- ✅ Provides fuzzy search with autocomplete
- ✅ Tracks usage to show popular items first
- ✅ Supports foods, drinks, and snacks
- ✅ Includes common portion sizes for easy logging

### Multi-Item Meal Logging

The new meal session feature allows you to:
- ✅ **Add multiple food items to one meal** (e.g., coffee, toast, eggs for breakfast)
- ✅ **See running totals** of calories, protein, carbs, and fat as you add items
- ✅ **Remove items** before logging if you change your mind
- ✅ **Add notes** for the entire meal (not per item)
- ✅ **Log everything at once** with a shared `meal_session_id`

This makes meal logging more accurate since meals often contain multiple items!
