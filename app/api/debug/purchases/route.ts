import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Diagnostic endpoint to check book purchases
 * Usage: GET /api/debug/purchases?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from("book_purchases")
      .select("*")
      .eq("student_id", userId)
      .order("purchased_at", { ascending: false })

    if (purchasesError) {
      return NextResponse.json(
        { error: "Error fetching purchases", details: purchasesError.message },
        { status: 500 }
      )
    }

    // Get book IDs
    const bookIds = purchases?.map((p) => p.book_id).filter(Boolean) || []

    // Get books
    const { data: books, error: booksError } =
      bookIds.length > 0
        ? await supabase.from("books").select("*").in("id", bookIds)
        : { data: null, error: null }

    if (booksError) {
      return NextResponse.json(
        { error: "Error fetching books", details: booksError.message },
        { status: 500 }
      )
    }

    // Map purchases with books
    const purchasesWithBooks = purchases?.map((purchase) => {
      const book = books?.find((b) => b.id === purchase.book_id) || null
      return {
        purchase: {
          id: purchase.id,
          book_id: purchase.book_id,
          student_id: purchase.student_id,
          purchase_type: purchase.purchase_type,
          price_paid: purchase.price_paid,
          purchased_at: purchase.purchased_at,
        },
        book: book
          ? {
              id: book.id,
              title: book.title,
              author: book.author,
            }
          : null,
        hasBook: !!book,
      }
    }) || []

    return NextResponse.json({
      userId,
      totalPurchases: purchases?.length || 0,
      purchasesWithBooks: purchasesWithBooks.length,
      purchasesWithoutBooks: purchasesWithBooks.filter((p) => !p.hasBook).length,
      purchases: purchasesWithBooks,
      bookIds,
      booksFound: books?.length || 0,
    })
  } catch (error: any) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

