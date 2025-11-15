import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
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
    redirect("/admin/settings")
  } else if (profile?.role === "instructor") {
    redirect("/instructor/settings")
  } else {
    redirect("/student/settings")
  }
}
