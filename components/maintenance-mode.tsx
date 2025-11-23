"use client"

import { useEffect, useState } from 'react'
import { useWebsiteSettings } from '@/contexts/website-settings-context'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Wrench } from 'lucide-react'

export function MaintenanceMode() {
  const { settings, loading, isMaintenanceMode } = useWebsiteSettings()
  const pathname = usePathname()
  const [showMaintenance, setShowMaintenance] = useState(false)

  useEffect(() => {
    if (!loading && isMaintenanceMode()) {
      // Allow admins to access admin pages even during maintenance
      const isAdminPage = pathname?.startsWith('/admin')
      if (!isAdminPage) {
        setShowMaintenance(true)
      }
    } else {
      setShowMaintenance(false)
    }
  }, [loading, isMaintenanceMode, pathname])

  if (!showMaintenance || !settings) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                {settings.site_name || 'EduHub'} is currently under maintenance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {settings.maintenance_message || 'We are currently performing maintenance. Please check back soon.'}
            </p>
          </div>
          {settings.support_hours && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Support Hours: {settings.support_hours}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}




































