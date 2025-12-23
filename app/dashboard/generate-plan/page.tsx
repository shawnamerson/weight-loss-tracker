'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { UserProfile } from '@/lib/types/database'

type PlanType = 'meal' | 'workout'

type GeneratedMeal = {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  ingredients: { name: string; amount: string }[]
  instructions: string[]
  prep_time_minutes: number
  cook_time_minutes: number
}

type GeneratedDay = {
  day_number: number
  meals: GeneratedMeal[]
}

type GeneratedMealPlan = {
  plan_name: string
  ai_recommendations: string
  days: GeneratedDay[]
}

type GeneratedExercise = {
  exercise_name: string
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds: number
  instructions: string[]
  target_muscles: string[]
}

type GeneratedWorkout = {
  day_number: number
  workout_name: string
  workout_type: 'cardio' | 'strength' | 'flexibility' | 'hiit'
  duration_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  calories_burned_estimate: number
  exercises: GeneratedExercise[]
}

type GeneratedWorkoutPlan = {
  plan_name: string
  ai_recommendations: string
  workouts: GeneratedWorkout[]
}

export default function GeneratePlanPage() {
  const [planType, setPlanType] = useState<PlanType>('meal')
  const [weeksDuration, setWeeksDuration] = useState(1)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedMealPlan | null>(null)
  const [generatedWorkoutPlan, setGeneratedWorkoutPlan] = useState<GeneratedWorkoutPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError
      setProfile(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setFetchingProfile(false)
    }
  }

  const handleGenerate = async () => {
    if (!profile) return

    setLoading(true)
    setError('')
    setGeneratedPlan(null)
    setGeneratedWorkoutPlan(null)

    try {
      if (planType === 'meal') {
        const response = await fetch('/api/generate-meal-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile,
            weeksDuration,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate meal plan')
        }

        const data = await response.json()
        setGeneratedPlan(data.mealPlan)
      } else {
        // Generate workout plan
        const response = await fetch('/api/generate-workout-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile,
            weeksDuration,
            workoutsPerWeek,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate workout plan')
        }

        const data = await response.json()
        setGeneratedWorkoutPlan(data.workoutPlan)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlan = async () => {
    if (!generatedPlan || !profile) return

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate date range (7 days)
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      // Deactivate existing meal plans
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)

      // Insert meal plan
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          plan_name: generatedPlan.plan_name,
          start_date: startDate,
          end_date: endDate,
          weeks_duration: 1,
          ai_recommendations: generatedPlan.ai_recommendations,
          daily_calorie_target: profile.daily_calorie_target,
          is_active: true,
        })
        .select()
        .single()

      if (planError) throw planError

      // Insert all meals
      const mealsToInsert = generatedPlan.days.flatMap(day =>
        day.meals.map(meal => ({
          meal_plan_id: mealPlan.id,
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

      const { error: mealsError } = await supabase
        .from('meals')
        .insert(mealsToInsert)

      if (mealsError) throw mealsError

      // Redirect to meal plan view
      router.push('/dashboard/meals')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWorkoutPlan = async () => {
    if (!generatedWorkoutPlan || !profile) return

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate date range (7 days)
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      // Deactivate existing workout plans
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)

      // Insert workout plan
      const { data: workoutPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          plan_name: generatedWorkoutPlan.plan_name,
          start_date: startDate,
          end_date: endDate,
          weeks_duration: 1,
          workouts_per_week: workoutsPerWeek,
          ai_recommendations: generatedWorkoutPlan.ai_recommendations,
          is_active: true,
        })
        .select()
        .single()

      if (planError) throw planError

      // Insert all workouts
      const workoutsToInsert = generatedWorkoutPlan.workouts.map(workout => ({
        workout_plan_id: workoutPlan.id,
        day_number: workout.day_number,
        workout_name: workout.workout_name,
        workout_type: workout.workout_type,
        exercises: workout.exercises,
      }))

      console.log('Saving workouts:', workoutsToInsert.map(w => ({ day: w.day_number, name: w.workout_name })))

      const { error: workoutsError } = await supabase
        .from('workouts')
        .insert(workoutsToInsert)

      if (workoutsError) throw workoutsError

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (fetchingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600 hover:text-primary-700">
            Weight Loss Tracker
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Generate AI Plan</h1>
            <p className="text-gray-600 mb-8">Create a personalized meal or workout plan with AI</p>

            {/* Plan Type Tabs */}
            <div className="flex gap-2 mb-8 border-b border-gray-200">
              <button
                onClick={() => setPlanType('meal')}
                className={`px-6 py-3 font-semibold transition border-b-2 ${
                  planType === 'meal'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Meal Plan
              </button>
              <button
                onClick={() => setPlanType('workout')}
                className={`px-6 py-3 font-semibold transition border-b-2 ${
                  planType === 'workout'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Workout Plan
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {planType === 'meal' && !generatedPlan && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Your Profile Summary</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>Daily Calorie Target: {profile?.daily_calorie_target || '--'} calories</p>
                    <p>Daily Protein Target: {profile?.daily_protein_target_g || '--'}g</p>
                    <p>Meals per Day: {profile?.meals_per_day || '--'}</p>
                    {profile?.dietary_restrictions && profile.dietary_restrictions.length > 0 && (
                      <p>Dietary Restrictions: {profile.dietary_restrictions.join(', ')}</p>
                    )}
                    {profile?.cuisine_preferences && profile.cuisine_preferences.length > 0 && (
                      <p>Cuisine Preferences: {profile.cuisine_preferences.join(', ')}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating with AI...' : 'Generate Meal Plan'}
                </button>
              </div>
            )}

            {planType === 'workout' && !generatedWorkoutPlan && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workouts Per Week
                  </label>
                  <select
                    value={workoutsPerWeek}
                    onChange={(e) => setWorkoutsPerWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={2}>2 workouts per week</option>
                    <option value={3}>3 workouts per week</option>
                    <option value={4}>4 workouts per week</option>
                    <option value={5}>5 workouts per week</option>
                    <option value={6}>6 workouts per week</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Your Profile Summary</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>Goal: {profile?.goal_type || 'Lose weight'}</p>
                    <p>Activity Level: {profile?.activity_level || 'Moderate'}</p>
                    <p>Fitness Level: {profile?.fitness_level || 'Beginner'}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Due to AI limitations, workout plans are limited to 3 workouts maximum. The plan will be customized to your fitness level and goals.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating with AI...' : 'Generate Workout Plan'}
                </button>
              </div>
            )}

            {generatedPlan && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{generatedPlan.plan_name}</h2>
                  <p className="text-gray-600">{generatedPlan.ai_recommendations}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold mb-4">Meal Plan Preview</h3>

                  {generatedPlan.days.slice(0, 7).map((day) => (
                    <div key={day.day_number} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                      <h4 className="font-semibold text-lg mb-3">Day {day.day_number}</h4>
                      <div className="space-y-3">
                        {day.meals.map((meal, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-xs font-medium text-gray-500 uppercase">{meal.meal_type}</span>
                                <h5 className="font-semibold">{meal.meal_name}</h5>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-semibold">{meal.calories} cal</p>
                                <p className="text-gray-600">{meal.protein_g}g protein</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Prep: {meal.prep_time_minutes}min | Cook: {meal.cook_time_minutes}min
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {generatedPlan.days.length > 7 && (
                    <p className="text-sm text-gray-500 text-center mt-4">
                      + {generatedPlan.days.length - 7} more days...
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setGeneratedPlan(null)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    Generate New Plan
                  </button>
                  <button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save & Activate Plan'}
                  </button>
                </div>
              </div>
            )}

            {generatedWorkoutPlan && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{generatedWorkoutPlan.plan_name}</h2>
                  <p className="text-gray-600">{generatedWorkoutPlan.ai_recommendations}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                  <h3 className="font-semibold mb-4">Workout Plan Preview</h3>

                  {generatedWorkoutPlan.workouts.map((workout) => (
                    <div key={workout.day_number} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                      <div className="mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{workout.workout_name}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full font-medium">
                                {workout.workout_type}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full font-medium">
                                {workout.difficulty}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold">{workout.duration_minutes} min</p>
                            <p className="text-gray-600">~{workout.calories_burned_estimate} cal</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {workout.exercises.map((exercise, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-semibold text-sm">{exercise.exercise_name}</h5>
                                <p className="text-xs text-gray-600 mt-1">
                                  {exercise.sets && exercise.reps
                                    ? `${exercise.sets} sets × ${exercise.reps} reps`
                                    : exercise.duration_seconds
                                    ? `${exercise.duration_seconds}s duration`
                                    : 'As prescribed'
                                  }
                                </p>
                                {exercise.target_muscles && exercise.target_muscles.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Targets: {exercise.target_muscles.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 ml-4">
                                Rest: {exercise.rest_seconds}s
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setGeneratedWorkoutPlan(null)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    Generate New Plan
                  </button>
                  <button
                    onClick={handleSaveWorkoutPlan}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save & Activate Plan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
