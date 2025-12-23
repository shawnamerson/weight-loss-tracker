'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { MealPlan, Meal } from '@/lib/types/database'
import GeneratePlansButton from '@/components/GeneratePlansButton'
import ShoppingList from '@/components/ShoppingList'
import MealPlanCalendar from '@/components/MealPlanCalendar'

type MealWithDetails = Meal & {
  ingredients_parsed: { name: string; amount: string }[]
}

type GroupedMeals = {
  [dayNumber: number]: MealWithDetails[]
}

export default function MealsPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [meals, setMeals] = useState<GroupedMeals>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(1)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMealPlan()
  }, [])

  const fetchMealPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get active meal plan
      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (planError) throw planError
      setMealPlan(planData)

      // Get all meals for this plan
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('meal_plan_id', planData.id)
        .order('day_number', { ascending: true })
        .order('meal_type', { ascending: true })

      if (mealsError) throw mealsError

      // Group meals by day
      const grouped: GroupedMeals = {}
      mealsData.forEach((meal) => {
        if (!grouped[meal.day_number]) {
          grouped[meal.day_number] = []
        }
        grouped[meal.day_number].push({
          ...meal,
          ingredients_parsed: meal.ingredients as any || [],
        })
      })

      setMeals(grouped)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivatePlan = async () => {
    if (!mealPlan || !confirm('Are you sure you want to deactivate this meal plan?')) return

    try {
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('id', mealPlan.id)

      if (updateError) throw updateError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogMeal = async (meal: MealWithDetails) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })

      const { error: insertError } = await supabase
        .from('meal_logs')
        .insert({
          user_id: user.id,
          log_date: today,
          log_time: now,
          meal_type: meal.meal_type,
          meal_name: meal.meal_name,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          portion_size: '1 serving',
        })

      if (insertError) throw insertError

      setSuccessMessage(`${meal.meal_name} logged successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalDays = Object.keys(meals).length

  const getMealTypeOrder = (mealType: string) => {
    const order: { [key: string]: number } = {
      breakfast: 1,
      snack: 2,
      lunch: 3,
      dinner: 4,
    }
    return order[mealType] || 5
  }

  const getDayMeals = (dayNumber: number) => {
    return (meals[dayNumber] || []).sort((a, b) =>
      getMealTypeOrder(a.meal_type) - getMealTypeOrder(b.meal_type)
    )
  }

  const getDayTotals = (dayNumber: number) => {
    const dayMeals = meals[dayNumber] || []
    return {
      calories: dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: dayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0),
      carbs: dayMeals.reduce((sum, m) => sum + (m.carbs_g || 0), 0),
      fat: dayMeals.reduce((sum, m) => sum + (m.fat_g || 0), 0),
    }
  }

  const getDayMealsForCalendar = () => {
    if (!mealPlan) return []

    const startDate = new Date(mealPlan.start_date)
    return Object.keys(meals).map(dayNum => {
      const dayNumber = parseInt(dayNum)
      const dayDate = new Date(startDate)
      dayDate.setDate(dayDate.getDate() + (dayNumber - 1))
      const totals = getDayTotals(dayNumber)

      return {
        dayNumber,
        date: dayDate.toISOString().split('T')[0],
        mealCount: meals[dayNumber].length,
        totalCalories: totals.calories,
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!mealPlan) {
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
            <div className="text-4xl mb-4">🍽️</div>
            <p className="text-gray-500 text-lg mb-4">No active meal plan yet</p>
            <p className="text-sm text-gray-400 mb-6">Click below to generate your personalized meal and workout plans</p>
            <GeneratePlansButton />
            <p className="text-sm text-gray-400 mt-6">Plans are automatically refreshed every 7 days</p>
          </div>
        </div>
      </div>
    )
  }

  const dayTotals = getDayTotals(selectedDay)

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
                <h1 className="text-3xl font-bold mb-2">{mealPlan.plan_name}</h1>
                <p className="text-gray-600 mb-2">{mealPlan.ai_recommendations}</p>
                <p className="text-sm text-gray-500">
                  {mealPlan.start_date} to {mealPlan.end_date} ({mealPlan.weeks_duration} weeks)
                </p>
              </div>
              <button
                onClick={handleDeactivatePlan}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
              >
                Deactivate Plan
              </button>
            </div>

            {mealPlan.daily_calorie_target && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Daily Target:</span> {mealPlan.daily_calorie_target} calories
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <ShoppingList
                meals={Object.values(meals).flat()}
                planName={mealPlan.plan_name}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              {successMessage}
            </div>
          )}

          {/* Calendar and Meals Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <MealPlanCalendar
                dayMeals={getDayMealsForCalendar()}
                startDate={mealPlan.start_date}
                endDate={mealPlan.end_date}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
              />
            </div>

            {/* Selected Day Meals */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Day {selectedDay} Meals</h2>
                <div className="grid grid-cols-4 gap-3 bg-primary-50 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-primary-700">{dayTotals.calories}</p>
                    <p className="text-xs text-gray-600">Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{dayTotals.protein.toFixed(0)}g</p>
                    <p className="text-xs text-gray-600">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{dayTotals.carbs.toFixed(0)}g</p>
                    <p className="text-xs text-gray-600">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-orange-600">{dayTotals.fat.toFixed(0)}g</p>
                    <p className="text-xs text-gray-600">Fat</p>
                  </div>
                </div>
              </div>

              {/* Meals */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getDayMeals(selectedDay).map((meal) => (
              <div key={meal.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold uppercase mb-2">
                        {meal.meal_type}
                      </span>
                      <h3 className="text-xl font-bold">{meal.meal_name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLogMeal(meal)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                      >
                        Log Meal
                      </button>
                      <button
                        onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                        className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                      >
                        {expandedMeal === meal.id ? 'Hide' : 'View'}
                      </button>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{meal.calories || 0}</p>
                      <p className="text-xs text-gray-600">cal</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{meal.protein_g || 0}g</p>
                      <p className="text-xs text-gray-600">protein</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{meal.carbs_g || 0}g</p>
                      <p className="text-xs text-gray-600">carbs</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{meal.fat_g || 0}g</p>
                      <p className="text-xs text-gray-600">fat</p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Prep: {meal.prep_time_minutes || 0} min</span>
                    <span>Cook: {meal.cook_time_minutes || 0} min</span>
                  </div>

                  {/* Expanded details */}
                  {expandedMeal === meal.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Ingredients */}
                        <div>
                          <h4 className="font-semibold mb-3">Ingredients</h4>
                          <ul className="space-y-2">
                            {meal.ingredients_parsed.map((ingredient, idx) => (
                              <li key={idx} className="flex justify-between text-sm">
                                <span>{ingredient.name}</span>
                                <span className="text-gray-600">{ingredient.amount}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Instructions */}
                        <div>
                          <h4 className="font-semibold mb-3">Instructions</h4>
                          <ol className="space-y-2 list-decimal list-inside">
                            {(meal.instructions || []).map((instruction, idx) => (
                              <li key={idx} className="text-sm text-gray-700">
                                {instruction}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      {meal.notes && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-900">
                            <span className="font-semibold">Note:</span> {meal.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {getDayMeals(selectedDay).length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500">No meals for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
      </div>
    </div>
  )
}
