'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import WeightCalendar from '@/components/WeightCalendar'

type WeightLog = {
  id: string
  weight_kg: number
  log_date: string
  log_time: string | null
  mood: 'great' | 'good' | 'okay' | 'struggling' | 'difficult' | null
  notes: string | null
}

type EditingLog = WeightLog & {
  displayWeight: string
}

export default function WeightHistoryPage() {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditingLog | null>(null)
  const [weightUnit] = useState<'kg' | 'lbs'>('lbs')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [goalWeightKg, setGoalWeightKg] = useState<number>(70)
  const router = useRouter()
  const supabase = createClient()

  // Conversion helpers
  const lbsToKg = (lbs: number) => lbs / 2.20462
  const kgToLbs = (kg: number) => kg * 2.20462

  useEffect(() => {
    fetchGoalWeight()
    fetchWeightLogs()
  }, [])

  const fetchGoalWeight = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('goal_weight_kg')
        .eq('id', user.id)
        .single()

      if (profile?.goal_weight_kg) {
        setGoalWeightKg(profile.goal_weight_kg)
      }
    } catch (err) {
      console.error('Error fetching goal weight:', err)
    }
  }

  const fetchWeightLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })

      if (fetchError) throw fetchError
      setWeightLogs(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (log: WeightLog) => {
    const displayWeight = weightUnit === 'lbs'
      ? kgToLbs(log.weight_kg).toFixed(1)
      : log.weight_kg.toFixed(1)

    setEditingId(log.id)
    setEditForm({ ...log, displayWeight })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    try {
      const weightKg = weightUnit === 'lbs'
        ? lbsToKg(parseFloat(editForm.displayWeight))
        : parseFloat(editForm.displayWeight)

      const { error: updateError } = await supabase
        .from('weight_logs')
        .update({
          weight_kg: weightKg,
          log_date: editForm.log_date,
          mood: editForm.mood || null,
          notes: editForm.notes || null,
        })
        .eq('id', editForm.id)

      if (updateError) throw updateError

      await fetchWeightLogs()
      setEditingId(null)
      setEditForm(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight log?')) return

    try {
      const { error: deleteError } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchWeightLogs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const moodEmojis = {
    great: '😄',
    good: '🙂',
    okay: '😐',
    struggling: '😕',
    difficult: '😰',
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

  const selectedDayLogs = selectedDate
    ? weightLogs.filter(log => log.log_date === selectedDate)
    : []

  const dailyWeights = weightLogs.map(log => ({
    date: log.log_date,
    weight_kg: log.weight_kg,
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading weight history...</p>
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
              <h1 className="text-3xl font-bold mb-2 text-white">Weight History</h1>
              <p className="text-gray-400">Click on a day to view your weight entries</p>
            </div>
            <Link
              href="/dashboard/log-weight"
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
            >
              + Log Weight
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
            <WeightCalendar
              dailyWeights={dailyWeights}
              goalWeightKg={goalWeightKg}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              unit={weightUnit}
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
                    Click on any day in the calendar to view weight entries
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
                      <div className="text-gray-500 text-4xl mb-2">⚖️</div>
                      <p className="text-gray-400 text-sm mb-4">
                        No weight logged for this day
                      </p>
                      <Link
                        href="/dashboard/log-weight"
                        className="inline-block px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all transform hover:scale-105"
                      >
                        Log Weight
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {selectedDayLogs.map((log) => (
                        <div key={log.id} className="border border-gray-600/50 rounded-lg p-4 bg-gray-700/30">
                        {editingId === log.id && editForm ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                  Weight ({weightUnit})
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editForm.displayWeight}
                                  onChange={(e) => setEditForm({ ...editForm, displayWeight: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={editForm.log_date}
                                  onChange={(e) => setEditForm({ ...editForm, log_date: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Mood
                              </label>
                              <select
                                value={editForm.mood || ''}
                                onChange={(e) => setEditForm({ ...editForm, mood: e.target.value as any })}
                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="">None</option>
                                <option value="great">😄 Great</option>
                                <option value="good">🙂 Good</option>
                                <option value="okay">😐 Okay</option>
                                <option value="struggling">😕 Struggling</option>
                                <option value="difficult">😰 Difficult</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Notes
                              </label>
                              <textarea
                                value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                rows={2}
                                placeholder="Notes..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 px-3 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-2xl font-bold text-primary-400">
                                  {weightUnit === 'lbs'
                                    ? `${kgToLbs(log.weight_kg).toFixed(1)} lbs`
                                    : `${log.weight_kg.toFixed(1)} kg`}
                                </div>
                                {log.log_time && (
                                  <div className="text-xs text-gray-400">
                                    Logged at {log.log_time}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(log)}
                                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(log.id)}
                                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            {log.mood && (
                              <div className="mb-2">
                                <span className="text-2xl">{moodEmojis[log.mood]}</span>
                                <span className="ml-2 text-sm text-gray-300 capitalize">{log.mood}</span>
                              </div>
                            )}
                            {log.notes && (
                              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-2 text-xs">
                                <span className="font-semibold text-yellow-300">Note: </span>
                                <span className="text-yellow-200">{log.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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
