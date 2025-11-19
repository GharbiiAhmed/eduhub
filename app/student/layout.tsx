import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if profile exists (user was deleted)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  // If profile doesn't exist (user was deleted), sign out and redirect
  // ProfileError with code PGRST116 means no rows returned (profile doesn't exist)
  if (!profile || profileError) {
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  return (
    <DashboardLayout userType="student" showSidebar={true}>
      {children}
    </DashboardLayout>
  )
}
