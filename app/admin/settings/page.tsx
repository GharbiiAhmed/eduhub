"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe,
  Save,
  Mail,
  CreditCard,
  Database,
  Server,
  Eye,
  EyeOff,
  CheckCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSettings } from "@/contexts/settings-context"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const supabase = createClient()
  const { applyTheme } = useSettings()

  // Profile data
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    bio: '',
    avatar_url: '',
    phone: '',
    location: '',
    website: ''
  })

  // User settings
  const [userSettings, setUserSettings] = useState({
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
  })

  // Website settings
  const [websiteSettings, setWebsiteSettings] = useState<Record<string, any>>({})

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'website', label: 'Website Settings', icon: Globe }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profile) {
        setProfileData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          phone: '',
          location: '',
          website: ''
        })
      }

      // Fetch user settings
      const userSettingsResponse = await fetch("/api/settings/user")
      const userSettingsData = await userSettingsResponse.json()
      if (userSettingsData.settings) {
        setUserSettings(prev => ({ ...prev, ...userSettingsData.settings }))
        
        // Load additional profile fields from user_settings
        setProfileData(prev => ({
          ...prev,
          phone: userSettingsData.settings.phone || '',
          location: userSettingsData.settings.location || '',
          website: userSettingsData.settings.website || ''
        }))
      }

      // Fetch website settings
      const websiteSettingsResponse = await fetch("/api/settings/website")
      const websiteSettingsData = await websiteSettingsResponse.json()
      if (websiteSettingsData.settings) {
        setWebsiteSettings(websiteSettingsData.settings)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load settings.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Not authenticated")
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      const settingsResponse = await fetch("/api/settings/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userSettings,
          phone: profileData.phone,
          location: profileData.location,
          website: profileData.website,
        }),
      })

      const settingsData = await settingsResponse.json()
      if (settingsData.error) {
        throw new Error(settingsData.error)
      }

      // Refresh data from database to ensure UI is in sync
      await fetchData()

      // Apply theme immediately if it changed
      if (userSettings.theme) {
        const theme = userSettings.theme as 'light' | 'dark' | 'system'
        if (theme === 'light' || theme === 'dark' || theme === 'system') {
          applyTheme(theme)
        }
      }

      // Trigger settings update event for context
      window.dispatchEvent(new Event('settingsUpdated'))

      toast({
        title: "Success",
        description: "Settings saved successfully.",
      })
    } catch (error: any) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWebsite = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: websiteSettings }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      // Refresh website settings from database
      const websiteSettingsResponse = await fetch("/api/settings/website")
      const websiteSettingsData = await websiteSettingsResponse.json()
      if (websiteSettingsData.settings) {
        setWebsiteSettings(websiteSettingsData.settings)
      }

      // Trigger settings update events for contexts
      window.dispatchEvent(new Event('settingsUpdated'))
      window.dispatchEvent(new Event('websiteSettingsUpdated'))

      toast({
        title: "Success",
        description: "Website settings saved successfully.",
      })
    } catch (error: any) {
      console.error("Error saving website settings:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save website settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (activeTab === 'website') {
      handleSaveWebsite()
    } else {
      handleSaveProfile()
    }
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-6">
        <Avatar className="w-24 h-24">
          <AvatarImage src={profileData.avatar_url} />
          <AvatarFallback className="text-2xl">
            {profileData.full_name?.charAt(0) || 'A'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">Profile Picture</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload a new profile picture
          </p>
          <Button variant="outline" size="sm" className="mt-2">
            Upload Photo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={profileData.full_name}
            onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            disabled
            className="bg-gray-100 dark:bg-gray-800"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={profileData.phone}
            onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={profileData.location}
            onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={profileData.website}
            onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={4}
          value={profileData.bio}
          onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="Tell us about yourself..."
        />
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      {Object.entries(userSettings)
        .filter(([key]) => key.includes('notification') || key.includes('email') || key.includes('message') || key.includes('reminder') || key.includes('digest') || key.includes('alert') || key.includes('marketing') || key.includes('forum') || key.includes('meeting'))
        .map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium capitalize">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
            </div>
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked) => 
                setUserSettings(prev => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}
    </div>
  )

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div>
        <Label>Profile Visibility</Label>
        <Select
          value={userSettings.profile_visibility}
          onValueChange={(value) => 
            setUserSettings(prev => ({ ...prev, profile_visibility: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Everyone</SelectItem>
            <SelectItem value="instructors">Instructors Only</SelectItem>
            <SelectItem value="students">Students Only</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {Object.entries(userSettings)
          .filter(([key]) => key.startsWith('show_') || key === 'allow_messages' || key === 'data_sharing')
          .map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium capitalize">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
              </div>
              <Switch
                checked={value as boolean}
                onCheckedChange={(checked) => 
                  setUserSettings(prev => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
      </div>
    </div>
  )

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Language</Label>
          <Select
            value={userSettings.language}
            onValueChange={(value) => 
              setUserSettings(prev => ({ ...prev, language: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Timezone</Label>
          <Select
            value={userSettings.timezone}
            onValueChange={(value) => 
              setUserSettings(prev => ({ ...prev, timezone: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Theme</Label>
          <Select
            value={userSettings.theme}
            onValueChange={(value) => 
              setUserSettings(prev => ({ ...prev, theme: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderWebsiteTab = () => {
    const categories = {
      general: ['site_name', 'site_description', 'site_logo', 'contact_email', 'contact_phone', 'support_hours'],
      email: ['email_from_name', 'email_from_address', 'email_smtp_host', 'email_smtp_port', 'email_smtp_user', 'email_smtp_password'],
      payment: ['stripe_publishable_key', 'stripe_secret_key', 'currency', 'currency_symbol'],
      features: ['enable_courses', 'enable_books', 'enable_forums', 'enable_meetings', 'enable_subscriptions', 'enable_certificates', 'enable_ratings'],
      seo: ['meta_title', 'meta_description', 'meta_keywords'],
      social: ['facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url', 'youtube_url'],
      maintenance: ['maintenance_mode', 'maintenance_message']
    }

    const isSecretKey = (key: string) => key.includes('password') || key.includes('secret') || key.includes('key')

    return (
      <div className="space-y-8">
        {Object.entries(categories).map(([category, keys]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category} Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {keys.map((key) => {
                const value = websiteSettings[key]
                const isBoolean = typeof value === 'boolean'
                const isSecret = isSecretKey(key)

                return (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    {isBoolean ? (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {key === 'maintenance_mode' && 'Enable maintenance mode'}
                          {key === 'enable_courses' && 'Enable courses feature'}
                          {key === 'enable_books' && 'Enable books feature'}
                          {key === 'enable_forums' && 'Enable forums feature'}
                          {key === 'enable_meetings' && 'Enable meetings feature'}
                          {key === 'enable_subscriptions' && 'Enable subscriptions'}
                          {key === 'enable_certificates' && 'Enable certificates'}
                          {key === 'enable_ratings' && 'Enable course ratings'}
                        </p>
                        <Switch
                          checked={value || false}
                          onCheckedChange={(checked) => 
                            setWebsiteSettings(prev => ({ ...prev, [key]: checked }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type={isSecret && !showSecrets[key] ? "password" : "text"}
                          value={value || ''}
                          onChange={(e) => 
                            setWebsiteSettings(prev => ({ ...prev, [key]: e.target.value }))
                          }
                          className={isSecret ? "pr-10" : ""}
                        />
                        {isSecret && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))}
                          >
                            {showSecrets[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account and website settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                {tabs.find(tab => tab.id === activeTab)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'notifications' && renderNotificationsTab()}
              {activeTab === 'privacy' && renderPrivacyTab()}
              {activeTab === 'preferences' && renderPreferencesTab()}
              {activeTab === 'website' && renderWebsiteTab()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
