"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface UserDistributionData {
  role: string
  count: number
  percentage: number
}

interface UserDistributionChartProps {
  data: UserDistributionData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export function UserDistributionChart({ data }: UserDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
        <XAxis 
          dataKey="role" 
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
          formatter={(value: number, name: string) => {
            if (name === 'count') return [value, 'Users']
            if (name === 'percentage') return [`${value}%`, 'Percentage']
            return [value, name]
          }}
        />
        <Bar 
          dataKey="count" 
          radius={[8, 8, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

