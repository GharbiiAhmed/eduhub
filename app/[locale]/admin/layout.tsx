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

  return (
    <DashboardLayout userType="admin" showSidebar={true}>
      {children}
    </DashboardLayout>
  )
}













