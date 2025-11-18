import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { DashboardLayout } from "@/components/dashboard-layout"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if profile exists (user was deleted)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  // Verify user is admin
  if (profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout userType="admin" showSidebar={true}>
      {children}
    </DashboardLayout>
  )
}














