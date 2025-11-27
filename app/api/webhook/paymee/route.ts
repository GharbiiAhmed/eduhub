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

    // Extract payment information from Paymee webhook
    // Paymee sends: token, check_sum, payment_status (boolean), order_id, amount, etc.
    const token = body.token // Paymee payment token
    const paymentStatus = body.payment_status // boolean: true = success, false = failed
    const checkSum = body.check_sum // For verification
    const orderId = body.order_id
    const amount = body.amount
    const transactionId = body.transaction_id // Only present if payment successful
    const receivedAmount = body.received_amount // Amount after fees
    const cost = body.cost // Paymee fee

    if (!token) {
      console.error("Missing token in webhook")
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Verify check_sum: md5(token + payment_status(1 or 0) + API Token)
    if (checkSum && process.env.PAYMEE_API_KEY) {
      const crypto = await import('crypto')
      const expectedCheckSum = crypto
        .createHash('md5')
        .update(token + (paymentStatus ? '1' : '0') + process.env.PAYMEE_API_KEY)
        .digest('hex')
      
      if (checkSum !== expectedCheckSum) {
        console.error("Invalid check_sum in webhook")
        return NextResponse.json({ error: "Invalid check_sum" }, { status: 401 })
      }
    }

    // Extract userId from order_id (format: courseId-timestamp-userIdPrefix)
    let userId: string | null = null
    if (orderId) {
      const orderParts = orderId.split('-')
      if (orderParts.length >= 3) {
        // Try to find payment record by order_id to get userId
        const { data: paymentRecord } = await supabaseAdmin
          .from("payments")
          .select("user_id")
          .eq("paymee_payment_id", token)
          .single()
        userId = paymentRecord?.user_id || null
      }
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

    // Payment status from Paymee webhook
    const isPaymentSuccessful = paymentStatus === true

    console.log("🔔 Paymee webhook received - Payment status:", {
      token,
      paymentStatus: isPaymentSuccessful,
      orderId,
      amount,
      transactionId,
      receivedAmount,
      cost,
      timestamp: new Date().toISOString()
    })

    // Find payment record by token (Paymee uses token as payment ID)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("paymee_payment_id", token)
      .single()

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error("Error fetching payment:", paymentError)
    }

    // Get userId from payment record if not extracted from orderId
    if (!userId && payment) {
      userId = payment.user_id
    }

    // Extract courseId/bookId and purchase type from orderId or payment record
    let courseId: string | null = null
    let bookId: string | null = null
    let purchaseType: string | null = null // For books: 'digital', 'physical', or 'both'
    
    if (orderId) {
      const orderParts = orderId.split('-')
      if (orderParts.length >= 1) {
        const productId = orderParts[0]
        // Check if it's a course or book ID
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("id", productId)
          .single()
        if (course) {
          courseId = productId
        } else {
          const { data: book } = await supabaseAdmin
            .from("books")
            .select("id")
            .eq("id", productId)
            .single()
          if (book) {
            bookId = productId
            // Extract purchase type from orderId (format: bookId-type-timestamp-userId)
            // Since bookId is a UUID (has dashes), we need to extract it differently
            if (orderId && orderId.startsWith(bookId)) {
              // Remove bookId prefix (including the dash after it)
              const remaining = orderId.substring(bookId.length + 1) // +1 to skip the dash
              const parts = remaining.split("-")
              // First part after bookId should be the purchase type
              if (parts.length > 0 && ['digital', 'physical', 'both'].includes(parts[0])) {
                purchaseType = parts[0]
              }
            } else {
              // Fallback: try to find purchase type in the orderId
              if (orderId.includes("-physical-") || orderId.endsWith("-physical")) {
                purchaseType = "physical"
              } else if (orderId.includes("-digital-") || orderId.endsWith("-digital")) {
                purchaseType = "digital"
              } else if (orderId.includes("-both-") || orderId.endsWith("-both")) {
                purchaseType = "both"
              }
            }
          }
        }
      }
    }
    
    if (payment) {
      courseId = payment.course_id || courseId
      bookId = payment.book_id || bookId
      if (!userId) userId = payment.user_id
    }

    // Handle successful payment
    if (isPaymentSuccessful) {
      if (!userId) {
        console.error("Missing userId in payment record")
        return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
      }

      const totalAmount = receivedAmount || amount || 0 // Use received_amount (after fees) if available
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
          .select("instructor_id, title")
          .eq("id", bookId)
          .single()
        creatorId = book?.instructor_id || null
        productName = book?.title || ""
      }

      // Update or create payment record
      if (payment) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            amount: totalAmount,
            currency: "TND",
            paymee_payment_id: token,
            transaction_id: transactionId,
            platform_commission: platformCommission,
            creator_earnings: creatorEarnings,
            completed_at: new Date().toISOString(),
          })
          .eq("id", payment.id)
      } else {
        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          paymee_payment_id: token,
          amount: totalAmount,
          currency: "TND",
          status: "completed",
          payment_type: courseId ? "course" : "book",
          course_id: courseId || null,
          book_id: bookId || null,
          transaction_id: transactionId,
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
          .eq("student_id", userId)
          .eq("course_id", courseId)
          .single()

        if (!existingEnrollment) {
          await supabaseAdmin.from("enrollments").insert({
            student_id: userId,
            course_id: courseId,
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
        console.log("📚 Processing book purchase in webhook:", { bookId, userId, purchaseType, orderId, token })
        
        const { data: existingPurchase, error: checkError } = await supabaseAdmin
          .from("book_purchases")
          .select("id")
          .eq("student_id", userId)
          .eq("book_id", bookId)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error("Error checking existing purchase:", checkError)
        }

        if (!existingPurchase) {
          // Get book to determine purchase type and price
          const { data: book, error: bookError } = await supabaseAdmin
            .from("books")
            .select("price, title")
            .eq("id", bookId)
            .single()

          if (bookError) {
            console.error("Error fetching book:", bookError)
          }

          if (!book) {
            console.error("Book not found:", bookId)
          } else {
            // Use purchase type from orderId, default to "digital" if not specified
            const finalPurchaseType = purchaseType || "digital"

            const { data: newPurchase, error: insertError } = await supabaseAdmin
              .from("book_purchases")
              .insert({
                student_id: userId,
                book_id: bookId,
                purchase_type: finalPurchaseType,
                price_paid: totalAmount || book?.price || 0,
              })
              .select()
              .single()
            
            if (insertError) {
              console.error("Error creating book purchase:", insertError)
              console.error("Purchase data:", {
                student_id: userId,
                book_id: bookId,
                purchase_type: finalPurchaseType,
                price_paid: totalAmount || book?.price || 0,
              })
            } else {
              console.log("✅ Book purchase created successfully:", {
                purchase_id: newPurchase?.id,
                student_id: userId,
                book_id: bookId,
                book_title: book?.title,
                purchase_type: finalPurchaseType,
                price_paid: totalAmount || book?.price || 0
              })

              // Create notification for book purchase
              try {
                await supabaseAdmin.from("notifications").insert({
                  user_id: userId,
                  type: "payment_received",
                  title: "Book Purchase Successful! 📚",
                  message: `You've successfully purchased "${book?.title || 'the book'}". Access it now!`,
                  link: `/student/books/${bookId}`,
                  related_id: bookId,
                  related_type: "book"
                })
                console.log("✅ Book purchase notification created")
              } catch (notifError) {
                console.error("Failed to create book purchase notification:", notifError)
              }
            }
          }
        } else {
          console.log("Book purchase already exists:", existingPurchase.id)
        }
      } else {
        console.log("No bookId found in webhook payload")
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
    if (!isPaymentSuccessful) {
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

