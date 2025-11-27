import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Create purchase directly from payment token
 * This is used when payment was successful but webhook hasn't processed it
 * Usage: POST /api/payment/create-from-token
 * Body: { bookId, userId, paymentToken, orderId?, amount? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, userId, paymentToken, orderId, amount, upgradeExisting, existingPurchaseId } = body

    if (!bookId || !userId || !paymentToken) {
      return NextResponse.json(
        { error: "Missing bookId, userId, or paymentToken" },
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
      .select("id, purchase_type")
      .eq("student_id", userId)
      .eq("book_id", bookId)
      .maybeSingle()

    // Extract purchase type from orderId (format: bookId-type-timestamp-userId)
    // Since bookId is a UUID (has dashes), we need to extract it differently
    let purchaseType = "digital"
    if (orderId && bookId) {
      // Check if orderId starts with bookId
      if (orderId.startsWith(bookId)) {
        // Remove bookId prefix (including the dash after it)
        const remaining = orderId.substring(bookId.length + 1) // +1 to skip the dash
        const parts = remaining.split("-")
        // First part after bookId should be the purchase type
        if (parts.length > 0 && ["digital", "physical", "both"].includes(parts[0])) {
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

    // If upgrade is requested, update existing purchase to "both"
    if (upgradeExisting && existingPurchase && existingPurchaseId === existingPurchase.id) {
      const { data: updatedPurchase, error: updateError } = await supabase
        .from("book_purchases")
        .update({ purchase_type: "both" })
        .eq("id", existingPurchase.id)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error upgrading purchase:", updateError)
        return NextResponse.json(
          {
            error: "Failed to upgrade purchase",
            details: updateError.message,
          },
          { status: 500 }
        )
      }

      console.log("✅ Purchase upgraded to 'both':", {
        purchaseId: updatedPurchase?.id,
        bookId,
        userId,
      })

      return NextResponse.json({
        success: true,
        message: "Purchase upgraded successfully",
        purchaseId: updatedPurchase?.id,
        bookId,
        upgraded: true,
      })
    }

    // If purchase exists with same type, don't create duplicate
    if (existingPurchase && existingPurchase.purchase_type === purchaseType) {
      return NextResponse.json({
        success: true,
        message: "Purchase already exists with this type",
        purchaseId: existingPurchase.id,
      })
    }

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("price, title")
      .eq("id", bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json(
        { error: "Book not found", bookId, details: bookError?.message },
        { status: 404 }
      )
    }

    // Purchase type already extracted above

    // Create payment record first (for tracking)
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        paymee_payment_id: paymentToken,
        amount: amount || book.price || 0,
        currency: "TND",
        status: "completed",
        payment_type: "book",
        book_id: bookId,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.warn("Failed to create payment record (continuing anyway):", paymentError)
    }

    // Create purchase
    const { data: newPurchase, error: purchaseError } = await supabase
      .from("book_purchases")
      .insert({
        student_id: userId,
        book_id: bookId,
        purchase_type: purchaseType,
        price_paid: amount || book.price || 0,
      })
      .select()
      .single()

    if (purchaseError) {
      console.error("❌ Error creating purchase:", purchaseError)
      return NextResponse.json(
        {
          error: "Failed to create purchase",
          details: purchaseError.message,
          code: purchaseError.code,
          hint: purchaseError.hint,
        },
        { status: 500 }
      )
    }

    console.log("✅ Purchase created from token:", {
      purchaseId: newPurchase?.id,
      bookId,
      bookTitle: book.title,
      userId,
      paymentToken,
    })

    // Create notification
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "payment_received",
        title: "Book Purchase Successful! 📚",
        message: `You've successfully purchased "${book.title}". Access it now!`,
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
      bookId,
      bookTitle: book.title,
      paymentId: paymentRecord?.id,
    })
  } catch (error: any) {
    console.error("Error creating purchase from token:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

