"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)
  const hasRedirectedRef = useRef(false)
  
  // Extract book_id and course_id, handling cases where Paymee adds extra query params
  let bookId = searchParams.get('book_id')
  let courseId = searchParams.get('course_id')
  
  // Clean up book_id if it contains query parameters (Paymee sometimes appends them)
  if (bookId && bookId.includes('?')) {
    bookId = bookId.split('?')[0]
  }
  if (courseId && courseId.includes('?')) {
    courseId = courseId.split('?')[0]
  }

  useEffect(() => {
    // Prevent multiple effect runs
    if (hasRedirectedRef.current) {
      return
    }

    async function checkAuthAndRedirect() {
      const supabase = createClient()
      
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsChecking(false)
        return
      }

      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single()

      if (!profile) {
        setIsChecking(false)
        return
      }

      // Prevent multiple redirects
      if (hasRedirectedRef.current) {
        return
      }
      hasRedirectedRef.current = true

      // Wait a bit for webhook to process (same as courses)
      // The webhook will handle creating the enrollment/purchase
      setIsChecking(false)
      setTimeout(() => {
        // Redirect based on role and purchase type
        if (profile.role === "admin") {
          router.push("/admin/dashboard")
        } else if (profile.role === "instructor") {
          router.push("/instructor/dashboard")
        } else {
          // For students, redirect to books if it was a book purchase, otherwise courses
          if (bookId) {
            router.push("/student/books")
          } else {
            router.push("/student/courses")
          }
        }
      }, 2000) // 2 second delay to let webhook process (same as courses)
    }

    checkAuthAndRedirect()
  }, [router, bookId, courseId])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Payment...</CardTitle>
            <CardDescription>Please wait while we verify your payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <div className="flex gap-2">
            {bookId ? (
              <Link href="/student/books">
                <Button className="flex-1">Go to My Books</Button>
              </Link>
            ) : (
              <Link href="/student/courses">
                <Button className="flex-1">Go to My Courses</Button>
              </Link>
            )}
            <Link href={bookId ? `/books/${bookId}` : "/courses"}>
              <Button variant="outline" className="flex-1">
                {bookId ? "View Book" : "Browse Courses"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing...</CardTitle>
            <CardDescription>Please wait while we verify your payment</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
