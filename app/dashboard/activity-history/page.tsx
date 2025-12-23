'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ActivityCalendar from '@/components/ActivityCalendar'

type WorkoutLog = {
  id: string
  workout_name: string
  duration_minutes: number | null
  calories_burned: number | null
  log_date: string
  notes: string | null
}

export default function ActivityHistoryPage() {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchWorkoutLogs()
  }, [])

  const fetchWorkoutLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })

      if (fetchError) throw fetchError
      setWorkoutLogs(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return

    try {
      const { error: deleteError } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchWorkoutLogs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatDate = (dateStr: string) => {
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

  const extractSteps = (notes: string | null): number => {
    if (!notes) return 0
    const match = notes.match(/Steps:\s*(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  const extractDistance = (notes: string | null): string => {
    if (!notes) return ''
    const match = notes.match(/Distance:\s*([\d.]+)\s*(miles|km)/)
    return match ? `${match[1]} ${match[2]}` : ''
  }

  const extractAdditionalNotes = (notes: string | null): string => {
    if (!notes) return ''
    // Remove steps and distance lines, return the rest
    return notes
      .split('\n')
      .filter(line => !line.match(/^(Steps:|Distance:)/))
      .join('\n')
      .trim()
  }

  const selectedDayLogs = selectedDate
    ? workoutLogs.filter(log => log.log_date === selectedDate)
    : []

  const dailyActivities = workoutLogs.map(log => ({
    date: log.log_date,
    calories_burned: log.calories_burned || 0,
    steps: extractSteps(log.notes),
    distance: extractDistance(log.notes),
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activity history...</p>
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
              <h1 className="text-3xl font-bold mb-2 text-white">Activity History</h1>
              <p className="text-gray-400">Click on a day to view your activity logs</p>
            </div>
            <Link
              href="/dashboard/log-activity"
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
            >
              + Log Activity
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <ActivityCalendar
              dailyActivities={dailyActivities}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Selected Day Logs */}
          <div>
            {!selectedDate ? (
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
                <div className="relative z-10">
                  <div className="text-gray-500 text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-bold text-white mb-2">Select a Day</h3>
                  <p className="text-gray-400">
                    Click on any day in the calendar to view activity logs
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {formatDate(selectedDate)}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedDate('')}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {selectedDayLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500 text-4xl mb-2">🚶</div>
                      <p className="text-gray-400 text-sm mb-4">
                        No activity logged for this day
                      </p>
                      <Link
                        href="/dashboard/log-activity"
                        className="inline-block px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
                      >
                        Log Activity
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {selectedDayLogs.map((log) => {
                        const steps = extractSteps(log.notes)
                        const distance = extractDistance(log.notes)
                        const additionalNotes = extractAdditionalNotes(log.notes)

                        return (
                          <div key={log.id} className="border border-gray-600/50 rounded-lg p-4 bg-gray-700/30">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-lg font-bold text-white">
                                  {log.workout_name}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="text-red-400 hover:text-red-300 text-xs transition-colors"
                              >
                                Delete
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {steps > 0 && (
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                  <div className="text-xs text-purple-300 mb-1">Steps</div>
                                  <div className="text-xl font-bold text-purple-400">
                                    {steps.toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {distance && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                  <div className="text-xs text-blue-300 mb-1">Distance</div>
                                  <div className="text-xl font-bold text-blue-400">
                                    {distance}
                                  </div>
                                </div>
                              )}
                              {log.calories_burned && (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                  <div className="text-xs text-orange-300 mb-1">Calories Burned</div>
                                  <div className="text-xl font-bold text-orange-400">
                                    {log.calories_burned}
                                  </div>
                                </div>
                              )}
                              {log.duration_minutes && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                  <div className="text-xs text-green-300 mb-1">Duration</div>
                                  <div className="text-xl font-bold text-green-400">
                                    {log.duration_minutes} min
                                  </div>
                                </div>
                              )}
                            </div>

                            {additionalNotes && (
                              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-2 text-xs">
                                <span className="font-semibold text-yellow-300">Note: </span>
                                <span className="text-yellow-200">{additionalNotes}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
