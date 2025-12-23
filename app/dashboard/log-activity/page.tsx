'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FoodSearchAutocomplete from '@/components/FoodSearchAutocomplete'
import DailyNutritionSummary from '@/components/DailyNutritionSummary'
import type { FoodItem } from '@/lib/types/database'

type ActivityType = 'meal' | 'workout'

export default function LogActivityPage() {
  const [activityType, setActivityType] = useState<ActivityType>('meal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // Meal form state
  const [mealData, setMealData] = useState({
    meal_name: '',
    meal_type: 'breakfast' as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    quantity: '1',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    portion_size: '',
    notes: '',
    log_date: new Date().toISOString().split('T')[0],
    log_time: new Date().toTimeString().slice(0, 5),
  })

  // Multi-item meal state
  interface MealItem {
    meal_name: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    portion_size: string
  }
  const [mealItems, setMealItems] = useState<MealItem[]>([])
  const [mealNotes, setMealNotes] = useState('')

  // Workout form state
  const [workoutData, setWorkoutData] = useState({
    workout_name: 'Daily Activity',
    duration_minutes: '',
    calories_burned: '',
    notes: '',
    log_date: new Date().toISOString().split('T')[0],
  })
  const [steps, setSteps] = useState('')
  const [distance, setDistance] = useState('')
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>('miles')

  const handleFoodSelect = (item: FoodItem) => {
    setMealData({
      ...mealData,
      meal_name: item.name,
      calories: item.calories.toString(),
      protein_g: item.protein_g?.toString() || '',
      carbs_g: item.carbs_g?.toString() || '',
      fat_g: item.fat_g?.toString() || '',
      portion_size: item.serving_size,
    })
  }

  const handleAddToMeal = () => {
    if (!mealData.meal_name) {
      setError('Please enter a food name')
      return
    }

    const quantity = parseFloat(mealData.quantity) || 1

    const newItem: MealItem = {
      meal_name: mealData.meal_name,
      calories: (mealData.calories ? parseFloat(mealData.calories) : 0) * quantity,
      protein_g: (mealData.protein_g ? parseFloat(mealData.protein_g) : 0) * quantity,
      carbs_g: (mealData.carbs_g ? parseFloat(mealData.carbs_g) : 0) * quantity,
      fat_g: (mealData.fat_g ? parseFloat(mealData.fat_g) : 0) * quantity,
      portion_size: quantity > 1 ? `${quantity}x ${mealData.portion_size}` : mealData.portion_size || '',
    }

    setMealItems([...mealItems, newItem])

    // Reset item fields but keep meal type, date, and time
    setMealData({
      ...mealData,
      meal_name: '',
      quantity: '1',
      calories: '',
      protein_g: '',
      carbs_g: '',
      fat_g: '',
      portion_size: '',
    })
    setError('')
    setSuccess('Item added to meal!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleRemoveItem = (index: number) => {
    setMealItems(mealItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    return mealItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein_g: acc.protein_g + item.protein_g,
        carbs_g: acc.carbs_g + item.carbs_g,
        fat_g: acc.fat_g + item.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
  }

  const handleMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mealItems.length === 0) {
        throw new Error('Please add at least one item to your meal')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate a unique session ID for this meal
      const mealSessionId = crypto.randomUUID()

      // Prepare all items for batch insert
      const itemsToInsert = mealItems.map(item => ({
        user_id: user.id,
        meal_session_id: mealSessionId,
        meal_name: item.meal_name,
        meal_type: mealData.meal_type,
        calories: item.calories || null,
        protein_g: item.protein_g || null,
        carbs_g: item.carbs_g || null,
        fat_g: item.fat_g || null,
        portion_size: item.portion_size || null,
        notes: mealNotes || null,
        log_date: mealData.log_date,
        log_time: mealData.log_time || null,
      }))

      const { error: insertError } = await supabase
        .from('meal_logs')
        .insert(itemsToInsert)

      if (insertError) throw insertError

      setSuccess(`Meal logged successfully! ${mealItems.length} item(s) saved.`)

      // Redirect to meal history page
      setTimeout(() => {
        router.push('/dashboard/meal-history')
      }, 500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWorkoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Build notes with steps and distance
      let activityNotes = workoutData.notes
      if (steps || distance) {
        const activityDetails = []
        if (steps) activityDetails.push(`Steps: ${steps}`)
        if (distance) activityDetails.push(`Distance: ${distance} ${distanceUnit}`)

        const detailsString = activityDetails.join(' | ')
        activityNotes = activityNotes
          ? `${detailsString}\n${activityNotes}`
          : detailsString
      }

      const { error: insertError } = await supabase.from('workout_logs').insert({
        user_id: user.id,
        workout_name: workoutData.workout_name,
        duration_minutes: workoutData.duration_minutes ? parseInt(workoutData.duration_minutes) : null,
        calories_burned: workoutData.calories_burned ? parseInt(workoutData.calories_burned) : null,
        notes: activityNotes || null,
        log_date: workoutData.log_date,
      })

      if (insertError) throw insertError

      setSuccess('Activity logged successfully!')

      // Redirect to activity history page
      setTimeout(() => {
        router.push('/dashboard/activity-history')
      }, 500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">Log Activity</h1>
            <Link
              href="/dashboard/meal-history"
              className="text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors"
            >
              View Meal History →
            </Link>
          </div>
          <p className="text-gray-400 mb-6">Track your meals and workouts</p>

          {/* Daily Nutrition Summary */}
          <DailyNutritionSummary refreshTrigger={refreshTrigger} />

          <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
            <div className="relative z-10">
            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-gray-700/50">
              <button
                onClick={() => setActivityType('meal')}
                className={`px-6 py-3 font-semibold transition border-b-2 ${
                  activityType === 'meal'
                    ? 'text-primary-400 border-primary-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                🍽️ Log Meal
              </button>
              <button
                onClick={() => setActivityType('workout')}
                className={`px-6 py-3 font-semibold transition border-b-2 ${
                  activityType === 'workout'
                    ? 'text-primary-400 border-primary-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                🚶 Log Activity
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg mb-6">
                {success}
              </div>
            )}

            {/* Meal Form */}
            {activityType === 'meal' && (
              <form onSubmit={handleMealSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={mealData.log_date}
                      onChange={(e) => setMealData({ ...mealData, log_date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={mealData.log_time}
                      onChange={(e) => setMealData({ ...mealData, log_time: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Meal Type *
                  </label>
                  <select
                    value={mealData.meal_type}
                    onChange={(e) => setMealData({ ...mealData, meal_type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Food or Drink Name *
                  </label>
                  <FoodSearchAutocomplete
                    onSelect={handleFoodSelect}
                    placeholder="Search or enter food/drink name..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Start typing to search our database or enter a new item to get AI nutrition info
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={mealData.quantity}
                      onChange={(e) => setMealData({ ...mealData, quantity: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={mealData.calories}
                      onChange={(e) => setMealData({ ...mealData, calories: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Portion Size
                    </label>
                    <input
                      type="text"
                      value={mealData.portion_size}
                      onChange={(e) => setMealData({ ...mealData, portion_size: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="1 plate, 2 cups, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={mealData.protein_g}
                      onChange={(e) => setMealData({ ...mealData, protein_g: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={mealData.carbs_g}
                      onChange={(e) => setMealData({ ...mealData, carbs_g: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={mealData.fat_g}
                      onChange={(e) => setMealData({ ...mealData, fat_g: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="15"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddToMeal}
                    disabled={!mealData.meal_name}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ➕ Add to Meal
                  </button>
                </div>

                {/* Items List */}
                {mealItems.length > 0 && (
                  <div className="border-t border-gray-600/50 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Items in this meal ({mealItems.length})
                    </h3>

                    <div className="space-y-2 mb-4">
                      {mealItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-700/30 border border-gray-600/50 rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-white">{item.meal_name}</div>
                            <div className="text-sm text-gray-300">
                              {item.portion_size && `${item.portion_size} • `}
                              {item.calories} cal • P: {item.protein_g}g • C: {item.carbs_g}g • F: {item.fat_g}g
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="ml-3 text-red-400 hover:text-red-300 font-semibold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Running Totals */}
                    <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-primary-300 mb-2">Meal Totals</h4>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary-400">
                            {calculateTotals().calories.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-300">Calories</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary-400">
                            {calculateTotals().protein_g.toFixed(1)}g
                          </div>
                          <div className="text-xs text-gray-300">Protein</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary-400">
                            {calculateTotals().carbs_g.toFixed(1)}g
                          </div>
                          <div className="text-xs text-gray-300">Carbs</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary-400">
                            {calculateTotals().fat_g.toFixed(1)}g
                          </div>
                          <div className="text-xs text-gray-300">Fat</div>
                        </div>
                      </div>
                    </div>

                    {/* Meal Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Meal Notes (optional)
                      </label>
                      <textarea
                        value={mealNotes}
                        onChange={(e) => setMealNotes(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={2}
                        placeholder="How did you feel after this meal?"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Logging...' : `Log ${mealData.meal_type} (${mealItems.length} items)`}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Workout Form */}
            {activityType === 'workout' && (
              <form onSubmit={handleWorkoutSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={workoutData.log_date}
                    onChange={(e) => setWorkoutData({ ...workoutData, log_date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Steps
                  </label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Distance
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="0.01"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 5.2"
                    />
                    <select
                      value={distanceUnit}
                      onChange={(e) => setDistanceUnit(e.target.value as 'miles' | 'km')}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="miles">Miles</option>
                      <option value="km">Kilometers</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Calories Burned
                  </label>
                  <input
                    type="number"
                    value={workoutData.calories_burned}
                    onChange={(e) => setWorkoutData({ ...workoutData, calories_burned: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 250"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={workoutData.notes}
                    onChange={(e) => setWorkoutData({ ...workoutData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="How did you feel today?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging...' : 'Log Activity'}
                </button>
              </form>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
