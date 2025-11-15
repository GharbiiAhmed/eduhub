import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{
    notificationId: string
  }>
}

// DELETE - Delete a notification
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { notificationId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify notification belongs to user
    const { data: notification, error: subError } = await supabase
      .from("notifications")
      .select("id")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .single()

    if (subError || !notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)

    if (deleteError) {
      console.error("Error deleting notification:", deleteError)
      return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error in notifications API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


