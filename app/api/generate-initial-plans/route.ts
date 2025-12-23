import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Generate meal plan
    const mealPlanResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-meal-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, weeksDuration: 1 }),
    })

    if (!mealPlanResponse.ok) {
      throw new Error('Failed to generate meal plan')
    }

    const { mealPlan } = await mealPlanResponse.json()

    // Save meal plan
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: savedMealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        plan_name: mealPlan.plan_name,
        start_date: startDate,
        end_date: endDate,
        weeks_duration: 1,
        ai_recommendations: mealPlan.ai_recommendations,
        daily_calorie_target: profile.daily_calorie_target,
        is_active: true,
      })
      .select()
      .single()

    if (mealPlanError) throw mealPlanError

    // Save meals
    const mealsToInsert = mealPlan.days.flatMap((day: any) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: savedMealPlan.id,
        day_number: day.day_number,
        meal_type: meal.meal_type,
        meal_name: meal.meal_name,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        prep_time_minutes: meal.prep_time_minutes,
        cook_time_minutes: meal.cook_time_minutes,
      }))
    )

    const { error: mealsError } = await supabase.from('meals').insert(mealsToInsert)
    if (mealsError) throw mealsError

    // Generate workout plan
    const workoutPlanResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-workout-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, workoutsPerWeek: 3 }),
    })

    if (!workoutPlanResponse.ok) {
      throw new Error('Failed to generate workout plan')
    }

    const { workoutPlan } = await workoutPlanResponse.json()

    // Save workout plan
    const { data: savedWorkoutPlan, error: workoutPlanError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        plan_name: workoutPlan.plan_name,
        start_date: startDate,
        end_date: endDate,
        weeks_duration: 1,
        workouts_per_week: 3,
        ai_recommendations: workoutPlan.ai_recommendations,
        is_active: true,
      })
      .select()
      .single()

    if (workoutPlanError) throw workoutPlanError

    // Save workouts
    const workoutsToInsert = workoutPlan.workouts.map((workout: any) => ({
      workout_plan_id: savedWorkoutPlan.id,
      day_number: workout.day_number,
      workout_name: workout.workout_name,
      workout_type: workout.workout_type,
      exercises: workout.exercises,
    }))

    const { error: workoutsError } = await supabase.from('workouts').insert(workoutsToInsert)
    if (workoutsError) throw workoutsError

    return NextResponse.json({
      success: true,
      message: 'Plans generated successfully',
    })
  } catch (error: any) {
    console.error('Error generating plans:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate plans' },
      { status: 500 }
    )
  }
}
