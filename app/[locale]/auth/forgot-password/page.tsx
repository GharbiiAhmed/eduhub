"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useState } from "react"
import { Mail, ArrowLeft, Sparkles, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getTranslations } from 'next-intl/server'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Get the current URL to construct the redirect URL
      const redirectUrl = `${window.location.origin}/auth/reset-password`
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      setSuccess(true)
      setEmail("")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('anErrorOccurred'))
    } finally {
      setIsLoading(false)
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
              {t('resetPassword')}
            </h1>
            <p className="text-muted-foreground">
              {t('resetPasswordDesc')}
            </p>
          </div>

          {/* Form Card */}
          <div className="glass-effect rounded-2xl p-8 space-y-6 border-2 border-primary/10">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('checkYourEmail')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('resetLinkSent')} <strong>{email || t('email')}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('clickLinkToReset')}
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 glow-primary text-primary-foreground font-semibold"
                >
                  {isLoading ? t('sending') : t('sendResetLink')}
                </Button>
              </form>
            )}

            {/* Back to Login Link */}
            <div className="pt-4 border-t border-border/50">
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


















