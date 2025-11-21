import { PendingApprovalClient } from "./pending-approval-client"
import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check user profile - only instructors should see this page
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

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

  return <PendingApprovalClient />
}







