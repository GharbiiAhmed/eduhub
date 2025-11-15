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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  // Redirect based on role
  if (profile?.role === "admin") {
    redirect("/admin/dashboard")
  } else if (profile?.role === "instructor") {
    redirect("/instructor/dashboard")
  } else {
    redirect("/student/courses")
  }
}
