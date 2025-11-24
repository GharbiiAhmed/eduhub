import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function CheckoutSuccessPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Get user profile to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single()

    if (profile) {
      // Redirect based on role
      if (profile.role === "admin") {
        redirect("/admin/dashboard")
      } else if (profile.role === "instructor") {
        redirect("/instructor/dashboard")
      } else {
        redirect("/student/courses")
      }
    }
  }

  // If not authenticated or no profile, show success page with dashboard link
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Purchase Successful!</CardTitle>
          <CardDescription>Thank you for your purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your purchase has been completed successfully. You can now access your course or book.
          </p>
          <Link href="/student/courses">
            <Button className="w-full">Go to My Courses</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
