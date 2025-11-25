import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { flouci } from "@/lib/flouci"
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendPaymentReceivedEmail,
} from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Flouci webhook received:", body)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Extract payment information from webhook
    const paymentRequestId = body.id || body.payment_request_id || body.paymentId
    const status = body.status || body.state
    const amount = body.amount || body.total
    const transactionId = body.transaction_id || body.id

    if (!paymentRequestId) {
      console.error("Missing payment_request_id in webhook")
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 })
    }

    // Verify payment status with Flouci
    let paymentStatus
    try {
      paymentStatus = await flouci.verifyPayment(paymentRequestId)
    } catch (verifyError) {
      console.error("Error verifying payment:", verifyError)
      // Continue with webhook data if verification fails
      paymentStatus = {
        success: status === 'SUCCESS' || status === 'paid',
        status: status === 'SUCCESS' || status === 'paid' ? 'paid' : 'failed',
        amount: amount || 0,
        currency: 'TND',
        payment_request_id: paymentRequestId,
        transaction_id: transactionId,
        metadata: body.metadata || {},
      }
    }

    console.log("Payment status:", paymentStatus)

    // Find payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("flouci_payment_id", paymentRequestId)
      .single()

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error("Error fetching payment:", paymentError)
    }

    // Handle successful payment
    if (paymentStatus.status === 'paid' && paymentStatus.success) {
      const metadata = paymentStatus.metadata || body.metadata || {}
      const { userId, courseId, bookId, type } = metadata

      if (!userId) {
        console.error("Missing userId in payment metadata")
        return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
      }

      const totalAmount = paymentStatus.amount
      const platformCommission = totalAmount * 0.20 // 20% platform commission
      const creatorEarnings = totalAmount * 0.80 // 80% creator earnings

      // Get creator ID
      let creatorId = null
      if (courseId) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("instructor_id, title")
          .eq("id", courseId)
          .single()
        creatorId = course?.instructor_id || null
      } else if (bookId) {
        const { data: book } = await supabaseAdmin
          .from("books")
          .select("author_id, title")
          .eq("id", bookId)
          .single()
        creatorId = book?.author_id || null
      }

      // Update or create payment record
      if (payment) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            amount: totalAmount,
            currency: paymentStatus.currency || "TND",
            platform_commission: platformCommission,
            creator_earnings: creatorEarnings,
          })
          .eq("id", payment.id)
      } else {
        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          flouci_payment_id: paymentRequestId,
          amount: totalAmount,
          currency: paymentStatus.currency || "TND",
          status: "completed",
          payment_type: courseId ? "course" : "book",
          course_id: courseId || null,
          book_id: bookId || null,
          platform_commission: platformCommission,
          creator_earnings: creatorEarnings,
        })
      }

      // Handle course enrollment
      if (courseId) {
        const { data: existingEnrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("student_id", userId)
          .eq("course_id", courseId)
          .single()

        if (!existingEnrollment) {
          await supabaseAdmin.from("enrollments").insert({
            student_id: userId,
            course_id: courseId,
          })
        }
      }

      // Handle book purchase
      if (bookId) {
        const { data: existingPurchase } = await supabaseAdmin
          .from("book_purchases")
          .select("id")
          .eq("student_id", userId)
          .eq("book_id", bookId)
          .single()

        if (!existingPurchase) {
          await supabaseAdmin.from("book_purchases").insert({
            student_id: userId,
            book_id: bookId,
            purchase_type: type || "digital",
            price_paid: totalAmount,
          })
        }
      }

      // Get product name for emails
      let productName = ""
      if (courseId) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single()
        productName = course?.title || ""
      } else if (bookId) {
        const { data: book } = await supabaseAdmin
          .from("books")
          .select("title")
          .eq("id", bookId)
          .single()
        productName = book?.title || ""
      }

      // Send emails
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single()

        if (profile?.email) {
          // Send payment receipt to user
          await sendPaymentReceiptEmail(
            profile.email,
            profile.full_name || "User",
            productName || "your purchase",
            totalAmount,
            "TND"
          )

          // Send payment received email to creator
          if (creatorId) {
            const { data: creatorProfile } = await supabaseAdmin
              .from("profiles")
              .select("email, full_name")
              .eq("id", creatorId)
              .single()

            if (creatorProfile?.email) {
              await sendPaymentReceivedEmail(
                creatorProfile.email,
                creatorProfile.full_name || "Creator",
                productName || "product",
                creatorEarnings,
                "TND"
              )
            }
          }
        }
      } catch (emailError) {
        console.error("Error sending payment emails:", emailError)
      }

      // Create notification
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "payment_received",
          title: "Payment Successful! ✅",
          message: `Your payment of ${totalAmount.toFixed(3)} TND for "${productName || 'your purchase'}" has been received.`,
          link: courseId ? `/student/courses/${courseId}` : `/books/${bookId}`,
          related_id: courseId || bookId,
          related_type: courseId ? "course" : "book",
        })
      } catch (notifError) {
        console.error("Error creating notification:", notifError)
      }

      return NextResponse.json({ success: true, message: "Payment processed" })
    }

    // Handle failed payment
    if (paymentStatus.status === 'failed') {
      if (payment) {
        await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("id", payment.id)
      }

      const metadata = paymentStatus.metadata || body.metadata || {}
      const { userId } = metadata

      if (userId) {
        try {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single()

          if (profile?.email) {
            await sendPaymentFailedEmail(
              profile.email,
              profile.full_name || "User",
              "Payment failed",
              body.error || "Payment could not be processed"
            )
          }
        } catch (emailError) {
          console.error("Error sending payment failed email:", emailError)
        }
      }

      return NextResponse.json({ success: true, message: "Payment failure recorded" })
    }

    return NextResponse.json({ success: true, message: "Webhook received" })
  } catch (error: any) {
    console.error("Flouci webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}





