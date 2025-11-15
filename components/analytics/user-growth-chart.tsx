"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useTranslations } from 'next-intl'

interface MonthlyData {
  month: string
  year: number
  users: number
  courses: number
  revenue: number
}

interface UserGrowthChartProps {
  data: MonthlyData[]
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const t = useTranslations('dashboard')
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="users" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name={t('newUsers')}
          dot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="courses" 
          stroke="#10b981" 
          strokeWidth={2}
          name={t('newCourses')}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

