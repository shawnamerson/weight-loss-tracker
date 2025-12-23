'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type FormData = {
  // Step 1: Personal Info
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | ''
  height_cm: string

  // Step 2: Weight & Goals
  starting_weight_kg: string
  current_weight_kg: string
  goal_weight_kg: string
  goal_type: 'lose_weight' | 'maintain_weight' | 'gain_muscle' | 'general_fitness' | ''
  target_weekly_loss_kg: string

  // Step 3: Activity & Fitness
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active' | ''
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | ''

  // Step 4: Diet Preferences
  dietary_restrictions: string[]
  food_dislikes: string
  cuisine_preferences: string[]
  meals_per_day: string

  // Step 5: Workout Preferences
  available_equipment: string[]
  workout_location: 'home' | 'gym' | 'outdoors' | 'mixed' | ''
  injuries_limitations: string
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressMessage, setProgressMessage] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('lbs')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft')
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [displayWeights, setDisplayWeights] = useState({
    current: '',
    goal: '',
  })
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    starting_weight_kg: '',
    current_weight_kg: '',
    goal_weight_kg: '',
    goal_type: '',
    target_weekly_loss_kg: '0.5',
    activity_level: '',
    fitness_level: '',
    dietary_restrictions: [],
    food_dislikes: '',
    cuisine_preferences: [],
    meals_per_day: '3',
    available_equipment: [],
    workout_location: '',
    injuries_limitations: '',
  })

  const totalSteps = 5

  // Conversion helpers
  const lbsToKg = (lbs: number) => lbs / 2.20462
  const kgToLbs = (kg: number) => kg * 2.20462
  const cmToFeet = (cm: number) => {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return { feet, inches }
  }
  const feetToCm = (feet: number, inches: number) => {
    return ((feet * 12) + inches) * 2.54
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleWeightChange = (field: 'current' | 'goal', displayValue: string) => {
    // Update display value
    setDisplayWeights(prev => ({ ...prev, [field]: displayValue }))

    // Convert and store in kg
    if (!displayValue) {
      const fieldMap: { [key: string]: keyof FormData } = {
        current: 'current_weight_kg',
        goal: 'goal_weight_kg',
      }
      handleInputChange(fieldMap[field] as keyof FormData, '')
      // Also clear starting weight when current weight is cleared
      if (field === 'current') {
        handleInputChange('starting_weight_kg', '')
      }
      return
    }

    const value = parseFloat(displayValue)
    if (isNaN(value)) return

    const kgValue = weightUnit === 'lbs' ? lbsToKg(value) : value
    const fieldMap: { [key: string]: keyof FormData } = {
      current: 'current_weight_kg',
      goal: 'goal_weight_kg',
    }
    handleInputChange(fieldMap[field] as keyof FormData, kgValue.toString())

    // Set starting weight to match current weight for new users
    if (field === 'current') {
      handleInputChange('starting_weight_kg', kgValue.toString())
    }
  }

  const updateHeightFromFeetInches = () => {
    if (heightFeet && heightInches) {
      const cm = feetToCm(parseFloat(heightFeet), parseFloat(heightInches))
      handleInputChange('height_cm', cm.toFixed(0))
    }
  }

  const handleArrayToggle = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    setFormData((prev) => ({ ...prev, [field]: newArray }))
  }

  const calculateTargets = () => {
    // Basic BMR calculation using Mifflin-St Jeor Equation
    const weight = parseFloat(formData.current_weight_kg)
    const height = parseFloat(formData.height_cm)
    const age = formData.date_of_birth ?
      new Date().getFullYear() - new Date(formData.date_of_birth).getFullYear() : 30

    let bmr = 0
    if (formData.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5
    } else if (formData.gender === 'female') {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161
    } else {
      // Use average for other genders
      bmr = 10 * weight + 6.25 * height - 5 * age - 78
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    }
    const multiplier = activityMultipliers[formData.activity_level as keyof typeof activityMultipliers] || 1.2

    let tdee = bmr * multiplier

    // Adjust for goal
    if (formData.goal_type === 'lose_weight') {
      const weeklyDeficit = parseFloat(formData.target_weekly_loss_kg) * 7700 // 7700 cal per kg
      tdee -= weeklyDeficit / 7 // Daily deficit
    } else if (formData.goal_type === 'gain_muscle') {
      tdee += 300 // Slight surplus
    }

    const dailyCalories = Math.round(tdee)
    const dailyProtein = Math.round(weight * 2) // 2g per kg body weight

    return { dailyCalories, dailyProtein }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setProgressMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { dailyCalories, dailyProtein } = calculateTargets()

      // Step 1: Update user profile
      setProgressMessage('Saving your profile...')
      const profile = {
        id: user.id,
        email: user.email || '',
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        height_cm: parseFloat(formData.height_cm),
        starting_weight_kg: parseFloat(formData.starting_weight_kg),
        current_weight_kg: parseFloat(formData.current_weight_kg),
        goal_weight_kg: parseFloat(formData.goal_weight_kg),
        goal_type: formData.goal_type || null,
        target_weekly_loss_kg: parseFloat(formData.target_weekly_loss_kg),
        activity_level: formData.activity_level || null,
        fitness_level: formData.fitness_level || null,
        dietary_restrictions: formData.dietary_restrictions.length > 0 ? formData.dietary_restrictions : null,
        food_dislikes: formData.food_dislikes ? formData.food_dislikes.split(',').map(s => s.trim()) : null,
        cuisine_preferences: formData.cuisine_preferences.length > 0 ? formData.cuisine_preferences : null,
        meals_per_day: parseInt(formData.meals_per_day),
        available_equipment: formData.available_equipment.length > 0 ? formData.available_equipment : null,
        workout_location: formData.workout_location || null,
        injuries_limitations: formData.injuries_limitations ? formData.injuries_limitations.split(',').map(s => s.trim()) : null,
        daily_calorie_target: dailyCalories,
        daily_protein_target_g: dailyProtein,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
          height_cm: profile.height_cm,
          starting_weight_kg: profile.starting_weight_kg,
          current_weight_kg: profile.current_weight_kg,
          goal_weight_kg: profile.goal_weight_kg,
          goal_type: profile.goal_type,
          target_weekly_loss_kg: profile.target_weekly_loss_kg,
          activity_level: profile.activity_level,
          fitness_level: profile.fitness_level,
          dietary_restrictions: profile.dietary_restrictions,
          food_dislikes: profile.food_dislikes,
          cuisine_preferences: profile.cuisine_preferences,
          meals_per_day: profile.meals_per_day,
          available_equipment: profile.available_equipment,
          workout_location: profile.workout_location,
          injuries_limitations: profile.injuries_limitations,
          daily_calorie_target: profile.daily_calorie_target,
          daily_protein_target_g: profile.daily_protein_target_g,
          updated_at: profile.updated_at,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Step 2: Create initial weight log
      await supabase
        .from('weight_logs')
        .insert({
          user_id: user.id,
          weight_kg: parseFloat(formData.current_weight_kg),
          log_date: new Date().toISOString().split('T')[0],
          notes: 'Initial weight from onboarding',
        })

      // Step 3: Generate meal plan automatically
      setProgressMessage('Creating your personalized meal plan...')
      const mealPlanResponse = await fetch('/api/generate-meal-plan', {
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
          daily_calorie_target: dailyCalories,
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

      // Step 4: Generate workout plan automatically
      setProgressMessage('Creating your personalized workout plan...')
      const workoutPlanResponse = await fetch('/api/generate-workout-plan', {
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

      // All done! Redirect to dashboard
      setProgressMessage('All set! Taking you to your dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Personal Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('gender', option.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.gender === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Height *
                </label>
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setHeightUnit('cm')}
                    className={`px-3 py-0.5 rounded-md text-xs font-medium transition ${
                      heightUnit === 'cm'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeightUnit('ft')}
                    className={`px-3 py-0.5 rounded-md text-xs font-medium transition ${
                      heightUnit === 'ft'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ft/in
                  </button>
                </div>
              </div>

              {heightUnit === 'cm' ? (
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="175"
                  required
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => {
                        setHeightFeet(e.target.value)
                        if (e.target.value && heightInches) {
                          const cm = feetToCm(parseFloat(e.target.value), parseFloat(heightInches))
                          handleInputChange('height_cm', cm.toFixed(0))
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Feet (e.g., 5)"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={heightInches}
                      onChange={(e) => {
                        setHeightInches(e.target.value)
                        if (heightFeet && e.target.value) {
                          const cm = feetToCm(parseFloat(heightFeet), parseFloat(e.target.value))
                          handleInputChange('height_cm', cm.toFixed(0))
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Inches (e.g., 9)"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Weight & Goals</h2>

              {/* Unit Toggle */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                    weightUnit === 'kg'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  kg
                </button>
                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                    weightUnit === 'lbs'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  lbs
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Weight ({weightUnit}) *
              </label>
              <input
                type="number"
                step="any"
                value={displayWeights.current}
                onChange={(e) => handleWeightChange('current', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={weightUnit === 'kg' ? '70' : '200'}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be set as your starting weight
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Weight ({weightUnit}) *
              </label>
              <input
                type="number"
                step="any"
                value={displayWeights.goal}
                onChange={(e) => handleWeightChange('goal', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={weightUnit === 'kg' ? '65' : '180'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Goal *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'lose_weight', label: 'Lose Weight' },
                  { value: 'maintain_weight', label: 'Maintain Weight' },
                  { value: 'gain_muscle', label: 'Gain Muscle' },
                  { value: 'general_fitness', label: 'General Fitness' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('goal_type', option.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.goal_type === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.goal_type === 'lose_weight' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Weekly Weight Loss
                </label>
                <select
                  value={formData.target_weekly_loss_kg}
                  onChange={(e) => handleInputChange('target_weekly_loss_kg', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {weightUnit === 'kg' ? (
                    <>
                      <option value="0.25">0.25 kg/week (Slow & Sustainable)</option>
                      <option value="0.5">0.5 kg/week (Recommended)</option>
                      <option value="0.75">0.75 kg/week (Moderate)</option>
                      <option value="1">1 kg/week (Aggressive)</option>
                    </>
                  ) : (
                    <>
                      <option value="0.25">0.5 lbs/week (Slow & Sustainable)</option>
                      <option value="0.5">1 lb/week (Recommended)</option>
                      <option value="0.75">1.5 lbs/week (Moderate)</option>
                      <option value="1">2 lbs/week (Aggressive)</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Activity & Fitness</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
                  { value: 'lightly_active', label: 'Lightly Active', desc: '1-3 days/week' },
                  { value: 'moderately_active', label: 'Moderately Active', desc: '3-5 days/week' },
                  { value: 'very_active', label: 'Very Active', desc: '6-7 days/week' },
                  { value: 'extremely_active', label: 'Extremely Active', desc: 'Athlete/physical job' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('activity_level', option.value)}
                    className={`w-full px-4 py-3 rounded-lg border text-left ${
                      formData.activity_level === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className={`text-sm ${formData.activity_level === option.value ? 'text-primary-100' : 'text-gray-500'}`}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fitness Level *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('fitness_level', option.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.fitness_level === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Diet Preferences</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher', 'Keto'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleArrayToggle('dietary_restrictions', option)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.dietary_restrictions.includes(option)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Food Dislikes (comma-separated)
              </label>
              <input
                type="text"
                value={formData.food_dislikes}
                onChange={(e) => handleInputChange('food_dislikes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., mushrooms, olives, cilantro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine Preferences
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleArrayToggle('cuisine_preferences', option)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.cuisine_preferences.includes(option)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meals Per Day *
              </label>
              <select
                value={formData.meals_per_day}
                onChange={(e) => handleInputChange('meals_per_day', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="2">2 meals</option>
                <option value="3">3 meals</option>
                <option value="4">4 meals</option>
                <option value="5">5 meals</option>
                <option value="6">6 meals</option>
              </select>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Workout Preferences</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Equipment
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Dumbbells', 'Barbell', 'Resistance Bands', 'Treadmill', 'Bike', 'Pull-up Bar', 'Gym Membership', 'None'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleArrayToggle('available_equipment', option)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.available_equipment.includes(option)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Workout Location *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'home', label: 'Home' },
                  { value: 'gym', label: 'Gym' },
                  { value: 'outdoors', label: 'Outdoors' },
                  { value: 'mixed', label: 'Mixed' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('workout_location', option.value)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.workout_location === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Injuries or Limitations (comma-separated)
              </label>
              <textarea
                value={formData.injuries_limitations}
                onChange={(e) => handleInputChange('injuries_limitations', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., knee pain, shoulder injury, lower back issues"
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">
                This helps us create safer workout plans for you
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        if (heightUnit === 'ft') {
          return formData.full_name && formData.date_of_birth && heightFeet && heightInches
        }
        return formData.full_name && formData.date_of_birth && formData.height_cm
      case 2:
        return displayWeights.current && displayWeights.goal && formData.goal_type
      case 3:
        return formData.activity_level && formData.fitness_level
      case 4:
        return formData.meals_per_day
      case 5:
        return formData.workout_location
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center mb-2">Let's Get Started!</h1>
            <p className="text-gray-600 text-center">
              Step {currentStep} of {totalSteps}
            </p>

            {/* Progress bar */}
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {progressMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>{progressMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            {renderStep()}

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
