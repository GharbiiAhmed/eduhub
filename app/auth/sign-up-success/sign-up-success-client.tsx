"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function SignUpSuccessClient() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is logged in (email verified)
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is logged in, get their profile and redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", user.id)
          .single()

        if (profile) {
          // Check if user is pending (instructors)
          if (profile.status === 'pending' && profile.role === 'instructor') {
            router.push("/auth/pending-approval")
            return
          }
          
          // Check if user is banned or inactive
          if (profile.status === 'banned' || profile.status === 'inactive') {
            await supabase.auth.signOut()
            router.push("/auth/login")
            return
          }

          // Redirect based on role
          if (profile.role === "admin") {
            router.push("/admin/dashboard")
          } else if (profile.role === "instructor") {
            router.push("/instructor/dashboard")
          } else {
            router.push("/student/courses")
          }
        } else {
          // Profile doesn't exist, redirect to dashboard
          router.push("/dashboard")
        }
      } else {
        // User is not logged in yet
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Verifying...</p>
        </div>
      </div>
    )
  }

  // User is not logged in yet, show the "check your email" message
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>We&apos;ve sent you a confirmation link to verify your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Please check your email and click the confirmation link to complete your signup.
            </p>
            <Link href="/auth/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}

