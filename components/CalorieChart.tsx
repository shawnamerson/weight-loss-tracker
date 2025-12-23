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

interface CalorieChartProps {
  calorieLogs: CalorieLog[]
  dailyTarget: number
}

export default function CalorieChart({ calorieLogs, dailyTarget }: CalorieChartProps) {
  if (!calorieLogs || calorieLogs.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
        <div className="relative z-10">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">No Calorie Data Yet</h3>
          <p className="text-gray-400 mb-4">
            Start logging your meals to see your daily calorie intake
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

  // Create a map of calories by date
  const calorieMap = new Map(
    calorieLogs.map(log => [log.log_date, log.total_calories])
  )

  // Fill in data for all 30 days (0 if no data)
  const chartData = last30Days.map(date => ({
    date,
    calories: calorieMap.get(date) || 0,
  }))

  const data = {
    labels: chartData.map(d => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    datasets: [
      {
        label: 'Calories Consumed',
        data: chartData.map(d => d.calories),
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
        borderColor: 'rgb(74, 222, 128)',
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

  // Calculate average calories
  const logsWithData = chartData.filter(d => d.calories > 0)
  const avgCalories = logsWithData.length > 0
    ? logsWithData.reduce((sum, d) => sum + d.calories, 0) / logsWithData.length
    : 0

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Daily Calorie Intake</h3>
            <p className="text-sm text-gray-400">Last 30 days</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">
              {avgCalories.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Avg. per day</div>
          </div>
        </div>

        <div style={{ height: '300px' }}>
          <Line data={data} options={options} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {logsWithData.length}
            </div>
            <div className="text-xs text-gray-400">Days Logged</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">
              {dailyTarget}
            </div>
            <div className="text-xs text-gray-400">Daily Target</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${avgCalories <= dailyTarget ? 'text-green-400' : 'text-red-400'}`}>
              {avgCalories > 0 ? (avgCalories - dailyTarget > 0 ? '+' : '') + (avgCalories - dailyTarget).toFixed(0) : '0'}
            </div>
            <div className="text-xs text-gray-400">Avg. vs Target</div>
          </div>
        </div>
      </div>
    </div>
  )
}
