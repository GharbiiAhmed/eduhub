"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserSettings {
  email_notifications: boolean
  push_notifications: boolean
  course_updates: boolean
  new_messages: boolean
  marketing_emails: boolean
  weekly_digest: boolean
  achievement_alerts: boolean
  reminder_emails: boolean
  meeting_reminders: boolean
  forum_notifications: boolean
  profile_visibility: string
  show_email: boolean
  show_phone: boolean
  show_location: boolean
  allow_messages: boolean
  show_progress: boolean
  show_certificates: boolean
  data_sharing: boolean
  language: string
  timezone: string
  theme: 'light' | 'dark' | 'system'
}

interface SettingsContextType {
  settings: UserSettings | null
  loading: boolean
  refreshSettings: () => Promise<void>
  applyTheme: (theme: 'light' | 'dark' | 'system') => void
}

const defaultSettings: UserSettings = {
  email_notifications: true,
  push_notifications: true,
  course_updates: true,
  new_messages: true,
  marketing_emails: false,
  weekly_digest: true,
  achievement_alerts: true,
  reminder_emails: true,
  meeting_reminders: true,
  forum_notifications: true,
  profile_visibility: 'public',
  show_email: false,
  show_phone: false,
  show_location: true,
  allow_messages: true,
  show_progress: true,
  show_certificates: true,
  data_sharing: false,
  language: 'en',
  timezone: 'UTC',
  theme: 'system'
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
  applyTheme: () => {}
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const html = document.documentElement
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        html.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        html.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    } else if (theme === 'dark') {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const refreshSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSettings(defaultSettings)
        setLoading(false)
        return
      }

      // Use absolute URL to avoid locale prefix issues
      const apiUrl = `${window.location.origin}/api/settings/user`
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
        const userSettings = { ...defaultSettings, ...data.settings } as UserSettings
        setSettings(userSettings)
        
        // Apply theme immediately
        if (userSettings.theme) {
          applyTheme(userSettings.theme)
        }
      } else {
        setSettings(defaultSettings)
        applyTheme('system')
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      setSettings(defaultSettings)
      applyTheme('system')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()

    // Listen for theme changes from settings page
    const handleSettingsUpdate = () => {
      refreshSettings()
    }

    window.addEventListener('settingsUpdated', handleSettingsUpdate)
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (settings?.theme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate)
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [settings?.theme])

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, applyTheme }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}

