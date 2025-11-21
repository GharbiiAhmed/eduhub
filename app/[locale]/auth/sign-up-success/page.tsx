import { SignUpSuccessClient } from './sign-up-success-client'
import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export default async function SignUpSuccessPage() {
  const supabase = await createClient()
  
  // Check if user is logged in (email verified)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // User is logged in, check their profile and redirect to appropriate dashboard
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single()

    if (profile) {
      // Check if user is pending (instructors)
      if (profile.status === 'pending' && profile.role === 'instructor') {
        redirect("/auth/pending-approval")
      }
      
      // Check if user is banned or inactive
      if (profile.status === 'banned' || profile.status === 'inactive') {
        await supabase.auth.signOut()
        redirect("/auth/login")
      }

      // Redirect based on role
      if (profile.role === "admin") {
        redirect("/admin/dashboard")
      } else if (profile.role === "instructor") {
        redirect("/instructor/dashboard")
      } else {
        redirect("/student/courses")
      }
    } else {
      // Profile doesn't exist, redirect to dashboard (will handle there)
      redirect("/dashboard")
    }
  }

  // User is not logged in yet, show the "check your email" message
  return <SignUpSuccessClient />
}
