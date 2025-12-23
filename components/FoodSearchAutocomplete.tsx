'use client'

import { useState, useEffect, useRef } from 'react'
import type { FoodItem } from '@/lib/types/database'

type Props = {
  onSelect: (item: FoodItem) => void
  category?: 'food' | 'drink' | 'snack'
  placeholder?: string
}

export default function FoodSearchAutocomplete({ onSelect, category, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isGettingNutrition, setIsGettingNutrition] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchFood = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({ q: query })
        if (category) params.append('category', category)

        const response = await fetch(`/api/food-items/search?${params}`)
        const data = await response.json()
        setResults(data.results || [])
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchFood, 300)
    return () => clearTimeout(debounce)
  }, [query, category])

  const handleSelect = (item: FoodItem) => {
    onSelect(item)
    setQuery(item.name)
    setShowResults(false)
    setSelectedIndex(-1)
  }

  const handleGetNutrition = async () => {
    if (!query || query.length < 2) return

    setIsGettingNutrition(true)
    setShowResults(false)

    try {
      const response = await fetch('/api/food-items/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: query }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get nutrition info')
      }

      if (data.foodItem) {
        onSelect(data.foodItem)
        setQuery(data.foodItem.name)
      } else {
        throw new Error('No nutrition data returned')
      }
    } catch (error: any) {
      console.error('Error getting nutrition:', error)
      alert(`Failed to get nutritional information: ${error.message || 'Unknown error'}`)
      setShowResults(true) // Show the search results again
    } finally {
      setIsGettingNutrition(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(-1)
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
          placeholder={placeholder || 'Search food or drink...'}
          disabled={isGettingNutrition}
        />
        {(isLoading || isGettingNutrition) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {isGettingNutrition && (
        <div className="absolute z-50 w-full mt-1 bg-blue-50 border border-blue-300 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <div>
              <p className="font-semibold text-blue-900">Getting nutritional information...</p>
              <p className="text-sm text-blue-700">This may take a few seconds</p>
            </div>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <div className="font-semibold text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {item.serving_size} • {item.calories} cal
                {item.brand && ` • ${item.brand}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                P: {item.protein_g}g • C: {item.carbs_g}g • F: {item.fat_g}g
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-gray-600 mb-3">No results found for "{query}"</p>
          <button
            onClick={handleGetNutrition}
            disabled={isGettingNutrition}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {isGettingNutrition ? 'Getting nutrition info...' : '🤖 Get AI Nutrition Info'}
          </button>
        </div>
      )}
    </div>
  )
}
