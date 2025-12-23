'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NutritionData {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface DailySummaryProps {
  refreshTrigger?: number
}

export default function DailyNutritionSummary({ refreshTrigger }: DailySummaryProps) {
  const [consumed, setConsumed] = useState<NutritionData>({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  })
  const [dailyGoal, setDailyGoal] = useState<number>(2000)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDailyData()
  }, [refreshTrigger])

  const fetchDailyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check for active meal plan first (takes precedence over profile target)
      const { data: activeMealPlan } = await supabase
        .from('meal_plans')
        .select('daily_calorie_target')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      // Get user's daily calorie target from profile as fallback
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target')
        .eq('id', user.id)
        .single()

      // Use meal plan calorie target if available, otherwise use profile target
      const calorieTarget = activeMealPlan?.daily_calorie_target || profile?.daily_calorie_target
      if (calorieTarget) {
        setDailyGoal(calorieTarget)
      }

      // Get today's meal logs
      const today = new Date().toISOString().split('T')[0]
      const { data: meals } = await supabase
        .from('meal_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .eq('log_date', today)

      if (meals && meals.length > 0) {
        const totals = meals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein_g: acc.protein_g + (meal.protein_g || 0),
            carbs_g: acc.carbs_g + (meal.carbs_g || 0),
            fat_g: acc.fat_g + (meal.fat_g || 0),
          }),
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        )
        setConsumed(totals)
      } else {
        setConsumed({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
      }
    } catch (error) {
      console.error('Error fetching daily data:', error)
    } finally {
      setLoading(false)
    }
  }

  const remaining = dailyGoal - consumed.calories
  const percentageConsumed = Math.min((consumed.calories / dailyGoal) * 100, 100)
  const isOverGoal = consumed.calories > dailyGoal

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        <h2 className="text-xl font-bold text-white mb-4">Today's Nutrition</h2>

        {/* Calorie Progress */}
        <div className="mb-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-4xl font-bold text-primary-400">
                {consumed.calories.toFixed(0)}
              </div>
              <div className="text-sm text-gray-400">of {dailyGoal} calories</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${isOverGoal ? 'text-red-400' : 'text-green-400'}`}>
                {isOverGoal ? '+' : ''}{Math.abs(remaining).toFixed(0)}
              </div>
              <div className="text-sm text-gray-400">
                {isOverGoal ? 'over goal' : 'remaining'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isOverGoal ? 'bg-red-500' : 'bg-primary-500'
              }`}
              style={{ width: `${percentageConsumed}%` }}
            ></div>
          </div>
        </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-red-600">
            {consumed.calories.toFixed(0)}
          </div>
          <div className="text-xs text-gray-600">Calories</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-600">
            {consumed.protein_g.toFixed(1)}g
          </div>
          <div className="text-xs text-gray-600">Protein</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-yellow-600">
            {consumed.carbs_g.toFixed(1)}g
          </div>
          <div className="text-xs text-gray-600">Carbs</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-600">
            {consumed.fat_g.toFixed(1)}g
          </div>
          <div className="text-xs text-gray-600">Fat</div>
        </div>
      </div>
      </div>
    </div>
  )
}
