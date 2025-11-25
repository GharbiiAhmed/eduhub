import { createClient } from "@/lib/supabase/server"
import { paymee } from "@/lib/paymee"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { courseId, bookId, type, paymentType } = body
    // paymentType: 'one_time' | 'monthly' | 'yearly'
    // Note: Paymee primarily supports one-time payments
    console.log("Paymee checkout request received:", {
      courseId,
      bookId,
      type,
      paymentType,
      hasCourseId: !!courseId,
      hasBookId: !!bookId,
      fullBody: body
    })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("No user found, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user.id)
      .single()

    // Extract first name and last name from full_name
    const fullName = profile?.full_name || "User"
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || "User"
    const lastName = nameParts.slice(1).join(" ") || "Name"

    let product: any = null
    let amount = 0
    let description = ""

    if (courseId) {
      console.log("Processing course enrollment for:", courseId)
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      if (courseError || !course) {
        console.error("Course fetch error:", courseError)
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }

      product = course
      description = `Course: ${course.title}`
      
      // For Paymee, we'll use one-time payment only
      if (paymentType === 'monthly' || paymentType === 'yearly') {
        // Paymee may support subscriptions, but we'll handle as one-time for now
        console.log("Paymee: Using one-time payment for subscription type")
      }
      
      amount = course.price || 0
    } else if (bookId) {
      console.log("Processing book purchase for:", bookId)
      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single()

      if (bookError || !book) {
        console.error("Book fetch error:", bookError)
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }

      product = book
      description = `Book: ${book.title}`
      amount = book.price || 0
    } else {
      console.error("Missing courseId and bookId in request")
      return NextResponse.json(
        { 
          error: "Course or book ID required",
          received: { courseId: !!courseId, bookId: !!bookId }
        },
        { status: 400 }
      )
    }

    // Free products - create enrollment/purchase directly (no payment needed)
    if (amount === 0) {
      console.log("Free product - creating enrollment/purchase directly")
      
      if (courseId) {
        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .single()

        if (!existingEnrollment) {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from("enrollments")
            .insert({
              student_id: user.id,
              course_id: courseId,
            })
            .select()
            .single()

          if (enrollmentError) {
            console.error("Free enrollment creation error:", enrollmentError)
            return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 })
          }

          // Notify user about free enrollment
          try {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "enrollment",
              title: "Enrollment Successful! 🎓",
              message: `You've successfully enrolled in "${product?.title || 'the course'}". Start learning now!`,
              link: `/student/courses/${courseId}`,
              related_id: courseId,
              related_type: "course"
            }).catch(err => console.error('Failed to create enrollment notification:', err))
          } catch (notifError) {
            console.error('Error creating enrollment notification:', notifError)
          }
        }

        return NextResponse.json({ success: true, free: true })
      } else if (bookId) {
        // Check if already purchased
        const { data: existingPurchase } = await supabase
          .from("book_purchases")
          .select("id")
          .eq("student_id", user.id)
          .eq("book_id", bookId)
          .single()

        if (!existingPurchase) {
          const { data: purchaseData, error: purchaseError } = await supabase
            .from("book_purchases")
            .insert({
              student_id: user.id,
              book_id: bookId,
            })
            .select()
            .single()

          if (purchaseError) {
            console.error("Free book purchase creation error:", purchaseError)
            return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
          }

          // Notify user about free book purchase
          try {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "payment_received",
              title: "Book Purchase Successful! 📚",
              message: `You've successfully purchased "${product?.title || 'the book'}". Access it now!`,
              link: `/books/${bookId}`,
              related_id: bookId,
              related_type: "book"
            }).catch(err => console.error('Failed to create book purchase notification:', err))
          } catch (notifError) {
            console.error('Error creating book purchase notification:', notifError)
          }
        }

        return NextResponse.json({ success: true, free: true })
      }
    }

    if (amount < 0) {
      console.error("Invalid amount:", amount, "for product:", product?.title)
      return NextResponse.json(
        { 
          error: "Invalid amount",
          amount: amount,
          product: product?.title || "Unknown"
        },
        { status: 400 }
      )
    }

    // Check if Paymee is configured
    // Paymee uses API Token (Key) and Account Number
    const paymeeToken = process.env.PAYMEE_API_KEY || process.env.PAYMEE_TOKEN
    const paymeeAccount = process.env.PAYMEE_ACCOUNT_NUMBER || process.env.PAYMEE_MERCHANT_ID
    
    if (!paymeeToken) {
      console.error("Paymee API Token not configured - check PAYMEE_API_KEY or PAYMEE_TOKEN environment variable")
      return NextResponse.json({ 
        error: "Payment gateway not configured",
        details: "PAYMEE_API_KEY environment variable is missing. Please add it in Netlify environment variables."
      }, { status: 500 })
    }
    
    // Account number is not required for API calls (not used in request body)
    // But we log it for reference
    if (!paymeeAccount) {
      console.warn("Paymee Account Number not configured - this is optional for API calls")
    }

    console.log("Creating Paymee payment request...", {
      amount,
      currency: "TND",
      hasToken: !!paymeeToken,
      tokenLength: paymeeToken?.length || 0,
      tokenPreview: paymeeToken ? `${paymeeToken.substring(0, 8)}...` : 'missing',
      hasAccount: !!paymeeAccount,
      accountNumber: paymeeAccount,
      apiBase: process.env.PAYMEE_API_BASE,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/webhook/paymee`

    // Create Paymee payment
    try {
      // Generate order ID
      const orderId = `${courseId || bookId}-${Date.now()}-${user.id.slice(0, 8)}`
      
      // Ensure return URL is absolute and doesn't conflict with Supabase OAuth
      // Use a dedicated payment success endpoint that won't be intercepted
      const returnUrl = new URL('/checkout/success', baseUrl)
      returnUrl.searchParams.set('payment_id', '{payment_id}')
      returnUrl.searchParams.set('source', 'paymee')
      returnUrl.searchParams.set('order_id', orderId)
      
      const cancelUrl = new URL('/checkout/cancel', baseUrl)
      cancelUrl.searchParams.set('source', 'paymee')
      
      const paymentResponse = await paymee.createPayment({
        amount: amount, // Amount in TND
        note: description,
        first_name: firstName,
        last_name: lastName,
        email: profile?.email || user.email || "",
        phone: profile?.phone || user.phone || "+21600000000", // Default phone if not provided (required by Paymee)
        return_url: returnUrl.toString(),
        cancel_url: cancelUrl.toString(),
        webhook_url: webhookUrl,
        order_id: orderId,
      })

      if (!paymentResponse.success) {
      console.error("Paymee payment creation failed:", paymentResponse)
      return NextResponse.json(
        { 
          error: paymentResponse.message || "Failed to create payment",
          details: "Check server logs for more information"
        },
        { status: 500 }
      )
    }

    console.log("Paymee payment created successfully:", {
      paymentId: paymentResponse.payment_id,
      paymentUrl: paymentResponse.payment_url,
      hasQrCode: !!paymentResponse.qr_code
    })

    // Store pending payment in database
    try {
      await supabase.from("payments").insert({
        user_id: user.id,
        paymee_payment_id: paymentResponse.payment_id,
        amount: amount,
        currency: "TND",
        status: "pending",
        payment_type: courseId ? "course" : "book",
        course_id: courseId || null,
        book_id: bookId || null,
      })
    } catch (dbError) {
      console.error("Error storing payment record:", dbError)
      // Continue even if DB insert fails - webhook will handle it
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentResponse.payment_id,
      paymentUrl: paymentResponse.payment_url,
      qrCode: paymentResponse.qr_code,
    })
    } catch (paymeeError: any) {
      // This catches errors from Paymee API call
      const errorDetails = {
        error: paymeeError.message,
        stack: paymeeError.stack,
        name: paymeeError.name,
        apiBase: process.env.PAYMEE_API_BASE,
        hasToken: !!paymeeToken,
        hasAccount: !!paymeeAccount
      }
      console.error("Paymee API call failed:", errorDetails)
      
      // Provide user-friendly error message
      let userMessage = "Failed to create payment"
      if (paymeeError.message.includes("invalid response") || paymeeError.message.includes("HTML")) {
        userMessage = "Payment gateway configuration error. Please check API settings."
      } else if (paymeeError.message.includes("401") || paymeeError.message.includes("Unauthorized")) {
        userMessage = "Payment gateway authentication failed. Please check API credentials."
      } else if (paymeeError.message.includes("404") || paymeeError.message.includes("Not Found")) {
        userMessage = "Payment gateway endpoint not found. Please check API configuration."
      }
      
      throw new Error(userMessage + ": " + paymeeError.message)
    }
  } catch (error: unknown) {
    console.error("Paymee checkout error:", error)
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    const statusCode = errorMessage.includes("Unauthorized") || errorMessage.includes("401") ? 401 :
                      errorMessage.includes("Not Found") || errorMessage.includes("404") ? 404 :
                      errorMessage.includes("Bad Request") || errorMessage.includes("400") ? 400 : 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: "Check Netlify function logs for full error details. The Paymee API may be misconfigured or unavailable.",
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

