"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Link, useRouter, usePathname } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { useState } from "react"
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"

export function SignUpClient() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const pathname = usePathname()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "student"
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError(t('passwordTooShort'))
      setIsLoading(false)
      return
    }

    if (!agreedToTerms) {
      setError(t('pleaseAgreeToTerms'))
      setIsLoading(false)
      return
    }

    try {
      // Get the current URL to construct the redirect URL for email verification
      // Preserve locale in redirect URL
      const localePrefix = locale !== 'en' ? `/${locale}` : ''
      const redirectUrl = `${window.location.origin}${localePrefix}/auth/pending-approval`
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
            role: formData.role
          }
        }
      })

      if (error) {
        console.error('Sign-up error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('User creation failed - no user data returned')
      }

      // Set status based on role: students are auto-approved, instructors need approval
      const userStatus = formData.role === 'instructor' ? 'pending' : 'approved'
      
      // The database trigger creates the profile automatically with full_name from metadata
      // Wait a moment for trigger to complete, then update status via API (bypasses RLS)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update profile status via API endpoint (uses service role to bypass RLS)
      // The trigger already set full_name from metadata, we just need to ensure status is correct
      try {
        // Use absolute URL to ensure it works correctly with all locales
        const apiUrl = `${window.location.origin}/api/auth/update-profile`
        const updateResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            fullName: formData.fullName, // Update in case metadata didn't include it
            role: formData.role, // Pass role in case profile needs to be created
            status: userStatus
          })
        })

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json()
          console.error('Profile update error:', updateError)
          // Don't block signup - trigger already created profile
        }
      } catch (err) {
        console.error('Failed to update profile:', err)
        // Don't block signup - trigger already created profile
      }

        // Only notify admin for instructor registrations
        if (formData.role === 'instructor') {
          try {
            await fetch('/api/admin/notify-new-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: formData.email,
                fullName: formData.fullName,
                role: formData.role
              })
            })
          } catch (err) {
            console.error('Failed to notify admin:', err)
          }
        }

        // Redirect based on status
        if (userStatus === 'pending') {
          router.push("/auth/pending-approval")
        } else {
          // Students are auto-approved, redirect to success page
          router.push("/auth/sign-up-success")
        }
      }
    } catch (error: unknown) {
      console.error('Sign-up error details:', error)
      const errorMessage = error instanceof Error ? error.message : t('anErrorOccurred')
      setError(errorMessage)
      console.error('Error message set:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const passwordRequirements = [
    { text: t('atLeast6Chars'), met: formData.password.length >= 6 },
    { text: t('containsLettersNumbers'), met: /[a-zA-Z]/.test(formData.password) && /[0-9]/.test(formData.password) },
    { text: t('passwordsMatch'), met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 }
  ]

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
            {t('joinEduHub')}
          </h1>
          <p className="text-muted-foreground">{t('startLearningJourney')}</p>
        </div>

        {/* Form Card */}
        <div className="glass-effect rounded-2xl p-8 space-y-6 border-2 border-primary/10">
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold">
                {t('fullName')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="pl-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold">
                {t('iWantTo')}
              </Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11">
                  <SelectValue placeholder={t('selectYourRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t('learnFromCourses')}</SelectItem>
                  <SelectItem value="instructor">{t('teachAndCreate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                {t('password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-secondary hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                {t('confirmPassword')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 pr-10 bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-secondary hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('passwordRequirements')}
                </Label>
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <CheckCircle className={`w-3 h-3 ${req.met ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms Agreement */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('agreeToTermsSignup')}
              </Label>
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
              disabled={isLoading || !agreedToTerms}
              className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 glow-primary text-primary-foreground font-semibold group"
            >
              {isLoading ? (
                t('creatingAccount')
              ) : (
                <>
                  {t('createAccount')}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">{t('alreadyHaveAccount')}</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="w-full h-11 border-2 border-primary/30 hover:bg-primary/5 bg-transparent"
            >
              {t('alreadyHaveAccountSignIn')}
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('agreeToTermsCreate')}
        </p>
        </div>
      </div>
    </div>
  )
}

