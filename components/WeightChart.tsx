'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'

type WeightLog = {
  id: string
  weight_kg: number
  log_date: string
  mood?: string | null
}

type WeightChartProps = {
  weightLogs: WeightLog[]
  goalWeightKg?: number | null
  unit?: 'kg' | 'lbs'
}

export default function WeightChart({ weightLogs, goalWeightKg, unit = 'lbs' }: WeightChartProps) {
  // Conversion helper
  const kgToLbs = (kg: number) => kg * 2.20462

  // Format data for chart
  const chartData = weightLogs.map(log => ({
    date: format(parseISO(log.log_date + 'T12:00:00'), 'MMM dd'),
    weight: unit === 'lbs' ? kgToLbs(log.weight_kg) : log.weight_kg,
    displayWeight: unit === 'lbs'
      ? `${kgToLbs(log.weight_kg).toFixed(1)} lbs`
      : `${log.weight_kg.toFixed(1)} kg`,
  }))

  const goalWeight = goalWeightKg
    ? (unit === 'lbs' ? kgToLbs(goalWeightKg) : goalWeightKg)
    : undefined

  // If no data
  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-4 text-white">Weight Progress</h3>
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No weight data yet</p>
            <p className="text-sm">Start logging your weight to see your progress here!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-2xl"></div>
      <div className="relative z-10">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '12px', fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px', fill: '#9ca3af' }}
              domain={['dataMin - 5', 'dataMax + 5']}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#9ca3af' } }}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '12px',
                color: '#fff'
              }}
              formatter={(value: any) => [`${value.toFixed(1)} ${unit}`, 'Weight']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />

            {/* Goal line */}
            {goalWeight && (
              <ReferenceLine
                y={goalWeight}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: `Goal: ${goalWeight.toFixed(1)} ${unit}`, position: 'right', fill: '#10b981', fontSize: 12 }}
              />
            )}

            {/* Weight line */}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={{ fill: '#60a5fa', r: 5, strokeWidth: 2, stroke: '#1e40af' }}
              activeDot={{ r: 7, fill: '#3b82f6' }}
              name="Weight"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary stats below chart */}
        {weightLogs.length > 1 && (
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Starting</p>
              <p className="font-semibold text-white">
                {unit === 'lbs'
                  ? `${kgToLbs(weightLogs[0].weight_kg).toFixed(1)} lbs`
                  : `${weightLogs[0].weight_kg.toFixed(1)} kg`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Current</p>
              <p className="font-semibold text-white">
                {unit === 'lbs'
                  ? `${kgToLbs(weightLogs[weightLogs.length - 1].weight_kg).toFixed(1)} lbs`
                  : `${weightLogs[weightLogs.length - 1].weight_kg.toFixed(1)} kg`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Change</p>
              <p className={`font-semibold ${
                weightLogs[weightLogs.length - 1].weight_kg < weightLogs[0].weight_kg
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {unit === 'lbs'
                  ? `${(kgToLbs(weightLogs[weightLogs.length - 1].weight_kg) - kgToLbs(weightLogs[0].weight_kg)).toFixed(1)} lbs`
                  : `${(weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg).toFixed(1)} kg`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
