import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Get all shipments (purchases) for a book
 * GET /api/instructor/books/[bookId]/shipments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify instructor owns this book
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, instructor_id")
      .eq("id", bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    if (book.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all purchases for this book (physical or both)
    const { data: purchases, error: purchasesError } = await supabase
      .from("book_purchases")
      .select("*")
      .eq("book_id", bookId)
      .in("purchase_type", ["physical", "both"])
      .order("purchased_at", { ascending: false })

    // Get student profiles separately to avoid join issues
    const studentIds = purchases?.map(p => p.student_id).filter(Boolean) || []
    let studentProfiles: Record<string, any> = {}
    
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds)
      
      if (profiles) {
        profiles.forEach(profile => {
          studentProfiles[profile.id] = profile
        })
      }
    }

    // Combine purchases with student profiles
    const purchasesWithProfiles = purchases?.map(purchase => ({
      ...purchase,
      profiles: studentProfiles[purchase.student_id] || null
    })) || []

    if (purchasesError) {
      console.error("Error fetching shipments:", purchasesError)
      return NextResponse.json(
        { error: "Failed to fetch shipments", details: purchasesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ purchases: purchasesWithProfiles })
  } catch (error: any) {
    console.error("Error in GET shipments:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update delivery status for a purchase
 * PATCH /api/instructor/books/[bookId]/shipments
 * Body: { purchaseId, deliveryStatus, trackingNumber?, carrierName?, shippingAddress? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const body = await request.json()
    const { purchaseId, deliveryStatus, trackingNumber, carrierName, shippingAddress } = body

    if (!purchaseId || !deliveryStatus) {
      return NextResponse.json(
        { error: "Missing purchaseId or deliveryStatus" },
        { status: 400 }
      )
    }

    const validStatuses = ["pending", "processing", "shipped", "in_transit", "delivered", "cancelled"]
    if (!validStatuses.includes(deliveryStatus)) {
      return NextResponse.json(
        { error: "Invalid delivery status" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify instructor owns this book
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, instructor_id")
      .eq("id", bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    if (book.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify purchase belongs to this book
    const { data: purchase, error: purchaseError } = await supabase
      .from("book_purchases")
      .select("id, book_id")
      .eq("id", purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    if (purchase.book_id !== bookId) {
      return NextResponse.json({ error: "Purchase does not belong to this book" }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      delivery_status: deliveryStatus,
    }

    if (trackingNumber !== undefined) {
      updateData.tracking_number = trackingNumber || null
    }

    if (carrierName !== undefined) {
      updateData.carrier_name = carrierName || null
    }

    if (shippingAddress !== undefined) {
      updateData.shipping_address = shippingAddress || null
    }

    // Set timestamps based on status
    if (deliveryStatus === "shipped" || deliveryStatus === "in_transit") {
      // Check if already shipped to avoid overwriting
      const { data: currentPurchase } = await supabase
        .from("book_purchases")
        .select("shipped_at")
        .eq("id", purchaseId)
        .single()

      if (!currentPurchase?.shipped_at) {
        updateData.shipped_at = new Date().toISOString()
      }
    }

    if (deliveryStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString()
      // Also set shipped_at if not already set
      const { data: currentPurchase } = await supabase
        .from("book_purchases")
        .select("shipped_at")
        .eq("id", purchaseId)
        .single()

      if (!currentPurchase?.shipped_at) {
        updateData.shipped_at = new Date().toISOString()
      }
    }

    // Update purchase
    const { data: updatedPurchase, error: updateError } = await supabase
      .from("book_purchases")
      .update(updateData)
      .eq("id", purchaseId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating shipment:", updateError)
      return NextResponse.json(
        { error: "Failed to update shipment", details: updateError.message },
        { status: 500 }
      )
    }

    // Create notification for student
    try {
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", updatedPurchase.student_id)
        .single()

      let notificationMessage = ""
      if (deliveryStatus === "shipped") {
        notificationMessage = `Your order for "${book.title || "the book"}" has been shipped!`
        if (trackingNumber) {
          notificationMessage += ` Tracking: ${trackingNumber}`
        }
      } else if (deliveryStatus === "delivered") {
        notificationMessage = `Your order for "${book.title || "the book"}" has been delivered!`
      } else if (deliveryStatus === "in_transit") {
        notificationMessage = `Your order for "${book.title || "the book"}" is in transit.`
      }

      if (notificationMessage) {
        await supabase.from("notifications").insert({
          user_id: updatedPurchase.student_id,
          type: "payment_received",
          title: "Shipment Update 📦",
          message: notificationMessage,
          link: `/student/books/${bookId}`,
          related_id: bookId,
          related_type: "book",
        })
      }
    } catch (notifError) {
      console.error("Failed to create notification:", notifError)
      // Don't fail the update if notification fails
    }

    return NextResponse.json({
      success: true,
      purchase: updatedPurchase,
    })
  } catch (error: any) {
    console.error("Error in PATCH shipments:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

