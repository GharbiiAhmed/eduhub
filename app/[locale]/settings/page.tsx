import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // Ensure locale is valid
  const validLocale = locale || "en"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${validLocale}/auth/login`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Get role from profile, default to "student" if not found
  const userRole = profile?.role || "student"

  // Redirect based on role - explicitly include locale in path
  if (userRole === "admin") {
    redirect(`/${validLocale}/admin/settings`)
  } else if (userRole === "instructor") {
    redirect(`/${validLocale}/instructor/settings`)
  } else {
    redirect(`/${validLocale}/student/settings`)
  }
}

