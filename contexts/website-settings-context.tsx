"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

interface WebsiteSettings {
  site_name: string
  site_description: string
  site_logo: string
  contact_email: string
  contact_phone: string
  support_hours: string
  maintenance_mode: boolean
  maintenance_message: string
  enable_courses: boolean
  enable_books: boolean
  enable_forums: boolean
  enable_meetings: boolean
  enable_subscriptions: boolean
  enable_certificates: boolean
  enable_ratings: boolean
  currency: string
  currency_symbol: string
  [key: string]: any
}

interface WebsiteSettingsContextType {
  settings: WebsiteSettings | null
  loading: boolean
  refreshSettings: () => Promise<void>
  isFeatureEnabled: (feature: string) => boolean
  isMaintenanceMode: () => boolean
}

const defaultSettings: WebsiteSettings = {
  site_name: 'EduHub',
  site_description: 'Your gateway to world-class education',
  site_logo: '',
  contact_email: 'support@eduhub.com',
  contact_phone: '+1 (555) 123-4567',
  support_hours: 'Mon-Fri, 9AM-6PM EST',
  maintenance_mode: false,
  maintenance_message: 'We are currently performing maintenance. Please check back soon.',
  enable_courses: true,
  enable_books: true,
  enable_forums: true,
  enable_meetings: true,
  enable_subscriptions: true,
  enable_certificates: true,
  enable_ratings: true,
  currency: 'USD',
  currency_symbol: '$'
}

const WebsiteSettingsContext = createContext<WebsiteSettingsContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
  isFeatureEnabled: () => true,
  isMaintenanceMode: () => false
})

export function WebsiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      // Use absolute URL to avoid locale prefix issues
      const apiUrl = `${window.location.origin}/api/settings/website?public=true`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
      const data = await response.json()
      
      if (data.settings) {
        const websiteSettings = { ...defaultSettings, ...data.settings } as WebsiteSettings
        setSettings(websiteSettings)
      } else {
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error("Error fetching website settings:", error)
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }

  const isFeatureEnabled = (feature: string): boolean => {
    if (!settings) return true // Default to enabled if settings not loaded
    const featureKey = `enable_${feature}` as keyof WebsiteSettings
    return settings[featureKey] !== false
  }

  const isMaintenanceMode = (): boolean => {
    if (!settings) return false
    return settings.maintenance_mode === true
  }

  useEffect(() => {
    refreshSettings()

    // Listen for website settings updates
    const handleSettingsUpdate = () => {
      refreshSettings()
    }

    window.addEventListener('websiteSettingsUpdated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('websiteSettingsUpdated', handleSettingsUpdate)
    }
  }, [])

  return (
    <WebsiteSettingsContext.Provider value={{ settings, loading, refreshSettings, isFeatureEnabled, isMaintenanceMode }}>
      {children}
    </WebsiteSettingsContext.Provider>
  )
}

export function useWebsiteSettings() {
  const context = useContext(WebsiteSettingsContext)
  if (!context) {
    throw new Error('useWebsiteSettings must be used within WebsiteSettingsProvider')
  }
  return context
}






