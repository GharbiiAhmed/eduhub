"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"

export function SignUpClient() {
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
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy")
      setIsLoading(false)
      return
    }

    try {
      // Get the current URL to construct the redirect URL for email verification
      // This works for both localhost and deployed environments
      // Students are auto-approved, so redirect to success page after email verification
      // Instructors need approval, so redirect to pending-approval page
      const redirectPath = formData.role === 'instructor' 
        ? '/auth/pending-approval' 
        : '/auth/sign-up-success'
      const redirectUrl = `${window.location.origin}${redirectPath}`
      
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

      if (error) throw error

      if (data.user) {
      // Set status based on role: students are auto-approved, instructors need approval
      const userStatus = formData.role === 'instructor' ? 'pending' : 'approved'
      
      // Create/update profile immediately via API endpoint (uses service role to bypass RLS)
      // This ensures the profile is created even if the trigger fails or hasn't run yet
      // This is especially important for UTF-8 characters (French, Arabic, etc.)
      try {
        const requestBody = {
          userId: data.user.id,
          fullName: formData.fullName || '', // Ensure we always send a string, even if empty
          role: formData.role,
          status: userStatus
        }
        
        console.log('Creating profile with data:', { ...requestBody, fullName: requestBody.fullName?.substring(0, 20) + '...' })
        
        const updateResponse = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(requestBody)
        })

        const responseData = await updateResponse.json()
        
        if (!updateResponse.ok) {
          // Only log if it's not a 401/42501 (these are expected from cached client code)
          if (updateResponse.status !== 401 && updateResponse.status !== 403) {
            console.error('Profile creation error:', responseData)
            console.error('Error details:', {
              status: updateResponse.status,
              statusText: updateResponse.statusText,
              error: responseData
            })
          } else {
            // 401/42501 errors are expected - trigger or API should handle profile creation
            console.log('Note: Client-side insert blocked (expected). Profile will be created by trigger or API.')
          }
          // Don't block signup - trigger or API will create profile
        } else {
          console.log('Profile created/updated successfully:', responseData)
        }
      } catch (err) {
        // Suppress errors from cached client code trying to insert
        // The trigger and API endpoint will handle profile creation
        console.log('Note: Profile creation will be handled by trigger or API endpoint.')
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
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const passwordRequirements = [
    { text: "At least 6 characters", met: formData.password.length >= 6 },
    { text: "Contains letters and numbers", met: /[a-zA-Z]/.test(formData.password) && /[0-9]/.test(formData.password) },
    { text: "Passwords match", met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 }
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
            Join EduHub
          </h1>
          <p className="text-muted-foreground">Start your learning journey today</p>
        </div>

        {/* Form Card */}
        <div className="glass-effect rounded-2xl p-8 space-y-6 border-2 border-primary/10">
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold">
                Full Name
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
                Email Address
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
                I want to
              </Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger className="bg-card/50 border-primary/20 focus:border-primary focus:ring-primary/30 h-11">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Learn from courses</SelectItem>
                  <SelectItem value="instructor">Teach and create courses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
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
                Confirm Password
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

            {/* Terms Agreement */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
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
                "Creating Account..."
              ) : (
                <>
                  Create Account
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
              <span className="px-2 bg-card text-muted-foreground">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="w-full h-11 border-2 border-primary/30 hover:bg-primary/5 bg-transparent"
            >
              Already have an account? Sign In
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
        </div>
      </div>
    </div>
  )
}

