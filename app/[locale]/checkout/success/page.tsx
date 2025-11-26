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

      // For book purchases, verify purchase exists and create if webhook hasn't processed yet
      if (bookId) {
        try {
          // Check if purchase already exists - use maybeSingle() to avoid 406 error
          const { data: existingPurchase, error: checkError } = await supabase
            .from("book_purchases")
            .select("id")
            .eq("student_id", user.id)
            .eq("book_id", bookId)
            .maybeSingle()

          // If purchase doesn't exist (and no error), try to create it via API (fallback if webhook hasn't run)
          if (!existingPurchase && !checkError) {
            console.log("Purchase not found, verifying payment and creating purchase...")
            try {
              const response = await fetch("/api/payment/verify-purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bookId,
                  userId: user.id,
                  orderId: searchParams.get('order_id'),
                  paymentToken: searchParams.get('payment_token'),
                }),
              })

              if (response.ok) {
                console.log("✅ Purchase verified and created via fallback")
              } else {
                console.log("Purchase verification failed, webhook will handle it")
              }
            } catch (error) {
              console.error("Error verifying purchase:", error)
              // Continue anyway - webhook will handle it
            }
          } else {
            console.log("✅ Purchase already exists")
          }
        } catch (error) {
          console.error("Error checking purchase:", error)
        }
      }

      // Prevent multiple redirects
      if (hasRedirectedRef.current) {
        return
      }
      hasRedirectedRef.current = true

      // Wait a bit for webhook to process
      // The webhook will handle creating the enrollment/purchase
      // For book purchases, wait longer to ensure webhook completes
      const waitTime = bookId ? 5000 : 2000 // 5 seconds for books, 2 seconds for courses
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
            router.push("/student/books?refresh=true")
          } else {
            router.push("/student/courses")
          }
        }
      }, waitTime)
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
