import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Diagnostic endpoint to check payments
 * Usage: GET /api/debug/payments?userId=xxx
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

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (paymentsError) {
      return NextResponse.json(
        { error: "Error fetching payments", details: paymentsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      userId,
      totalPayments: payments?.length || 0,
      payments: payments?.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        book_id: p.book_id,
        course_id: p.course_id,
        status: p.status,
        amount: p.amount,
        payment_type: p.payment_type,
        paymee_payment_id: p.paymee_payment_id,
        created_at: p.created_at,
      })) || [],
    })
  } catch (error: any) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

