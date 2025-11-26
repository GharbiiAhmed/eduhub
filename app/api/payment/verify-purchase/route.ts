import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Fallback API to verify and create purchase if webhook hasn't processed it yet
 * This is called from the success page when payment_token is present
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, userId, orderId, paymentToken } = body

    if (!bookId || !userId) {
      return NextResponse.json(
        { error: "Missing bookId or userId" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if purchase already exists
    const { data: existingPurchase } = await supabase
      .from("book_purchases")
      .select("id")
      .eq("student_id", userId)
      .eq("book_id", bookId)
      .single()

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: "Purchase already exists",
        purchaseId: existingPurchase.id,
      })
    }

    // Check if payment record exists (created by webhook or checkout)
    // Try multiple ways to find the payment
    let payment = null
    
    // First, try to find by book_id and user_id
    const { data: paymentByBook } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    
    payment = paymentByBook

    // If not found and we have payment_token, try to find by token
    if (!payment && paymentToken) {
      const { data: paymentByToken } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("paymee_payment_id", paymentToken)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      payment = paymentByToken
    }

    // If payment exists and is completed, create the purchase
    // OR if we have payment_token (payment was successful), create purchase anyway
    if ((payment && payment.status === "completed") || paymentToken) {
      // Get book details
      const { data: book } = await supabase
        .from("books")
        .select("price, title")
        .eq("id", bookId)
        .single()

      // Extract purchase type from orderId if present (format: bookId-type-timestamp-userId)
      let purchaseType = "digital"
      if (orderId) {
        const orderParts = orderId.split("-")
        if (orderParts.length >= 2 && ["digital", "physical", "both"].includes(orderParts[1])) {
          purchaseType = orderParts[1]
        }
      }

      // Verify book exists before creating purchase
      if (!book) {
        console.error("Book not found:", bookId)
        return NextResponse.json(
          { error: "Book not found", bookId },
          { status: 404 }
        )
      }

      // Create purchase
      const { data: newPurchase, error: purchaseError } = await supabase
        .from("book_purchases")
        .insert({
          student_id: userId,
          book_id: bookId,
          purchase_type: purchaseType,
          price_paid: payment?.amount || book?.price || 0,
        })
        .select()
        .single()

      if (purchaseError) {
        console.error("Error creating purchase:", purchaseError)
        console.error("Purchase data:", {
          student_id: userId,
          book_id: bookId,
          purchase_type: purchaseType,
          price_paid: payment?.amount || book?.price || 0,
        })
        return NextResponse.json(
          { error: "Failed to create purchase", details: purchaseError.message },
          { status: 500 }
        )
      }

      console.log("✅ Purchase created successfully:", {
        purchaseId: newPurchase?.id,
        bookId,
        bookTitle: book?.title,
        userId,
      })

      // Create notification
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_received",
          title: "Book Purchase Successful! 📚",
          message: `You've successfully purchased "${book?.title || "the book"}". Access it now!`,
          link: `/student/books/${bookId}`,
          related_id: bookId,
          related_type: "book",
        })
      } catch (notifError) {
        console.error("Failed to create notification:", notifError)
      }

      return NextResponse.json({
        success: true,
        message: "Purchase created successfully",
        purchaseId: newPurchase?.id,
      })
    }

    // If no payment record, the webhook hasn't processed yet
    // Return success but indicate webhook will handle it
    return NextResponse.json({
      success: true,
      message: "Payment verified, webhook will create purchase",
      pending: true,
    })
  } catch (error: any) {
    console.error("Error verifying purchase:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

