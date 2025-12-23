'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Mood = 'great' | 'good' | 'okay' | 'struggling' | 'difficult'

export default function LogWeightPage() {
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('lbs')
  const [displayWeight, setDisplayWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mood, setMood] = useState<Mood | ''>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Conversion helpers
  const lbsToKg = (lbs: number) => lbs / 2.20462
  const kgToLbs = (kg: number) => kg * 2.20462

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert weight to kg for storage
      const weightValue = parseFloat(displayWeight)
      if (isNaN(weightValue)) {
        throw new Error('Please enter a valid weight')
      }

      const weightKg = weightUnit === 'lbs' ? lbsToKg(weightValue) : weightValue

      // Upsert weight log (insert or update if exists for this date)
      const { error: upsertError } = await supabase
        .from('weight_logs')
        .upsert({
          user_id: user.id,
          weight_kg: weightKg,
          log_date: date,
          log_time: new Date().toTimeString().split(' ')[0],
          mood: mood || null,
          notes: notes || null,
        }, {
          onConflict: 'user_id,log_date'
        })

      if (upsertError) throw upsertError

      // Update current weight in profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          current_weight_kg: weightKg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(true)

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const moodOptions: { value: Mood; label: string; emoji: string; color: string }[] = [
    { value: 'great', label: 'Great', emoji: '😄', color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'good', label: 'Good', emoji: '🙂', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'okay', label: 'Okay', emoji: '😐', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'struggling', label: 'Struggling', emoji: '😕', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'difficult', label: 'Difficult', emoji: '😰', color: 'bg-red-100 text-red-800 border-red-300' },
  ]

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
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Log Your Weight</h1>
            <p className="text-gray-600 mb-8">Track your daily progress</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
                Weight logged successfully! Redirecting to dashboard...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Weight */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Weight *
                  </label>
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
                <input
                  type="number"
                  step="any"
                  value={displayWeight}
                  onChange={(e) => setDisplayWeight(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={weightUnit === 'kg' ? '70' : '200'}
                  required
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How are you feeling? (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {moodOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMood(option.value)}
                      className={`px-3 py-2 rounded-lg border-2 transition ${
                        mood === option.value
                          ? option.color + ' border-current'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="How did you feel today? Any challenges or wins?"
                  rows={4}
                />
              </div>

              {/* Submit buttons */}
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : success ? 'Saved!' : 'Log Weight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
