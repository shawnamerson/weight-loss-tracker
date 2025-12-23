'use client'

import { useState } from 'react'

interface DayMeals {
  dayNumber: number
  date: string
  mealCount: number
  totalCalories: number
}

interface MealPlanCalendarProps {
  dayMeals: DayMeals[]
  startDate: string
  endDate: string
  selectedDay: number
  onDaySelect: (dayNumber: number) => void
}

export default function MealPlanCalendar({ dayMeals, startDate, endDate, selectedDay, onDaySelect }: MealPlanCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const start = new Date(startDate)
    return new Date(start.getFullYear(), start.getMonth(), 1)
  })

  // Create a map for quick lookup
  const mealsMap = new Map(dayMeals.map(d => [d.date, d]))

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

  const goToStartDate = () => {
    const start = new Date(startDate)
    setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1))
  }

  const formatDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isInPlanRange = (dateStr: string) => {
    return dateStr >= startDate && dateStr <= endDate
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
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
    const dayMeal = mealsMap.get(dateStr)
    const inRange = isInPlanRange(dateStr)
    const isSelected = dayMeal?.dayNumber === selectedDay
    const today = isToday(day)

    calendarDays.push(
      <button
        key={day}
        onClick={() => dayMeal && onDaySelect(dayMeal.dayNumber)}
        disabled={!inRange || !dayMeal}
        className={`aspect-square p-2 rounded-lg transition relative border-2 ${
          isSelected
            ? 'border-primary-600 ring-2 ring-primary-200'
            : inRange && dayMeal
            ? 'border-transparent hover:border-gray-300 bg-blue-50'
            : 'border-transparent bg-gray-50 opacity-50'
        } ${!inRange || !dayMeal ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex flex-col h-full justify-between">
          <div className={`text-xs font-semibold ${today ? 'text-primary-600' : inRange ? 'text-gray-900' : 'text-gray-400'}`}>
            {day}
            {today && <span className="ml-1">•</span>}
          </div>
          {dayMeal && (
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold text-blue-700">
                D{dayMeal.dayNumber}
              </div>
              <div className="text-[10px] font-semibold text-green-700">
                {dayMeal.totalCalories}
              </div>
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
            onClick={goToStartDate}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            Plan Start
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
        <div className="text-sm font-medium text-gray-700 mb-2">Legend:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-50 border-2 border-primary-600"></div>
            <span className="text-gray-600">Selected day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-50"></div>
            <span className="text-gray-600">Planned day</span>
          </div>
        </div>
      </div>
    </div>
  )
}
