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
          // Extract purchase type from orderId to check if we need a different type
          // OrderId format: bookId-type-timestamp-userIdPrefix
          // Since bookId is a UUID (has dashes), we need to extract it differently
          const orderId = searchParams.get('order_id')
          let requestedPurchaseType = "digital"
          if (orderId && bookId) {
            // Check if orderId starts with bookId
            if (orderId.startsWith(bookId)) {
              // Remove bookId prefix (including the dash after it)
              const remaining = orderId.substring(bookId.length + 1) // +1 to skip the dash
              const parts = remaining.split("-")
              // First part after bookId should be the purchase type
              if (parts.length > 0 && ["digital", "physical", "both"].includes(parts[0])) {
                requestedPurchaseType = parts[0]
              }
            } else {
              // Fallback: try to find purchase type in the orderId
              // Look for "digital", "physical", or "both" as standalone words
              if (orderId.includes("-physical-") || orderId.endsWith("-physical")) {
                requestedPurchaseType = "physical"
              } else if (orderId.includes("-digital-") || orderId.endsWith("-digital")) {
                requestedPurchaseType = "digital"
              } else if (orderId.includes("-both-") || orderId.endsWith("-both")) {
                requestedPurchaseType = "both"
              }
            }
          }
          console.log("Extracted purchase type from orderId:", { orderId, bookId, requestedPurchaseType })
          
          // Check if purchase already exists - use maybeSingle() to avoid 406 error
          const { data: existingPurchase, error: checkError } = await supabase
            .from("book_purchases")
            .select("id, purchase_type")
            .eq("student_id", user.id)
            .eq("book_id", bookId)
            .maybeSingle()

          // Determine if we should create a new purchase:
          // - No existing purchase: create it
          // - Existing purchase with different type: upgrade logic
          //   - digital + physical = both
          //   - physical + digital = both
          //   - If already "both", don't create
          //   - If same type, don't create
          let shouldCreatePurchase = false
          let upgradeToBoth = false
          
          if (!existingPurchase && !checkError) {
            shouldCreatePurchase = true
          } else if (existingPurchase) {
            const existingType = existingPurchase.purchase_type
            // If requesting same type, don't create
            if (existingType === requestedPurchaseType) {
              console.log(`✅ Purchase already exists with type: ${existingType}`)
            } 
            // If existing is "both", don't create
            else if (existingType === "both") {
              console.log("✅ Purchase already exists with 'both' type")
            }
            // If upgrading (digital->physical or physical->digital), upgrade to "both"
            else if (
              (existingType === "digital" && requestedPurchaseType === "physical") ||
              (existingType === "physical" && requestedPurchaseType === "digital")
            ) {
              upgradeToBoth = true
              shouldCreatePurchase = true
              console.log(`Upgrading purchase from ${existingType} to both`)
            }
            // If requesting "both" and have single type, upgrade
            else if (requestedPurchaseType === "both" && (existingType === "digital" || existingType === "physical")) {
              upgradeToBoth = true
              shouldCreatePurchase = true
              console.log(`Upgrading purchase from ${existingType} to both`)
            }
          }

          // If purchase doesn't exist or needs upgrade, try to create it via API (fallback if webhook hasn't run)
          if (shouldCreatePurchase && !checkError) {
            console.log(upgradeToBoth ? "Upgrading purchase..." : "Purchase not found, creating from payment token...")
            // Paymee returns payment_id in the URL, but it's actually the payment token
            const paymentToken = searchParams.get('payment_token') || searchParams.get('payment_id') || searchParams.get('token')
            console.log("Payment parameters:", { paymentToken, orderId, requestedPurchaseType, upgradeToBoth, allParams: Object.fromEntries(searchParams.entries()) })
            let purchaseCreated = false
            const finalPurchaseType = upgradeToBoth ? "both" : requestedPurchaseType
            
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
                    upgradeExisting: upgradeToBoth,
                    existingPurchaseId: existingPurchase?.id,
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
                const response = await fetch("/api/payment/create-purchase", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookId,
                    userId: user.id,
                    purchaseType: finalPurchaseType,
                    upgradeExisting: upgradeToBoth,
                    existingPurchaseId: existingPurchase?.id,
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
          window.location.href = "/admin/dashboard"
        } else if (profile.role === "instructor") {
          window.location.href = "/instructor/dashboard"
        } else {
          // For students, redirect to books if it was a book purchase, otherwise courses
          if (bookId) {
            window.location.href = "/student/books?refresh=true"
          } else {
            window.location.href = "/student/courses"
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
