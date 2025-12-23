'use client'

import { useState, useEffect } from 'react'

interface DayNutrition {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface MealCalendarProps {
  dailyCalories: DayNutrition[]
  dailyTarget: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  selectedDate: string
  onDateSelect: (date: string) => void
}

export default function MealCalendar({ dailyCalories, dailyTarget, proteinTarget, carbsTarget, fatTarget, selectedDate, onDateSelect }: MealCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Create a map for quick lookup
  const nutritionMap = new Map(dailyCalories.map(d => [d.date, d]))

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

  const getCalorieColor = (calories: number) => {
    if (calories === 0) return 'bg-gray-50'
    const percentage = (calories / dailyTarget) * 100
    if (percentage < 90) return 'bg-green-100 text-green-800'  // Under goal
    if (percentage < 100) return 'bg-yellow-100 text-yellow-800'  // Approaching goal
    return 'bg-red-100 text-red-800'  // Over goal
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
    const nutrition = nutritionMap.get(dateStr)
    const calories = nutrition?.calories || 0
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
        } ${getCalorieColor(calories)}`}
      >
        <div className="flex flex-col h-full">
          <div className={`text-sm font-semibold mb-1 ${today ? 'text-primary-600' : ''}`}>
            {day}
            {today && <span className="ml-1 text-xs">•</span>}
          </div>
          {nutrition && calories > 0 && (
            <div className="text-[9px] font-medium mt-auto leading-tight">
              <div className="font-bold text-[10px]">{calories.toFixed(0)}</div>
              <div>P:{nutrition.protein_g.toFixed(0)}</div>
              <div>C:{nutrition.carbs_g.toFixed(0)}</div>
              <div>F:{nutrition.fat_g.toFixed(0)}</div>
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-gray-700/50 hover:bg-gray-600/50 text-gray-200 rounded-lg font-medium transition"
            >
              Today
            </button>
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition text-gray-300"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition text-gray-300"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="text-sm font-medium text-gray-300 mb-2">Color Guide:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100"></div>
              <span className="text-gray-400">Under goal (&lt;90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100"></div>
              <span className="text-gray-400">Approaching (90-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100"></div>
              <span className="text-gray-400">Over goal (100%+)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
