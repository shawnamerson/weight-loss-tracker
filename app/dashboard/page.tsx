import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import WeightChart from '@/components/WeightChart'
import CalorieChart from '@/components/CalorieChart'
import ActivityChart from '@/components/ActivityChart'
import CalorieDeficitTracker from '@/components/CalorieDeficitTracker'
import GeneratePlansButton from '@/components/GeneratePlansButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user needs to complete onboarding
  if (!profile?.goal_weight_kg) {
    redirect('/onboarding')
  }

  // Get latest weight log
  const { data: latestWeight } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(1)
    .single()

  // Get all weight logs for chart (last 30 days)
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: true })
    .limit(30)

  // Get meal logs for last 30 days and aggregate by date
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('log_date, calories')
    .eq('user_id', user.id)
    .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true })

  // Aggregate calories by date
  const caloriesByDate = new Map<string, number>()
  mealLogs?.forEach(log => {
    const date = log.log_date
    const currentTotal = caloriesByDate.get(date) || 0
    caloriesByDate.set(date, currentTotal + (log.calories || 0))
  })

  const calorieLogs = Array.from(caloriesByDate.entries()).map(([log_date, total_calories]) => ({
    log_date,
    total_calories,
  }))

  // Get workout logs for last 30 days
  const { data: workoutLogs } = await supabase
    .from('workout_logs')
    .select('log_date, calories_burned, notes')
    .eq('user_id', user.id)
    .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true })

  // Get active meal plan
  const { data: activeMealPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  // Get active workout plan
  const { data: activeWorkoutPlan } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  // Use active meal plan's calorie target if available, otherwise use profile target
  const dailyCalorieTarget = activeMealPlan?.daily_calorie_target || profile?.daily_calorie_target || 2000

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 text-transparent bg-clip-text">Weight Loss Tracker</h1>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-white">Welcome back, {profile?.full_name || 'there'}!</h2>
          <p className="text-gray-400">Here's your progress overview</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current Weight</h3>
              <p className="text-3xl font-bold text-white">
                {latestWeight?.weight_kg || profile?.current_weight_kg
                  ? `${((latestWeight?.weight_kg || profile?.current_weight_kg || 0) * 2.20462).toFixed(1)} lbs`
                  : '--'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Goal: {profile?.goal_weight_kg ? `${(profile.goal_weight_kg * 2.20462).toFixed(1)} lbs` : '--'}
              </p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Weight to Lose</h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 text-transparent bg-clip-text">
                {profile?.current_weight_kg && profile?.goal_weight_kg
                  ? `${((profile.current_weight_kg - profile.goal_weight_kg) * 2.20462).toFixed(1)} lbs`
                  : '--'}
              </p>
              <p className="text-sm text-gray-400 mt-2">Keep going!</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Daily Calories</h3>
              <p className="text-3xl font-bold text-white">
                {dailyCalorieTarget}
              </p>
              <p className="text-sm text-gray-400 mt-2">Target per day</p>
            </div>
          </div>
        </div>

        {/* Progress Charts */}
        <div className="mb-8 grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Weight Progress</h2>
              <Link
                href="/dashboard/weight-history"
                className="text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors"
              >
                View History →
              </Link>
            </div>
            <WeightChart
              weightLogs={weightLogs || []}
              goalWeightKg={profile?.goal_weight_kg}
              unit="lbs"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Calorie Tracking</h2>
              <Link
                href="/dashboard/meal-history"
                className="text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors"
              >
                View Meal History →
              </Link>
            </div>
            <CalorieChart
              calorieLogs={calorieLogs}
              dailyTarget={dailyCalorieTarget}
            />
          </div>
        </div>

        {/* Activity Chart */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Activity Progress</h2>
            <Link
              href="/dashboard/activity-history"
              className="text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors"
            >
              View Activity History →
            </Link>
          </div>
          <ActivityChart workoutLogs={workoutLogs || []} />
        </div>

        {/* Calorie Deficit Tracker */}
        <div className="mb-8">
          <CalorieDeficitTracker
            calorieLogs={calorieLogs}
            workoutLogs={workoutLogs || []}
            dailyTarget={dailyCalorieTarget}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4 text-white">Meal Plan</h3>
              {activeMealPlan ? (
                <div>
                  <p className="text-white font-semibold">{activeMealPlan.plan_name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {activeMealPlan.start_date} to {activeMealPlan.end_date}
                  </p>
                  <Link
                    href="/dashboard/meals"
                    className="mt-4 inline-block text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                  >
                    View Meal Plan →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-4">No active meal plan yet</p>
                  <GeneratePlansButton />
                </div>
              )}
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4 text-white">Workout Plan</h3>
              {activeWorkoutPlan ? (
                <div>
                  <p className="text-white font-semibold">{activeWorkoutPlan.plan_name}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {activeWorkoutPlan.workouts_per_week} workouts per week
                  </p>
                  <Link
                    href="/dashboard/workouts"
                    className="mt-4 inline-block text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                  >
                    View Workout Plan →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-2">No active workout plan yet</p>
                  <p className="text-sm text-gray-500">Generate your plans using the button in the Meal Plan section</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/log-weight"
            className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 text-center hover:transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-4xl mb-2">⚖️</div>
              <h3 className="font-bold text-lg text-white">Log Weight</h3>
              <p className="text-gray-400 text-sm">Track your daily progress</p>
            </div>
          </Link>

          <Link
            href="/dashboard/log-activity"
            className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 text-center hover:transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-4xl mb-2">📝</div>
              <h3 className="font-bold text-lg text-white">Log Activity</h3>
              <p className="text-gray-400 text-sm">Record meals and workouts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
