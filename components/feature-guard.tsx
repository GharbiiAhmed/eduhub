"use client"

import { useWebsiteSettings } from '@/contexts/website-settings-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface FeatureGuardProps {
  feature: 'courses' | 'books' | 'forums' | 'meetings' | 'subscriptions' | 'certificates' | 'ratings'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGuard({ feature, children, fallback }: FeatureGuardProps) {
  const { isFeatureEnabled, loading } = useWebsiteSettings()

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!isFeatureEnabled(feature)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle>Feature Unavailable</CardTitle>
                <CardDescription>
                  This feature is currently disabled
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                The {feature} feature has been temporarily disabled. Please check back later or contact support for more information.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline">
                <Link href="/">Go Home</Link>
              </Button>
              <Button asChild>
                <Link href="/help">Contact Support</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}


















