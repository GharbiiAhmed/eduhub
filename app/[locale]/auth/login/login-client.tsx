"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { useState } from "react"
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react"
import { Chrome } from "lucide-react"
import { Navigation } from "@/components/navigation"

export function LoginClient() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Fetch user profile to get role and status
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', data.user.id)
          .single()

        // Check if profile exists (user was deleted)
        // ProfileError with code PGRST116 means no rows returned (profile doesn't exist)
        if (!profile || profileError) {
          // Sign out immediately to clear the session
          await supabase.auth.signOut()
          setError("Your account has been deleted. Please contact support if you believe this is an error.")
          setIsLoading(false)
          return
        }

        // Check if user is approved
        if (profile.status === 'pending') {
          setError("Your account is pending approval. Please wait for admin approval before logging in.")
          setIsLoading(false)
          return
        }

        if (profile.status === 'banned' || profile.status === 'inactive') {
          await supabase.auth.signOut()
          setError("Your account has been deactivated. Please contact support.")
          setIsLoading(false)
          return
        }

        // Check for new device login
        try {
          const deviceKey = `device_${data.user.id}`
          const knownDevices = JSON.parse(localStorage.getItem(deviceKey) || '[]')
          const deviceInfo = navigator.userAgent
          const deviceFingerprint = `${deviceInfo}_${navigator.language}_${screen.width}x${screen.height}`
          
          const isNewDevice = !knownDevices.includes(deviceFingerprint)
          
          if (isNewDevice) {
            // Add to known devices
            knownDevices.push(deviceFingerprint)
            localStorage.setItem(deviceKey, JSON.stringify(knownDevices))
            
            // Get location (simplified - in production use IP geolocation)
            const location = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'
            
            // Send new device login email
            await fetch('/api/auth/new-device-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceInfo: `${navigator.platform} - ${navigator.userAgent.substring(0, 100)}`,
                location: location
              })
            }).catch(err => console.error('Failed to send new device login email:', err))
          }
        } catch (deviceError) {
          console.error('Error checking for new device:', deviceError)
          // Don't fail login if device detection fails
        }

        // Redirect based on role - router from @/i18n/routing handles locale automatically
        if (profile.role === 'admin') {
          router.push('/admin/dashboard')
        } else if (profile.role === 'instructor') {
          router.push('/instructor/dashboard')
        } else {
          router.push('/student/courses')
        }
      } else {
        // Fallback to dashboard if role not found
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('anErrorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const supabase = createClient()
    setIsGoogleLoading(true)
    setError(null)

    try {
      const localePrefix = locale !== 'en' ? `/${locale}` : ''
      const redirectUrl = `${window.location.origin}${localePrefix}/api/auth/callback?next=${encodeURIComponent('/dashboard')}`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('anErrorOccurred'))
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {t('welcomeBack')}
          </h1>
          <p className="text-muted-foreground">{t('signInToContinue')}</p>
        </div>

        {/* Form Card */}
        <div className="glass-effect rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 border-2 border-primary/10">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                {t('emailAddress')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">
                  {t('password')}
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 glow-primary text-primary-foreground font-semibold group"
            >
              {isLoading ? (
                t('signingIn')
              ) : (
                <>
                  {t('signIn')}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-11 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium"
          >
            {isGoogleLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('signingIn')}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Chrome className="w-5 h-5 mr-2" />
                {t('signInWithGoogle')}
              </div>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">{t('newToEduHub')}</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link href="/auth/sign-up">
            <Button
              variant="outline"
              className="w-full h-11 border-2 border-primary/30 hover:bg-primary/5 bg-transparent"
            >
              {t('createNewAccount')}
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('agreeToTerms')}
        </p>
        </div>
      </div>
    </div>
  )
}

