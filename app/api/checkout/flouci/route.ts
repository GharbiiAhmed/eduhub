import { createClient } from "@/lib/supabase/server"
import { flouci } from "@/lib/flouci"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { courseId, bookId, type, paymentType } = await request.json()
    // paymentType: 'one_time' | 'monthly' | 'yearly'
    // Note: Flouci typically supports one-time payments. Subscriptions may need manual handling.
    console.log("Flouci checkout request:", { courseId, bookId, type, paymentType })

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

      // For Flouci, we'll use one-time payment only
      // Subscriptions would need to be handled differently
      amount = course.price || 0

      console.log("Course found:", { title: course.title, amount })
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
      description = `Book: ${book.title} (${type || 'digital'})`
      amount = book.price || 0

      console.log("Book found:", { title: book.title, amount })
    } else {
      return NextResponse.json({ error: "Course or book ID required" }, { status: 400 })
    }

    // Check if Flouci is configured
    if (!process.env.FLOUCI_APP_TOKEN || !process.env.FLOUCI_APP_SECRET) {
      console.log("Flouci not configured")
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    // Free products
    if (amount === 0) {
      console.log("Free product - creating enrollment/purchase directly")
      if (courseId) {
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

        return NextResponse.json({ success: true, free: true })
      } else if (bookId) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from("book_purchases")
          .insert({
            student_id: user.id,
            book_id: bookId,
            purchase_type: type || "digital",
            price_paid: 0,
          })
          .select()
          .single()

        if (purchaseError) {
          console.error("Free book purchase creation error:", purchaseError)
          return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
        }

        return NextResponse.json({ success: true, free: true })
      }
    }

    console.log("Creating Flouci payment request...")

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/webhook/flouci`

    // Create Flouci payment
    const paymentResponse = await flouci.createPayment({
      amount: amount, // Amount in TND
      success_url: `${baseUrl}/checkout/success?payment_id={payment_id}`,
      fail_url: `${baseUrl}/checkout/cancel`,
      app_token: process.env.FLOUCI_APP_TOKEN!,
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
    })

    if (!paymentResponse.success) {
      return NextResponse.json(
        { error: paymentResponse.message || "Failed to create payment" },
        { status: 500 }
      )
    }

    console.log("Flouci payment created:", paymentResponse.payment_request_id)

    // Store pending payment in database
    try {
      await supabase.from("payments").insert({
        user_id: user.id,
        flouci_payment_id: paymentResponse.payment_request_id,
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
      paymentId: paymentResponse.payment_request_id,
      paymentUrl: paymentResponse.payment_url,
      qrCode: paymentResponse.qr_code,
    })
  } catch (error: unknown) {
    console.error("Flouci checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}














