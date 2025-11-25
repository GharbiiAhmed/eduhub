"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const paymentId = searchParams.get('payment_id')
  const paymentToken = searchParams.get('payment_token') || searchParams.get('token')
  const source = searchParams.get('source')
  
  // Extract book_id and course_id, handling cases where Paymee adds extra query params
  let bookId = searchParams.get('book_id')
  let courseId = searchParams.get('course_id')
  const orderId = searchParams.get('order_id')
  
  // Clean up book_id if it contains query parameters (Paymee sometimes appends them)
  if (bookId && bookId.includes('?')) {
    bookId = bookId.split('?')[0]
  }
  if (courseId && courseId.includes('?')) {
    courseId = courseId.split('?')[0]
  }

  useEffect(() => {
    async function checkAuthAndVerifyPayment() {
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

      // If we have a book purchase, verify it exists and create if missing
      if (bookId) {
        // Check if book purchase already exists
        const { data: existingPurchases, error: purchaseCheckError } = await supabase
          .from("book_purchases")
          .select("id")
          .eq("student_id", user.id)
          .eq("book_id", bookId)
          .limit(1)

        const existingPurchase = existingPurchases && existingPurchases.length > 0 ? existingPurchases[0] : null

        if (!existingPurchase && !purchaseCheckError) {
          // Check if payment exists and is completed
          let paymentVerified = false
          if (paymentToken) {
            const { data: payments, error: paymentError } = await supabase
              .from("payments")
              .select("*")
              .eq("paymee_payment_id", paymentToken)
              .eq("user_id", user.id)
              .eq("status", "completed")
              .limit(1)

            const payment = payments && payments.length > 0 ? payments[0] : null

            if (payment && payment.book_id === bookId && !paymentError) {
              paymentVerified = true
              
              // Extract purchase type from orderId if available
              let purchaseType = "digital"
              if (orderId) {
                const parts = orderId.split('-')
                if (parts.length >= 2 && ['digital', 'physical', 'both'].includes(parts[1])) {
                  purchaseType = parts[1]
                }
              }

              // Create book purchase
              const { error: purchaseError } = await supabase
                .from("book_purchases")
                .insert({
                  student_id: user.id,
                  book_id: bookId,
                  purchase_type: purchaseType,
                  price_paid: payment.amount || 0,
                })

              if (purchaseError) {
                console.error("Error creating book purchase:", purchaseError)
                setError("Payment verified but failed to create purchase. Please contact support.")
              } else {
                console.log("Book purchase created successfully")
              }
            } else {
              // Payment not found or not completed, wait a bit more for webhook
              console.log("Payment not yet verified, waiting for webhook...")
              setTimeout(() => {
                checkAuthAndVerifyPayment()
              }, 3000)
              return
            }
          } else {
            // No payment token, wait for webhook
            setTimeout(() => {
              checkAuthAndVerifyPayment()
            }, 3000)
            return
          }
        }
      }

      // Small delay to ensure everything is processed
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
      }, 1000)
    }

    checkAuthAndVerifyPayment()
  }, [router, bookId, courseId, paymentToken, orderId])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Payment...</CardTitle>
            <CardDescription>Please wait while we verify your payment and set up your purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            {bookId && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Setting up your book access...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Payment Issue</CardTitle>
            <CardDescription>There was an issue processing your purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex gap-2">
              <Link href="/student/books">
                <Button variant="outline" className="flex-1">Go to My Books</Button>
              </Link>
              <Link href="/books">
                <Button className="flex-1">Browse Books</Button>
              </Link>
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
          {paymentId && (
            <p className="text-sm text-muted-foreground">
              Payment ID: {paymentId}
            </p>
          )}
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
