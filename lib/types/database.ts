export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          height_cm: number | null
          starting_weight_kg: number | null
          current_weight_kg: number | null
          goal_weight_kg: number | null
          goal_type: 'lose_weight' | 'maintain_weight' | 'gain_muscle' | 'general_fitness' | null
          target_weekly_loss_kg: number | null
          activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active' | null
          dietary_restrictions: string[] | null
          food_dislikes: string[] | null
          cuisine_preferences: string[] | null
          meals_per_day: number | null
          fitness_level: 'beginner' | 'intermediate' | 'advanced' | null
          available_equipment: string[] | null
          workout_location: 'home' | 'gym' | 'outdoors' | 'mixed' | null
          injuries_limitations: string[] | null
          daily_calorie_target: number | null
          daily_protein_target_g: number | null
          daily_carbs_target_g: number | null
          daily_fat_target_g: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          height_cm?: number | null
          starting_weight_kg?: number | null
          current_weight_kg?: number | null
          goal_weight_kg?: number | null
          goal_type?: 'lose_weight' | 'maintain_weight' | 'gain_muscle' | 'general_fitness' | null
          target_weekly_loss_kg?: number | null
          activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active' | null
          dietary_restrictions?: string[] | null
          food_dislikes?: string[] | null
          cuisine_preferences?: string[] | null
          meals_per_day?: number | null
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null
          available_equipment?: string[] | null
          workout_location?: 'home' | 'gym' | 'outdoors' | 'mixed' | null
          injuries_limitations?: string[] | null
          daily_calorie_target?: number | null
          daily_protein_target_g?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          height_cm?: number | null
          starting_weight_kg?: number | null
          current_weight_kg?: number | null
          goal_weight_kg?: number | null
          goal_type?: 'lose_weight' | 'maintain_weight' | 'gain_muscle' | 'general_fitness' | null
          target_weekly_loss_kg?: number | null
          activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active' | null
          dietary_restrictions?: string[] | null
          food_dislikes?: string[] | null
          cuisine_preferences?: string[] | null
          meals_per_day?: number | null
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null
          available_equipment?: string[] | null
          workout_location?: 'home' | 'gym' | 'outdoors' | 'mixed' | null
          injuries_limitations?: string[] | null
          daily_calorie_target?: number | null
          daily_protein_target_g?: number | null
          daily_carbs_target_g?: number | null
          daily_fat_target_g?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      weight_logs: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          log_date: string
          log_time: string | null
          notes: string | null
          mood: 'great' | 'good' | 'okay' | 'struggling' | 'difficult' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight_kg: number
          log_date: string
          log_time?: string | null
          notes?: string | null
          mood?: 'great' | 'good' | 'okay' | 'struggling' | 'difficult' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight_kg?: number
          log_date?: string
          log_time?: string | null
          notes?: string | null
          mood?: 'great' | 'good' | 'okay' | 'struggling' | 'difficult' | null
          created_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          user_id: string
          plan_name: string
          start_date: string
          end_date: string
          weeks_duration: number | null
          generation_prompt: string | null
          ai_recommendations: string | null
          daily_calorie_target: number | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name: string
          start_date: string
          end_date: string
          weeks_duration?: number | null
          generation_prompt?: string | null
          ai_recommendations?: string | null
          daily_calorie_target?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_name?: string
          start_date?: string
          end_date?: string
          weeks_duration?: number | null
          generation_prompt?: string | null
          ai_recommendations?: string | null
          daily_calorie_target?: number | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      meals: {
        Row: {
          id: string
          meal_plan_id: string
          day_number: number
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          meal_name: string
          calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          ingredients: Json | null
          instructions: string[] | null
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meal_plan_id: string
          day_number: number
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          meal_name: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          ingredients?: Json | null
          instructions?: string[] | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meal_plan_id?: string
          day_number?: number
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          meal_name?: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          ingredients?: Json | null
          instructions?: string[] | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          plan_name: string
          start_date: string
          end_date: string
          weeks_duration: number | null
          workouts_per_week: number | null
          generation_prompt: string | null
          ai_recommendations: string | null
          focus_areas: string[] | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name: string
          start_date: string
          end_date: string
          weeks_duration?: number | null
          workouts_per_week?: number | null
          generation_prompt?: string | null
          ai_recommendations?: string | null
          focus_areas?: string[] | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_name?: string
          start_date?: string
          end_date?: string
          weeks_duration?: number | null
          workouts_per_week?: number | null
          generation_prompt?: string | null
          ai_recommendations?: string | null
          focus_areas?: string[] | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          workout_plan_id: string
          day_number: number
          workout_name: string
          workout_type: 'cardio' | 'strength' | 'flexibility' | 'mixed' | 'rest' | null
          estimated_duration_minutes: number | null
          estimated_calories_burned: number | null
          difficulty_level: 'easy' | 'moderate' | 'hard' | null
          exercises: Json | null
          warm_up: string | null
          cool_down: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_plan_id: string
          day_number: number
          workout_name: string
          workout_type?: 'cardio' | 'strength' | 'flexibility' | 'mixed' | 'rest' | null
          estimated_duration_minutes?: number | null
          estimated_calories_burned?: number | null
          difficulty_level?: 'easy' | 'moderate' | 'hard' | null
          exercises?: Json | null
          warm_up?: string | null
          cool_down?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_plan_id?: string
          day_number?: number
          workout_name?: string
          workout_type?: 'cardio' | 'strength' | 'flexibility' | 'mixed' | 'rest' | null
          estimated_duration_minutes?: number | null
          estimated_calories_burned?: number | null
          difficulty_level?: 'easy' | 'moderate' | 'hard' | null
          exercises?: Json | null
          warm_up?: string | null
          cool_down?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          log_time: string | null
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          meal_name: string
          calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          portion_size: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          log_time?: string | null
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          meal_name: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          portion_size?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          log_time?: string | null
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
          meal_name?: string
          calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          portion_size?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          workout_name: string
          duration_minutes: number | null
          calories_burned: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          workout_name: string
          duration_minutes?: number | null
          calories_burned?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          workout_name?: string
          duration_minutes?: number | null
          calories_burned?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      food_items: {
        Row: {
          id: string
          name: string
          category: 'food' | 'drink' | 'snack'
          brand: string | null
          serving_size: string
          serving_unit: string | null
          calories: number
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          sugar_g: number | null
          sodium_mg: number | null
          common_portions: Json | null
          created_by_user_id: string | null
          usage_count: number | null
          is_verified: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: 'food' | 'drink' | 'snack'
          brand?: string | null
          serving_size: string
          serving_unit?: string | null
          calories: number
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          sugar_g?: number | null
          sodium_mg?: number | null
          common_portions?: Json | null
          created_by_user_id?: string | null
          usage_count?: number | null
          is_verified?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: 'food' | 'drink' | 'snack'
          brand?: string | null
          serving_size?: string
          serving_unit?: string | null
          calories?: number
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          sugar_g?: number | null
          sodium_mg?: number | null
          common_portions?: Json | null
          created_by_user_id?: string | null
          usage_count?: number | null
          is_verified?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type WeightLog = Database['public']['Tables']['weight_logs']['Row']
export type MealPlan = Database['public']['Tables']['meal_plans']['Row']
export type Meal = Database['public']['Tables']['meals']['Row']
export type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type MealLog = Database['public']['Tables']['meal_logs']['Row']
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
export type FoodItem = Database['public']['Tables']['food_items']['Row']
