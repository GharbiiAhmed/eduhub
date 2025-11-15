"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { useTranslations } from 'next-intl'

interface MonthlyEarningsData {
  month: string
  year: number
  earnings: number
  students: number
}

interface MonthlyEarningsChartProps {
  data: MonthlyEarningsData[]
}

export function MonthlyEarningsChart({ data }: MonthlyEarningsChartProps) {
  const t = useTranslations('dashboard')
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
        <XAxis 
          dataKey="month" 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, t('earnings')]}
        />
        <Area 
          type="monotone" 
          dataKey="earnings" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorEarnings)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

