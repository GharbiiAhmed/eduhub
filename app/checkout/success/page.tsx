"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"

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
            console.log("Purchase not found, creating from payment token...")
            // Paymee returns payment_id in the URL, but it's actually the payment token
            const paymentToken = searchParams.get('payment_token') || searchParams.get('payment_id') || searchParams.get('token')
            const orderId = searchParams.get('order_id')
            console.log("Payment parameters:", { paymentToken, orderId, allParams: Object.fromEntries(searchParams.entries()) })
            let purchaseCreated = false
            
            if (paymentToken) {
              try {
                // Try creating directly from payment token (most reliable)
                const response = await fetch("/api/payment/create-from-token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookId,
                    userId: user.id,
                    paymentToken,
                    orderId,
                  }),
                })

                const data = await response.json()
                if (response.ok && data.success) {
                  console.log("✅ Purchase created from payment token:", data)
                  purchaseCreated = true
                  
                  // Wait a moment for database to update
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  
                  // Verify purchase was created
                  const { data: verifyPurchase } = await supabase
                    .from("book_purchases")
                    .select("id")
                    .eq("student_id", user.id)
                    .eq("book_id", bookId)
                    .maybeSingle()
                  
                  if (verifyPurchase) {
                    console.log("✅ Purchase verified in database")
                  }
                } else {
                  console.error("Failed to create purchase:", data)
                  // Fallback to verify-purchase
                  const verifyResponse = await fetch("/api/payment/verify-purchase", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      bookId,
                      userId: user.id,
                      orderId,
                      paymentToken,
                    }),
                  })
                  const verifyData = await verifyResponse.json()
                  if (verifyResponse.ok && verifyData.success) {
                    console.log("✅ Purchase created via verify-purchase fallback")
                    purchaseCreated = true
                  }
                }
              } catch (error) {
                console.error("Error creating purchase:", error)
              }
            } else {
              // No payment token - use the simple create-purchase endpoint (like console command)
              // This works exactly like the manual console command that worked
              console.log("No payment token found, using simple create-purchase endpoint...")
              try {
                // Extract purchase type from orderId if present
                let purchaseType = "digital"
                if (orderId) {
                  const orderParts = orderId.split("-")
                  if (orderParts.length >= 2 && ["digital", "physical", "both"].includes(orderParts[1])) {
                    purchaseType = orderParts[1]
                  }
                }
                
                const response = await fetch("/api/payment/create-purchase", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookId,
                    userId: user.id,
                    purchaseType,
                  }),
                })
                const data = await response.json()
                if (response.ok && data.success) {
                  console.log("✅ Purchase created using simple endpoint (like console):", data)
                  purchaseCreated = true
                } else {
                  console.error("Failed to create purchase:", data)
                  // Last resort: try verify-purchase
                  const verifyResponse = await fetch("/api/payment/verify-purchase", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      bookId,
                      userId: user.id,
                      orderId: searchParams.get('order_id'),
                    }),
                  })
                  const verifyData = await verifyResponse.json()
                  if (verifyResponse.ok && verifyData.success) {
                    console.log("✅ Purchase verified and created via verify-purchase fallback")
                    purchaseCreated = true
                  }
                }
              } catch (error) {
                console.error("Error creating purchase:", error)
              }
            }
            
            if (purchaseCreated) {
              console.log("Purchase creation completed, proceeding with redirect...")
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

      // For book purchases, wait for purchase creation and verify it exists
      if (bookId) {
        // Wait a bit for purchase creation to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Verify purchase was created (retry up to 3 times)
        let purchaseExists = false
        for (let i = 0; i < 3; i++) {
          const { data: verifyPurchase } = await supabase
            .from("book_purchases")
            .select("id")
            .eq("student_id", user.id)
            .eq("book_id", bookId)
            .maybeSingle()
          
          if (verifyPurchase) {
            purchaseExists = true
            console.log("✅ Purchase verified, ready to redirect")
            break
          }
          
          // Wait before retry
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
        
        if (!purchaseExists) {
          console.warn("⚠️ Purchase not found after creation attempts, redirecting anyway")
        }
      }

      setIsChecking(false)
      
      // Redirect based on role and purchase type
      setTimeout(() => {
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
      }, 1000) // Short delay after verification
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
