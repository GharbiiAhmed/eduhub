import { PendingApprovalClient } from "./pending-approval-client"
import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PendingApprovalPage() {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    // Handle refresh token errors gracefully - these are common and can be ignored
    // if the user is just viewing the page (they'll be redirected if needed)
    if (userError) {
      // Check if it's a refresh token error - these are common and can be ignored
      const isRefreshTokenError = userError.message?.includes('Refresh Token') || 
                                  userError.message?.includes('refresh_token') ||
                                  userError.status === 401
      
      if (isRefreshTokenError) {
        // Refresh token errors are common - clear the session and redirect to login
        // Don't log these as errors since they're expected when sessions expire
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          // Ignore sign out errors
        }
        redirect("/auth/login")
      }
      
      // For other errors, also redirect to login
      if (!user) {
        redirect("/auth/login")
      }
    }

    if (!user) {
      redirect("/auth/login")
    }

    // Check user profile - only instructors should see this page
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single()

    // If profile doesn't exist yet (during signup), show the page anyway
    // This allows users to see the pending approval message immediately after signup
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is OK during signup
      // Other errors should be logged but not block the page
      console.warn('Error fetching profile:', profileError)
    }

    // If user is a student or already approved, redirect them away
    if (profile) {
      if (profile.role === 'student') {
        // Students are auto-approved, redirect to dashboard
        redirect("/dashboard")
      }
      if (profile.status !== 'pending') {
        // User is already approved, redirect to dashboard
        redirect("/dashboard")
      }
      if (profile.role !== 'instructor') {
        // Only instructors should see pending approval page
        redirect("/dashboard")
      }
    }

    // Show the page even if profile doesn't exist yet (during signup)
    return <PendingApprovalClient />
  } catch (error: any) {
    // Handle any unexpected errors
    const isRefreshTokenError = error?.message?.includes('Refresh Token') || 
                                error?.message?.includes('refresh_token')
    
    if (isRefreshTokenError) {
      // For refresh token errors, redirect to login silently
      redirect("/auth/login")
    }
    
    // For other errors, log but still try to show the page
    console.warn('Error in PendingApprovalPage:', error)
    // Still show the page even if there's an error (user might be in signup flow)
    return <PendingApprovalClient />
  }
}







