"use client"

import React, { useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

interface DashboardLayoutProps {
  children: React.ReactNode
  userType: 'student' | 'instructor' | 'admin'
  showSidebar?: boolean
}

export function DashboardLayout({ children, userType, showSidebar = true }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
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
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar userType={userType} />
          </div>
        )}
        
        {/* Mobile Sidebar Button */}
        {showSidebar && (
          <div className="lg:hidden fixed top-20 left-4 z-50">
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white dark:bg-gray-800 shadow-lg border-2"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 sm:max-w-[16rem]">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="h-full overflow-y-auto">
                  <Sidebar userType={userType} onLinkClick={() => setMobileSidebarOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
        
        <main className="flex-1 min-h-screen lg:ml-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


