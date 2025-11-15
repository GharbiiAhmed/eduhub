"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface CourseRevenueData {
  id: string
  title: string
  revenue: number
  enrollments: number
}

interface CourseRevenueChartProps {
  data: CourseRevenueData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function CourseRevenueChart({ data }: CourseRevenueChartProps) {
  // Sort by revenue and take top 5
  const sortedData = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  
  // Truncate long course titles
  const chartData = sortedData.map(course => ({
    ...course,
    title: course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={chartData} 
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
        <XAxis 
          type="number"
          className="text-xs"
          tick={{ fill: 'currentColor' }}
          tickFormatter={(value) => `$${value}`}
        />
        <YAxis 
          type="category" 
          dataKey="title"
          className="text-xs"
          tick={{ fill: 'currentColor' }}
          width={100}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
          formatter={(value: number, name: string) => {
            if (name === 'revenue') return [`$${value.toLocaleString()}`, 'Revenue']
            if (name === 'enrollments') return [value, 'Enrollments']
            return [value, name]
          }}
        />
        <Bar 
          dataKey="revenue" 
          radius={[0, 8, 8, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

