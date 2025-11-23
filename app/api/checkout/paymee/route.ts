import { createClient } from "@/lib/supabase/server"
import { paymee } from "@/lib/paymee"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { courseId, bookId, type, paymentType } = await request.json()
    // paymentType: 'one_time' | 'monthly' | 'yearly'
    // Note: Paymee primarily supports one-time payments
    console.log("Paymee checkout request:", { courseId, bookId, type, paymentType })

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
      .select("email, full_name")
      .eq("id", user.id)
      .single()

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
      return NextResponse.json({ error: "Course or book ID required" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Check if Paymee is configured
    // Paymee uses API Token (Key) and Account Number
    const paymeeToken = process.env.PAYMEE_API_KEY || process.env.PAYMEE_TOKEN
    const paymeeAccount = process.env.PAYMEE_ACCOUNT_NUMBER || process.env.PAYMEE_MERCHANT_ID
    
    if (!paymeeToken || !paymeeAccount) {
      console.log("Paymee not configured - missing API Token or Account Number")
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    console.log("Creating Paymee payment request...")

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/webhook/paymee`

    // Create Paymee payment
    const paymentResponse = await paymee.createPayment({
      amount: amount, // Amount in TND
      success_url: `${baseUrl}/checkout/success?payment_id={payment_id}`,
      fail_url: `${baseUrl}/checkout/cancel`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      webhook_url: webhookUrl,
      customer: {
        name: profile?.full_name || undefined,
        email: profile?.email || undefined,
      },
      metadata: {
        userId: user.id,
        courseId: courseId || "",
        bookId: bookId || "",
        type: type || "digital",
        paymentType: paymentType || "one_time",
        description: description,
      },
      description: description,
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
        details: "Check Netlify function logs for full error details",
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

