import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single()

  // If profile doesn't exist (user was deleted), redirect to login and sign out
  if (!profile) {
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  // Check if user is pending - redirect to pending approval page
  if (profile.status === 'pending') {
    redirect("/auth/pending-approval")
  }

  // Check if user is banned or inactive - redirect to login
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
}
