import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Manual endpoint to create a book purchase
 * Usage: POST /api/payment/create-purchase
 * Body: { bookId, userId, purchaseType?, pricePaid? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, userId, purchaseType = "digital", pricePaid } = body

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
      .maybeSingle()

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: "Purchase already exists",
        purchaseId: existingPurchase.id,
      })
    }

    // Get book details
    const { data: book } = await supabase
      .from("books")
      .select("price, title")
      .eq("id", bookId)
      .single()

    if (!book) {
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
        price_paid: pricePaid || book.price || 0,
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

    console.log("✅ Purchase created:", {
      purchaseId: newPurchase?.id,
      bookId,
      bookTitle: book.title,
      userId,
    })

    return NextResponse.json({
      success: true,
      message: "Purchase created successfully",
      purchaseId: newPurchase?.id,
      bookId,
      bookTitle: book.title,
    })
  } catch (error: any) {
    console.error("Error creating purchase:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

