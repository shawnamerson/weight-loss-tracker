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

interface WorkoutLog {
  log_date: string
  calories_burned: number | null
  notes: string | null
}

interface ActivityChartProps {
  workoutLogs: WorkoutLog[]
}

// Helper function to extract steps from notes
const extractSteps = (notes: string | null): number => {
  if (!notes) return 0
  const match = notes.match(/Steps:\s*(\d+)/)
  return match ? parseInt(match[1]) : 0
}

// Helper function to extract distance from notes
const extractDistance = (notes: string | null): number => {
  if (!notes) return 0
  const match = notes.match(/Distance:\s*([\d.]+)\s*(miles|km)/)
  if (!match) return 0
  const distance = parseFloat(match[1])
  const unit = match[2]
  // Convert to miles if in km
  return unit === 'km' ? distance * 0.621371 : distance
}

export default function ActivityChart({ workoutLogs }: ActivityChartProps) {
  if (!workoutLogs || workoutLogs.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
        <div className="relative z-10">
          <div className="text-gray-400 text-6xl mb-4">🚶</div>
          <h3 className="text-xl font-bold text-white mb-2">No Activity Data Yet</h3>
          <p className="text-gray-400 mb-4">
            Start logging your activities to see your progress
          </p>
        </div>
      </div>
    )
  }

  // Get last 30 days of dates
  const today = new Date()
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  // Aggregate data by date
  const activityMap = new Map<string, { calories: number; steps: number; distance: number }>()
  workoutLogs.forEach(log => {
    const existing = activityMap.get(log.log_date) || { calories: 0, steps: 0, distance: 0 }
    activityMap.set(log.log_date, {
      calories: existing.calories + (log.calories_burned || 0),
      steps: existing.steps + extractSteps(log.notes),
      distance: existing.distance + extractDistance(log.notes),
    })
  })

  // Fill in data for all 30 days (0 if no data)
  const chartData = last30Days.map(date => ({
    date,
    calories: activityMap.get(date)?.calories || 0,
    steps: activityMap.get(date)?.steps || 0,
    distance: activityMap.get(date)?.distance || 0,
  }))

  const data = {
    labels: chartData.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Calories Burned',
        data: chartData.map(d => d.calories),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(251, 146, 60)',
        pointBorderColor: 'rgb(194, 65, 12)',
        pointBorderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Steps (÷100)',
        data: chartData.map(d => d.steps / 100),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: 'rgb(107, 33, 168)',
        pointBorderWidth: 2,
        yAxisID: 'y',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
              if (context.dataset.label === 'Steps (÷100)') {
                label += (context.parsed.y * 100).toFixed(0) + ' steps'
              } else {
                label += context.parsed.y.toFixed(0) + ' cal'
              }
            }
            return label
          },
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
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
    },
  }

  // Calculate statistics
  const logsWithData = chartData.filter(d => d.calories > 0 || d.steps > 0)
  const totalCalories = chartData.reduce((sum, d) => sum + d.calories, 0)
  const totalSteps = chartData.reduce((sum, d) => sum + d.steps, 0)
  const totalDistance = chartData.reduce((sum, d) => sum + d.distance, 0)
  const avgCalories = logsWithData.length > 0 ? totalCalories / logsWithData.length : 0

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Activity Tracking</h3>
            <p className="text-sm text-gray-400">Last 30 days</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-400">
              {avgCalories.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Avg. cal/day</div>
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
            <div className="text-xs text-gray-400">Days Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">
              {totalCalories.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Total Calories</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">
              {totalSteps >= 1000 ? (totalSteps / 1000).toFixed(1) + 'k' : totalSteps}
            </div>
            <div className="text-xs text-gray-400">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">
              {totalDistance.toFixed(1)}
            </div>
            <div className="text-xs text-gray-400">Total Miles</div>
          </div>
        </div>
      </div>
    </div>
  )
}
