"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface MonthlyEarningsData {
  month: string
  year: number
  earnings: number
  students: number
}

interface StudentGrowthChartProps {
  data: MonthlyEarningsData[]
}

export function StudentGrowthChart({ data }: StudentGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
        <XAxis 
          dataKey="month" 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [value, 'New Students']}
        />
        <Bar 
          dataKey="students" 
          fill="#3b82f6" 
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

