"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { DollarSign } from "lucide-react"

interface RevenueBreakdownData {
  name: string
  value: number
  color: string
}

interface RevenueBreakdownChartProps {
  data: RevenueBreakdownData[]
  noRevenueText?: string
  revenueWillAppearText?: string
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

export function RevenueBreakdownChart({ 
  data, 
  noRevenueText = "No revenue generated yet",
  revenueWillAppearText = "Revenue will appear here once courses or books are sold"
}: RevenueBreakdownChartProps) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)
  
  // If all values are 0, show a message instead of an empty chart
  if (totalValue === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <DollarSign className="w-12 h-12 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">{noRevenueText}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{revenueWillAppearText}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
          formatter={(value: number) => `$${value.toLocaleString()}`}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

