'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GeneratePlansButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/generate-initial-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate plans')
      }

      // Refresh the page to show the new plans
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating Plans...' : 'Generate Plans Now'}
      </button>
      {loading && (
        <p className="text-sm text-gray-500 mt-2">
          This may take 30-60 seconds...
        </p>
      )}
    </div>
  )
}
