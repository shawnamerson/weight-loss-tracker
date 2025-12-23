'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface CalorieLog {
  log_date: string
  total_calories: number
}

interface WorkoutLog {
  log_date: string
  calories_burned: number | null
}

interface CalorieDeficitTrackerProps {
  calorieLogs: CalorieLog[]
  workoutLogs: WorkoutLog[]
  dailyTarget: number
}

export default function CalorieDeficitTracker({ calorieLogs, workoutLogs, dailyTarget }: CalorieDeficitTrackerProps) {
  // Get last 30 days of dates
  const today = new Date()
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  // Create maps for quick lookup
  const calorieMap = new Map(
    calorieLogs.map(log => [log.log_date, log.total_calories])
  )

  // Aggregate workout calories by date
  const workoutMap = new Map<string, number>()
  workoutLogs.forEach(log => {
    const existing = workoutMap.get(log.log_date) || 0
    workoutMap.set(log.log_date, existing + (log.calories_burned || 0))
  })

  // Calculate net calories for each day
  const chartData = last30Days.map(date => {
    const consumed = calorieMap.get(date) || 0
    const burned = workoutMap.get(date) || 0
    const netCalories = consumed - burned
    const deficit = dailyTarget - netCalories

    return {
      date,
      consumed,
      burned,
      netCalories,
      deficit,
    }
  })

  const data = {
    labels: chartData.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Net Calories (Consumed - Burned)',
        data: chartData.map(d => d.netCalories),
        borderColor: 'rgb(96, 165, 250)',
        backgroundColor: 'rgba(96, 165, 250, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(96, 165, 250)',
        pointBorderColor: 'rgb(30, 64, 175)',
        pointBorderWidth: 2,
      },
      {
        label: 'Daily Target',
        data: chartData.map(() => dailyTarget),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#f3f4f6',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(0) + ' cal'
            }
            return label
          },
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex
            const consumed = chartData[dataIndex].consumed
            const burned = chartData[dataIndex].burned
            const deficit = chartData[dataIndex].deficit

            return [
              `Consumed: ${consumed} cal`,
              `Burned: ${burned} cal`,
              deficit > 0 ? `Deficit: ${deficit} cal ✓` : `Surplus: ${Math.abs(deficit)} cal`
            ]
          }
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return value + ' cal'
          },
        },
      },
    },
  }

  // Calculate statistics
  const logsWithData = chartData.filter(d => d.consumed > 0)
  const totalDeficit = chartData.reduce((sum, d) => sum + (d.deficit > 0 ? d.deficit : 0), 0)
  const daysInDeficit = chartData.filter(d => d.deficit > 0 && d.consumed > 0).length
  const avgNetCalories = logsWithData.length > 0
    ? logsWithData.reduce((sum, d) => sum + d.netCalories, 0) / logsWithData.length
    : 0

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Calorie Deficit Tracker</h3>
            <p className="text-sm text-gray-400">Net calories after exercise (last 30 days)</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${avgNetCalories <= dailyTarget ? 'text-green-400' : 'text-red-400'}`}>
              {avgNetCalories > 0 ? avgNetCalories.toFixed(0) : '0'}
            </div>
            <div className="text-xs text-gray-400">Avg. net/day</div>
          </div>
        </div>

        <div style={{ height: '300px' }}>
          <Line data={data} options={options} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {logsWithData.length}
            </div>
            <div className="text-xs text-gray-400">Days Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">
              {daysInDeficit}
            </div>
            <div className="text-xs text-gray-400">Days in Deficit</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">
              {totalDeficit.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Total Deficit</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${avgNetCalories <= dailyTarget ? 'text-green-400' : 'text-red-400'}`}>
              {avgNetCalories > 0
                ? (avgNetCalories <= dailyTarget ? '-' : '+') + Math.abs(avgNetCalories - dailyTarget).toFixed(0)
                : '0'
              }
            </div>
            <div className="text-xs text-gray-400">Avg. vs Target</div>
          </div>
        </div>
      </div>
    </div>
  )
}
