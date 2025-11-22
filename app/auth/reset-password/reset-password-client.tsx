"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Lock, ArrowRight, Sparkles, Eye, EyeOff, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we have a valid session (from the email link)
    const checkSession = async () => {
      const supabase = createClient()
      
      // Check for hash fragments in URL (Supabase redirects with #access_token=...&type=recovery)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      const accessToken = hashParams.get('access_token')
      
      // Also check query parameters
      const token = searchParams.get('token') || accessToken
      
      if (type === 'recovery' || token) {
        // Supabase has redirected here with a recovery token
        // Supabase automatically processes hash fragments, but we need to wait a bit
        // Try multiple times to ensure session is established
        let attempts = 0
        const maxAttempts = 5
        
        const checkSessionWithRetry = async () => {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (session) {
            setIsValidating(false)
            return
          }
          
          attempts++
          if (attempts < maxAttempts) {
            // Wait a bit longer each time
            setTimeout(checkSessionWithRetry, 500 * attempts)
          } else {
            // If we still don't have a session, try to exchange the token manually
            if (accessToken) {
              try {
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: hashParams.get('refresh_token') || ''
                })
                
                if (data.session) {
                  setIsValidating(false)
                  return
                }
              } catch (err) {
                console.error('Error setting session:', err)
              }
            }
            
            setError("Invalid or expired reset link. Please request a new password reset.")
            setIsValidating(false)
          }
        }
        
        // Start checking after a short delay to let Supabase process the hash
        setTimeout(checkSessionWithRetry, 300)
      } else {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setError("Invalid or expired reset link. Please request a new password reset.")
          setIsValidating(false)
          return
        }
        
        setIsValidating(false)
      }
    }

    checkSession()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isValidating) return

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      // Verify we have a session before attempting to update
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError("Auth session missing! Please use the link from your email to reset your password.")
        setIsLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      // Send password changed email notification
      try {
        await fetch('/api/auth/password-changed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Failed to send password changed email:', err))
      } catch (emailError) {
        console.error('Error sending password changed email:', emailError)
        // Don't fail the password reset if email fails
      }

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const passwordRequirements = [
    { text: "At least 6 characters", met: password.length >= 6 },
    { text: "Passwords match", met: password === confirmPassword && confirmPassword.length > 0 }
  ]

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Validating reset link...</p>
          </div>
        </div>
      </div>
    )
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
              Set New Password
            </h1>
            <p className="text-muted-foreground">Enter your new password below</p>
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
                    Password Updated!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your password has been successfully reset. Redirecting to login...
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button className="w-full mt-4">
                    Go to Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                {password && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Password Requirements:
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

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || password.length < 6 || password !== confirmPassword}
                  className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 glow-primary text-primary-foreground font-semibold group"
                >
                  {isLoading ? (
                    "Updating Password..."
                  ) : (
                    <>
                      Update Password
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResetPasswordClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

