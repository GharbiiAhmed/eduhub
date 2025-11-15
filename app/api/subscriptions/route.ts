import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - List user's subscriptions
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        courses(id, title, thumbnail_url),
        books(id, title, cover_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    return NextResponse.json({ subscriptions: subscriptions || [] })
  } catch (error: unknown) {
    console.error("Error in subscriptions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


