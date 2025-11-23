import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { paymee } from "@/lib/paymee"
import {
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendPaymentReceivedEmail,
} from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Paymee webhook received:", body)

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
    const paymentId = body.payment_id || body.id || body.paymentId
    const status = body.status || body.payment_status || body.state
    const amount = body.amount || body.total
    const transactionId = body.transaction_id || body.transactionId || body.id

    if (!paymentId) {
      console.error("Missing payment_id in webhook")
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 })
    }

    // Verify webhook signature if Paymee provides it
    const signature = request.headers.get('x-paymee-signature') || request.headers.get('x-signature')
    if (signature && process.env.PAYMEE_API_SECRET) {
      const isValid = paymee.verifyWebhookSignature(body, signature)
      if (!isValid) {
        console.error("Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Verify payment status with Paymee
    let paymentStatus
    try {
      paymentStatus = await paymee.verifyPayment(paymentId)
    } catch (verifyError) {
      console.error("Error verifying payment:", verifyError)
      // Continue with webhook data if verification fails
      const paymeeStatus = status?.toLowerCase()
      paymentStatus = {
        success: paymeeStatus === 'success' || paymeeStatus === 'paid' || paymeeStatus === 'completed',
        status: paymeeStatus === 'success' || paymeeStatus === 'paid' || paymeeStatus === 'completed' 
          ? 'paid' 
          : paymeeStatus === 'failed' || paymeeStatus === 'rejected' 
          ? 'failed' 
          : 'pending',
        amount: amount || 0,
        currency: 'TND',
        payment_id: paymentId,
        transaction_id: transactionId,
        metadata: body.metadata || {},
      }
    }

    console.log("Payment status:", paymentStatus)

    // Find payment record - check both paymee_payment_id and flouci_payment_id for compatibility
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .or(`paymee_payment_id.eq.${paymentId},flouci_payment_id.eq.${paymentId}`)
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
      let productName = ""
      if (courseId) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("instructor_id, title")
          .eq("id", courseId)
          .single()
        creatorId = course?.instructor_id || null
        productName = course?.title || ""
      } else if (bookId) {
        const { data: book } = await supabaseAdmin
          .from("books")
          .select("author_id, title")
          .eq("id", bookId)
          .single()
        creatorId = book?.author_id || null
        productName = book?.title || ""
      }

      // Update or create payment record
      if (payment) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            amount: totalAmount,
            currency: paymentStatus.currency || "TND",
            paymee_payment_id: paymentId,
            transaction_id: paymentStatus.transaction_id,
            platform_commission: platformCommission,
            creator_earnings: creatorEarnings,
            completed_at: new Date().toISOString(),
          })
          .eq("id", payment.id)
      } else {
        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          paymee_payment_id: paymentId,
          amount: totalAmount,
          currency: paymentStatus.currency || "TND",
          status: "completed",
          payment_type: courseId ? "course" : "book",
          course_id: courseId || null,
          book_id: bookId || null,
          transaction_id: paymentStatus.transaction_id,
          platform_commission: platformCommission,
          creator_earnings: creatorEarnings,
          completed_at: new Date().toISOString(),
        })
      }

      // Handle course enrollment
      if (courseId) {
        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", courseId)
          .single()

        if (!existingEnrollment) {
          await supabaseAdmin.from("enrollments").insert({
            user_id: userId,
            course_id: courseId,
            enrolled_at: new Date().toISOString(),
            status: "active",
          })

          // Send enrollment notification
          await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            type: "enrollment",
            title: "Course Enrolled! 🎉",
            message: `You have successfully enrolled in "${productName}"`,
          }).catch(err => console.error('Failed to create enrollment notification:', err))
        }
      }

      // Handle book purchase
      if (bookId) {
        const { data: existingPurchase } = await supabaseAdmin
          .from("book_purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("book_id", bookId)
          .single()

        if (!existingPurchase) {
          await supabaseAdmin.from("book_purchases").insert({
            user_id: userId,
            book_id: bookId,
            purchased_at: new Date().toISOString(),
          })
        }
      }

      // Send emails and notifications
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
            totalAmount,
            "TND",
            productName || "your purchase"
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
                creatorEarnings,
                "TND",
                productName || "product",
                courseId ? "course" : "book"
              )
            }
          }
        }

        // Create payment notification
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "payment_received",
          title: "Payment Successful! ✅",
          message: `Your payment of ${totalAmount.toFixed(3)} TND for "${productName || 'your purchase'}" has been received.`,
        }).catch(err => console.error('Failed to create payment notification:', err))
      } catch (emailError) {
        console.error("Error sending payment emails:", emailError)
        // Don't fail the webhook if email fails
      }

      return NextResponse.json({ success: true, message: "Payment processed" })
    }

    // Handle failed payment
    if (paymentStatus.status === 'failed') {
      if (payment) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "failed",
          })
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
              body.error || body.message || "Payment could not be processed"
            )
          }
        } catch (emailError) {
          console.error("Error sending payment failed email:", emailError)
        }
      }

      return NextResponse.json({ success: true, message: "Payment failure recorded" })
    }

    // Handle other statuses (pending, cancelled, etc.)
    return NextResponse.json({ success: true, message: "Webhook received" })
  } catch (error: unknown) {
    console.error("Paymee webhook error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

