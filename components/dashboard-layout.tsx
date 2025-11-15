"use client"

import React from 'react'
import { Navigation } from '@/components/navigation'
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  userType: 'student' | 'instructor' | 'admin'
  showSidebar?: boolean
}

export function DashboardLayout({ children, userType, showSidebar = true }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          window.location.href = '/auth/login'
          return
        }
        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Error getting user:', error)
        window.location.href = '/auth/login'
      }
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation userType={userType} user={user} />
      
      <div className="flex">
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar userType={userType} />
          </div>
        )}
        
        <main className="flex-1 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


