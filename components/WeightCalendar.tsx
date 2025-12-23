'use client'

import { useState } from 'react'

interface DayWeight {
  date: string
  weight_kg: number
}

interface WeightCalendarProps {
  dailyWeights: DayWeight[]
  goalWeightKg: number
  selectedDate: string
  onDateSelect: (date: string) => void
  unit: 'kg' | 'lbs'
}

export default function WeightCalendar({ dailyWeights, goalWeightKg, selectedDate, onDateSelect, unit }: WeightCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Create a map for quick lookup
  const weightMap = new Map(dailyWeights.map(d => [d.date, d.weight_kg]))

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const formatDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const convertWeight = (kg: number) => {
    if (unit === 'lbs') {
      return kg * 2.20462
    }
    return kg
  }

  const getWeightColor = (weightKg: number) => {
    if (!weightKg) return 'bg-gray-50'

    if (weightKg <= goalWeightKg) {
      return 'bg-green-200 text-green-900'
    } else if (weightKg <= goalWeightKg * 1.05) {
      return 'bg-green-100 text-green-800'
    } else if (weightKg <= goalWeightKg * 1.1) {
      return 'bg-yellow-100 text-yellow-800'
    } else {
      return 'bg-orange-100 text-orange-800'
    }
  }

  // Generate calendar grid
  const calendarDays = []

  // Add empty cells for days before the month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="aspect-square" />)
  }

  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(day)
    const weightKg = weightMap.get(dateStr)
    const isSelected = dateStr === selectedDate
    const today = isToday(day)

    calendarDays.push(
      <button
        key={day}
        onClick={() => onDateSelect(dateStr)}
        className={`aspect-square p-2 rounded-lg transition relative border-2 ${
          isSelected
            ? 'border-primary-600 ring-2 ring-primary-200'
            : 'border-transparent hover:border-gray-300'
        } ${getWeightColor(weightKg || 0)}`}
      >
        <div className="flex flex-col h-full">
          <div className={`text-sm font-semibold mb-1 ${today ? 'text-primary-600' : ''}`}>
            {day}
            {today && <span className="ml-1 text-xs">•</span>}
          </div>
          {weightKg && (
            <div className="text-xs font-medium mt-auto">
              {convertWeight(weightKg).toFixed(1)}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Color Guide:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-200"></div>
            <span className="text-gray-600">At/below goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100"></div>
            <span className="text-gray-600">Above goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100"></div>
            <span className="text-gray-600">Close to goal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100"></div>
            <span className="text-gray-600">Need progress</span>
          </div>
        </div>
      </div>
    </div>
  )
}
