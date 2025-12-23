'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import MealCalendar from '@/components/MealCalendar'
import FoodSearchAutocomplete from '@/components/FoodSearchAutocomplete'
import type { FoodItem } from '@/lib/types/database'

interface MealLog {
  id: string
  meal_session_id: string | null
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
}

interface GroupedMeal {
  sessionId: string
  mealType: string
  date: string
  time: string | null
  items: MealLog[]
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

export default function MealHistoryPage() {
  const [meals, setMeals] = useState<MealLog[]>([])
  const [groupedMeals, setGroupedMeals] = useState<GroupedMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    meal_name: string
    calories: string
    protein_g: string
    carbs_g: string
    fat_g: string
    portion_size: string
  }>({
    meal_name: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    portion_size: '',
  })
  const [dailyCalories, setDailyCalories] = useState<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]>([])
  const [dailyTarget, setDailyTarget] = useState(2000)
  const [proteinTarget, setProteinTarget] = useState(150)
  const [carbsTarget, setCarbsTarget] = useState(200)
  const [fatTarget, setFatTarget] = useState(65)
  const [addingToSessionId, setAddingToSessionId] = useState<string | null>(null)
  const [newItemData, setNewItemData] = useState<{
    meal_name: string
    calories: string
    protein_g: string
    carbs_g: string
    fat_g: string
    portion_size: string
  }>({
    meal_name: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    portion_size: '',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchDailyTarget()
    fetchAllDailyCalories()
  }, [])

  useEffect(() => {
    fetchMeals()
  }, [selectedDate])

  const fetchDailyTarget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check for active meal plan first (takes precedence over profile targets)
      const { data: activeMealPlan } = await supabase
        .from('meal_plans')
        .select('daily_calorie_target')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      // Get profile targets as fallback
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target, daily_protein_target_g, daily_carbs_target_g, daily_fat_target_g')
        .eq('id', user.id)
        .single()

      // Use meal plan calorie target if available, otherwise use profile target
      const calorieTarget = activeMealPlan?.daily_calorie_target || profile?.daily_calorie_target
      if (calorieTarget) {
        setDailyTarget(calorieTarget)
      }

      if (profile?.daily_protein_target_g) {
        setProteinTarget(profile.daily_protein_target_g)
      }
      if (profile?.daily_carbs_target_g) {
        setCarbsTarget(profile.daily_carbs_target_g)
      }
      if (profile?.daily_fat_target_g) {
        setFatTarget(profile.daily_fat_target_g)
      }
    } catch (error) {
      console.error('Error fetching daily target:', error)
    }
  }

  const fetchAllDailyCalories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all meal logs
      const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('log_date, calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })

      if (mealLogs) {
        // Aggregate by date
        const nutritionByDate = new Map<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }>()
        mealLogs.forEach(log => {
          const date = log.log_date
          const current = nutritionByDate.get(date) || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
          nutritionByDate.set(date, {
            calories: current.calories + (log.calories || 0),
            protein_g: current.protein_g + (log.protein_g || 0),
            carbs_g: current.carbs_g + (log.carbs_g || 0),
            fat_g: current.fat_g + (log.fat_g || 0),
          })
        })

        const dailyData = Array.from(nutritionByDate.entries()).map(([date, nutrition]) => ({
          date,
          calories: nutrition.calories,
          protein_g: nutrition.protein_g,
          carbs_g: nutrition.carbs_g,
          fat_g: nutrition.fat_g,
        }))

        setDailyCalories(dailyData)
      }
    } catch (error) {
      console.error('Error fetching daily calories:', error)
    }
  }

  const fetchMeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .order('log_time', { ascending: false })

      if (selectedDate) {
        query = query.eq('log_date', selectedDate)
      }

      const { data, error } = await query

      if (error) throw error

      setMeals(data || [])
      groupMealsBySessions(data || [])
    } catch (error) {
      console.error('Error fetching meals:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupMealsBySessions = (mealLogs: MealLog[]) => {
    const grouped = new Map<string, GroupedMeal>()

    mealLogs.forEach(meal => {
      const sessionId = meal.meal_session_id || meal.id

      if (!grouped.has(sessionId)) {
        grouped.set(sessionId, {
          sessionId,
          mealType: meal.meal_type || 'snack',
          date: meal.log_date,
          time: meal.log_time,
          items: [],
          totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        })
      }

      const group = grouped.get(sessionId)!
      group.items.push(meal)
      group.totals.calories += meal.calories || 0
      group.totals.protein_g += meal.protein_g || 0
      group.totals.carbs_g += meal.carbs_g || 0
      group.totals.fat_g += meal.fat_g || 0
    })

    setGroupedMeals(Array.from(grouped.values()))
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', mealId)

      if (error) throw error

      fetchMeals()
      fetchAllDailyCalories() // Refresh calendar
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Failed to delete meal')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const session = groupedMeals.find(g => g.sessionId === sessionId)
    if (!session) return

    const itemCount = session.items.length
    if (!confirm(`Delete this entire meal (${itemCount} item${itemCount > 1 ? 's' : ''})?`)) return

    try {
      const itemIds = session.items.map(item => item.id)
      const { error } = await supabase
        .from('meal_logs')
        .delete()
        .in('id', itemIds)

      if (error) throw error

      fetchMeals()
      fetchAllDailyCalories() // Refresh calendar
    } catch (error) {
      console.error('Error deleting meal session:', error)
      alert('Failed to delete meal')
    }
  }

  const handleEditMeal = (meal: MealLog) => {
    setEditingMealId(meal.id)
    setEditFormData({
      meal_name: meal.meal_name,
      calories: meal.calories?.toString() || '',
      protein_g: meal.protein_g?.toString() || '',
      carbs_g: meal.carbs_g?.toString() || '',
      fat_g: meal.fat_g?.toString() || '',
      portion_size: meal.portion_size || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingMealId(null)
    setEditFormData({
      meal_name: '',
      calories: '',
      protein_g: '',
      carbs_g: '',
      fat_g: '',
      portion_size: '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingMealId) return

    try {
      const { error } = await supabase
        .from('meal_logs')
        .update({
          meal_name: editFormData.meal_name,
          calories: editFormData.calories ? parseInt(editFormData.calories) : null,
          protein_g: editFormData.protein_g ? parseFloat(editFormData.protein_g) : null,
          carbs_g: editFormData.carbs_g ? parseFloat(editFormData.carbs_g) : null,
          fat_g: editFormData.fat_g ? parseFloat(editFormData.fat_g) : null,
          portion_size: editFormData.portion_size || null,
        })
        .eq('id', editingMealId)

      if (error) throw error

      handleCancelEdit()
      fetchMeals()
      fetchAllDailyCalories() // Refresh calendar
    } catch (error) {
      console.error('Error updating meal:', error)
      alert('Failed to update meal')
    }
  }

  const handleFoodSelect = (item: FoodItem) => {
    setNewItemData({
      meal_name: item.name,
      calories: item.calories.toString(),
      protein_g: item.protein_g?.toString() || '',
      carbs_g: item.carbs_g?.toString() || '',
      fat_g: item.fat_g?.toString() || '',
      portion_size: item.serving_size,
    })
  }

  const handleAddItemToMeal = async (sessionId: string) => {
    if (!newItemData.meal_name) {
      alert('Please select or enter a food item')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the meal session details (meal_type, log_date, etc.) from an existing item
      const session = groupedMeals.find(g => g.sessionId === sessionId)
      if (!session) return

      const existingItem = session.items[0]

      // If this was a single-item meal (no session ID), create one
      let actualSessionId = sessionId
      if (sessionId === existingItem.id) {
        // Generate a new session ID
        actualSessionId = crypto.randomUUID()

        // Update the existing item to use the new session ID
        await supabase
          .from('meal_logs')
          .update({ meal_session_id: actualSessionId })
          .eq('id', existingItem.id)
      }

      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_session_id: actualSessionId,
          meal_name: newItemData.meal_name,
          meal_type: existingItem.meal_type,
          log_date: existingItem.log_date,
          log_time: existingItem.log_time,
          calories: newItemData.calories ? parseInt(newItemData.calories) : null,
          protein_g: newItemData.protein_g ? parseFloat(newItemData.protein_g) : null,
          carbs_g: newItemData.carbs_g ? parseFloat(newItemData.carbs_g) : null,
          fat_g: newItemData.fat_g ? parseFloat(newItemData.fat_g) : null,
          portion_size: newItemData.portion_size || null,
          notes: existingItem.notes,
        })

      if (error) throw error

      // Reset form
      setAddingToSessionId(null)
      setNewItemData({
        meal_name: '',
        calories: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        portion_size: '',
      })

      fetchMeals()
      fetchAllDailyCalories()
    } catch (error) {
      console.error('Error adding item to meal:', error)
      alert('Failed to add item to meal')
    }
  }

  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatDate = (dateStr: string) => {
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today'
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const getNutritionColor = (current: number, target: number, type: 'calories' | 'protein' | 'macro' = 'macro') => {
    const percentage = (current / target) * 100

    if (type === 'protein') {
      // For protein: higher is better
      if (percentage >= 100) {
        return { bg: 'bg-green-50', text: 'text-green-700' }
      } else if (percentage >= 80) {
        return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
      } else {
        return { bg: 'bg-red-50', text: 'text-red-700' }
      }
    } else if (type === 'calories') {
      // For calories: at or above target is red
      if (percentage < 90) {
        return { bg: 'bg-green-50', text: 'text-green-700' }
      } else if (percentage < 100) {
        return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
      } else {
        return { bg: 'bg-red-50', text: 'text-red-700' }
      }
    } else {
      // For carbs, fat: lower is better with some buffer
      if (percentage < 90) {
        return { bg: 'bg-green-50', text: 'text-green-700' }
      } else if (percentage <= 110) {
        return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
      } else {
        return { bg: 'bg-red-50', text: 'text-red-700' }
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading meal history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <nav className="relative z-10 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 shadow-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 text-transparent bg-clip-text hover:from-primary-300 hover:to-purple-300 transition-all">
            Weight Loss Tracker
          </Link>
          <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">Meal History</h1>
              <p className="text-gray-400">Click on a day to view your meals</p>
            </div>
            <Link
              href="/dashboard/log-activity"
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
            >
              + Log Meal
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <MealCalendar
              dailyCalories={dailyCalories}
              dailyTarget={dailyTarget}
              proteinTarget={proteinTarget}
              carbsTarget={carbsTarget}
              fatTarget={fatTarget}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Selected Day Meals */}
          <div>
            {!selectedDate ? (
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
                <div className="relative z-10">
                  <div className="text-gray-500 text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-bold text-white mb-2">Select a Day</h3>
                  <p className="text-gray-400">
                    Click on any day in the calendar to view meals
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {formatDate(selectedDate)}
                      </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {(() => {
                        const currentCals = dailyCalories.find(d => d.date === selectedDate)?.calories || 0
                        const colors = getNutritionColor(currentCals, dailyTarget, 'calories')
                        return (
                          <div className={`${colors.bg} p-3 rounded-lg`}>
                            <div className="text-xs text-gray-600 mb-1">Calories</div>
                            <div className={`text-xl font-bold ${colors.text}`}>
                              {currentCals.toFixed(0)}
                            </div>
                            <div className="text-xs text-gray-600">
                              Goal: {dailyTarget}
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const currentProtein = dailyCalories.find(d => d.date === selectedDate)?.protein_g || 0
                        const colors = getNutritionColor(currentProtein, proteinTarget, 'protein')
                        return (
                          <div className={`${colors.bg} p-3 rounded-lg`}>
                            <div className="text-xs text-gray-600 mb-1">Protein</div>
                            <div className={`text-xl font-bold ${colors.text}`}>
                              {currentProtein.toFixed(0)}g
                            </div>
                            <div className="text-xs text-gray-600">
                              Goal: {proteinTarget}g
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(() => {
                        const currentCarbs = dailyCalories.find(d => d.date === selectedDate)?.carbs_g || 0
                        const colors = getNutritionColor(currentCarbs, carbsTarget)
                        return (
                          <div className={`${colors.bg} p-3 rounded-lg`}>
                            <div className="text-xs text-gray-600 mb-1">Carbs</div>
                            <div className={`text-xl font-bold ${colors.text}`}>
                              {currentCarbs.toFixed(0)}g
                            </div>
                            <div className="text-xs text-gray-600">
                              Goal: {carbsTarget}g
                            </div>
                          </div>
                        )
                      })()}
                      {(() => {
                        const currentFat = dailyCalories.find(d => d.date === selectedDate)?.fat_g || 0
                        const colors = getNutritionColor(currentFat, fatTarget)
                        return (
                          <div className={`${colors.bg} p-3 rounded-lg`}>
                            <div className="text-xs text-gray-600 mb-1">Fat</div>
                            <div className={`text-xl font-bold ${colors.text}`}>
                              {currentFat.toFixed(0)}g
                            </div>
                            <div className="text-xs text-gray-600">
                              Goal: {fatTarget}g
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                  <div className="border-t border-gray-700/50 pt-4 mb-4">
                    <h4 className="font-semibold text-white mb-3">Meals Logged</h4>

                    {groupedMeals.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 text-4xl mb-2">🍽️</div>
                        <p className="text-gray-400 text-sm mb-4">
                          No meals logged for this day
                        </p>
                        <Link
                          href="/dashboard/log-activity"
                          className="inline-block px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
                        >
                          Log Meal
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {groupedMeals.map((group) => (
                          <div key={group.sessionId} className="border border-gray-600/50 rounded-lg p-4 bg-gray-700/30">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-white">
                                    {formatMealType(group.mealType)}
                                  </h4>
                                  {group.items.length > 1 && (
                                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                                      {group.items.length} items
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">
                                  {group.time && `${group.time}`}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setAddingToSessionId(addingToSessionId === group.sessionId ? null : group.sessionId)}
                                  className="text-blue-400 hover:text-blue-300 font-semibold text-xs transition-colors"
                                >
                                  {addingToSessionId === group.sessionId ? 'Cancel' : '+ Add Item'}
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(group.sessionId)}
                                  className="text-red-400 hover:text-red-300 font-semibold text-xs transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                          {/* Items */}
                          <div className="space-y-2 mb-3">
                            {group.items.map((item) => (
                              <div key={item.id} className="bg-gray-800/50 border border-gray-600/30 rounded p-2">
                                {editingMealId === item.id ? (
                                  // Edit Form
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editFormData.meal_name}
                                      onChange={(e) => setEditFormData({ ...editFormData, meal_name: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      placeholder="Food name"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={editFormData.portion_size}
                                        onChange={(e) => setEditFormData({ ...editFormData, portion_size: e.target.value })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder="Portion"
                                      />
                                      <input
                                        type="number"
                                        value={editFormData.calories}
                                        onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder="Calories"
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editFormData.protein_g}
                                        onChange={(e) => setEditFormData({ ...editFormData, protein_g: e.target.value })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder="Protein (g)"
                                      />
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editFormData.carbs_g}
                                        onChange={(e) => setEditFormData({ ...editFormData, carbs_g: e.target.value })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder="Carbs (g)"
                                      />
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editFormData.fat_g}
                                        onChange={(e) => setEditFormData({ ...editFormData, fat_g: e.target.value })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                        placeholder="Fat (g)"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Display Mode
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-white truncate">{item.meal_name}</div>
                                      <div className="text-xs text-gray-300">
                                        {item.portion_size && `${item.portion_size} • `}
                                        {item.calories || 0} cal
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        P: {item.protein_g || 0}g • C: {item.carbs_g || 0}g • F: {item.fat_g || 0}g
                                      </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button
                                        onClick={() => handleEditMeal(item)}
                                        className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                      >
                                        Edit
                                      </button>
                                      {group.items.length > 1 && (
                                        <>
                                          <span className="text-gray-500">|</span>
                                          <button
                                            onClick={() => handleDeleteMeal(item.id)}
                                            className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add Item Form */}
                          {addingToSessionId === group.sessionId && (
                            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-3">
                              <h5 className="text-xs font-semibold text-blue-300 mb-2">Add Item to {formatMealType(group.mealType)}</h5>

                              <div className="mb-2">
                                <FoodSearchAutocomplete
                                  onSelect={handleFoodSelect}
                                  placeholder="Search for food..."
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <input
                                  type="text"
                                  value={newItemData.portion_size}
                                  onChange={(e) => setNewItemData({ ...newItemData, portion_size: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Portion size"
                                />
                                <input
                                  type="number"
                                  value={newItemData.calories}
                                  onChange={(e) => setNewItemData({ ...newItemData, calories: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Calories"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={newItemData.protein_g}
                                  onChange={(e) => setNewItemData({ ...newItemData, protein_g: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Protein (g)"
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={newItemData.carbs_g}
                                  onChange={(e) => setNewItemData({ ...newItemData, carbs_g: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Carbs (g)"
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={newItemData.fat_g}
                                  onChange={(e) => setNewItemData({ ...newItemData, fat_g: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                                  placeholder="Fat (g)"
                                />
                              </div>

                              <button
                                onClick={() => handleAddItemToMeal(group.sessionId)}
                                disabled={!newItemData.meal_name}
                                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add to Meal
                              </button>
                            </div>
                          )}

                          {/* Notes */}
                          {group.items[0]?.notes && (
                            <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs">
                              <span className="font-semibold text-yellow-300">Note: </span>
                              <span className="text-yellow-200">{group.items[0].notes}</span>
                            </div>
                          )}

                          {/* Totals */}
                          <div className="border-t border-gray-600/50 pt-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-300">Total:</span>
                              <div className="flex gap-3">
                                <span className="font-semibold text-white">
                                  {group.totals.calories.toFixed(0)} cal
                                </span>
                                <span className="text-gray-300">P: {group.totals.protein_g.toFixed(1)}g</span>
                                <span className="text-gray-300">C: {group.totals.carbs_g.toFixed(1)}g</span>
                                <span className="text-gray-300">F: {group.totals.fat_g.toFixed(1)}g</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
