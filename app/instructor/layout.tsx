import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  // Check if profile exists (user was deleted)
  if (!profile) {
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  if (profile.role !== "instructor" && profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout userType="instructor" showSidebar={true}>
      {children}
    </DashboardLayout>
  )
}
