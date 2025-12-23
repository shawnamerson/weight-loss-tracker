'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { WorkoutPlan, Workout } from '@/lib/types/database'
import GeneratePlansButton from '@/components/GeneratePlansButton'

type Exercise = {
  exercise_name: string
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds: number
  instructions: string[]
  target_muscles: string[]
}

type WorkoutWithExercises = Workout & {
  exercises_parsed: Exercise[]
}

type GroupedWorkouts = {
  [dayNumber: number]: WorkoutWithExercises[]
}

export default function WorkoutsPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [workouts, setWorkouts] = useState<GroupedWorkouts>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(1)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchWorkoutPlan()
  }, [])

  const fetchWorkoutPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get active workout plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (planError) throw planError
      setWorkoutPlan(planData)

      // Get all workouts for this plan
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('workout_plan_id', planData.id)
        .order('day_number', { ascending: true })

      if (workoutsError) throw workoutsError

      // Group workouts by day
      const grouped: GroupedWorkouts = {}
      workoutsData.forEach((workout) => {
        if (!grouped[workout.day_number]) {
          grouped[workout.day_number] = []
        }
        grouped[workout.day_number].push({
          ...workout,
          exercises_parsed: (workout.exercises as any) || [],
        })
      })

      setWorkouts(grouped)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivatePlan = async () => {
    if (!workoutPlan || !confirm('Are you sure you want to deactivate this workout plan?')) return

    try {
      const { error: updateError } = await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('id', workoutPlan.id)

      if (updateError) throw updateError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalDays = Object.keys(workouts).length

  const getDayWorkouts = (dayNumber: number) => {
    return workouts[dayNumber] || []
  }

  const getWorkoutTypeColor = (type: string | null) => {
    switch (type) {
      case 'cardio':
        return 'bg-red-100 text-red-800'
      case 'strength':
        return 'bg-blue-100 text-blue-800'
      case 'flexibility':
        return 'bg-green-100 text-green-800'
      case 'hiit':
        return 'bg-purple-100 text-purple-800'
      case 'mixed':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!workoutPlan) {
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
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-4xl mb-4">💪</div>
            <p className="text-gray-500 text-lg mb-4">No active workout plan yet</p>
            <p className="text-sm text-gray-400 mb-6">Click below to generate your personalized meal and workout plans</p>
            <GeneratePlansButton />
            <p className="text-sm text-gray-400 mt-6">Plans are automatically refreshed every 7 days</p>
          </div>
        </div>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{workoutPlan.plan_name}</h1>
                <p className="text-gray-600 mb-2">{workoutPlan.ai_recommendations}</p>
                <p className="text-sm text-gray-500">
                  {workoutPlan.start_date} to {workoutPlan.end_date}
                </p>
              </div>
              <button
                onClick={handleDeactivatePlan}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
              >
                Deactivate Plan
              </button>
            </div>

            {workoutPlan.workouts_per_week && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Workouts per week:</span> {workoutPlan.workouts_per_week}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Day selector */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="font-semibold mb-4">Select Day</h2>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    selectedDay === day
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Workouts */}
          <div className="space-y-4">
            {getDayWorkouts(selectedDay).map((workout) => (
              <div key={workout.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase mb-2 ${getWorkoutTypeColor(workout.workout_type)}`}>
                        {workout.workout_type || 'workout'}
                      </span>
                      <h3 className="text-xl font-bold">{workout.workout_name}</h3>
                    </div>
                    <button
                      onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                      className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                    >
                      {expandedWorkout === workout.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {/* Workout overview */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {workout.estimated_duration_minutes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-lg font-bold">{workout.estimated_duration_minutes} min</p>
                        <p className="text-xs text-gray-600">Duration</p>
                      </div>
                    )}
                    {workout.estimated_calories_burned && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-lg font-bold">{workout.estimated_calories_burned} cal</p>
                        <p className="text-xs text-gray-600">Est. Burned</p>
                      </div>
                    )}
                  </div>

                  {workout.difficulty_level && (
                    <div className="text-sm text-gray-600 mb-4">
                      Difficulty: <span className="font-semibold capitalize">{workout.difficulty_level}</span>
                    </div>
                  )}

                  {/* Expanded details */}
                  {expandedWorkout === workout.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {workout.warm_up && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-semibold mb-2">Warm Up</h4>
                          <p className="text-sm text-gray-700">{workout.warm_up}</p>
                        </div>
                      )}

                      {/* Exercises */}
                      <div className="space-y-4 mb-6">
                        <h4 className="font-semibold">Exercises</h4>
                        {workout.exercises_parsed.map((exercise, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4">
                            <h5 className="font-semibold mb-3">{exercise.exercise_name}</h5>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              {exercise.sets && (
                                <div className="bg-blue-50 rounded p-2 text-center">
                                  <p className="font-bold text-blue-900">{exercise.sets}</p>
                                  <p className="text-xs text-blue-700">Sets</p>
                                </div>
                              )}
                              {exercise.reps && (
                                <div className="bg-green-50 rounded p-2 text-center">
                                  <p className="font-bold text-green-900">{exercise.reps}</p>
                                  <p className="text-xs text-green-700">Reps</p>
                                </div>
                              )}
                              {exercise.duration_seconds && (
                                <div className="bg-purple-50 rounded p-2 text-center">
                                  <p className="font-bold text-purple-900">{exercise.duration_seconds}s</p>
                                  <p className="text-xs text-purple-700">Duration</p>
                                </div>
                              )}
                              {exercise.rest_seconds && (
                                <div className="bg-gray-50 rounded p-2 text-center">
                                  <p className="font-bold text-gray-900">{exercise.rest_seconds}s</p>
                                  <p className="text-xs text-gray-700">Rest</p>
                                </div>
                              )}
                            </div>

                            {exercise.target_muscles && exercise.target_muscles.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 mb-1">Target Muscles:</p>
                                <div className="flex flex-wrap gap-1">
                                  {exercise.target_muscles.map((muscle, i) => (
                                    <span key={i} className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs capitalize">
                                      {muscle}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {exercise.instructions && exercise.instructions.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Instructions:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  {exercise.instructions.map((instruction, i) => (
                                    <li key={i} className="text-sm text-gray-700">{instruction}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {workout.cool_down && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold mb-2">Cool Down</h4>
                          <p className="text-sm text-gray-700">{workout.cool_down}</p>
                        </div>
                      )}

                      {workout.notes && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-900">
                            <span className="font-semibold">Note:</span> {workout.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {getDayWorkouts(selectedDay).length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500">No workouts for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
