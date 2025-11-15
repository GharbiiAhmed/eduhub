"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function StudentSidebar() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    setIsLoading(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <aside className="w-64 bg-card border-r border-border p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduHub</h1>
        <p className="text-sm text-muted-foreground">Student Dashboard</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link href="/student/courses">
          <Button variant="ghost" className="w-full justify-start">
            My Courses
          </Button>
        </Link>
        <Link href="/courses">
          <Button variant="ghost" className="w-full justify-start">
            Browse Courses
          </Button>
        </Link>
        <Link href="/student/books">
          <Button variant="ghost" className="w-full justify-start">
            My Books
          </Button>
        </Link>
        <Link href="/books">
          <Button variant="ghost" className="w-full justify-start">
            Browse Books
          </Button>
        </Link>
      </nav>

      <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout} disabled={isLoading}>
        {isLoading ? "Logging out..." : "Logout"}
      </Button>
    </aside>
  )
}
