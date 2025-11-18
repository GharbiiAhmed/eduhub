import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// POST - Reject a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await request.json()
    const { reason } = body

    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single()

    if (currentProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Use service role to update user status
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user status to inactive (rejected)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ status: "inactive" })
      .eq("id", userId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Create notification for the user
    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        type: 'account_rejected',
        title: 'Account Registration Rejected',
        message: reason || 'Your account registration has been rejected. Please contact support for more information.',
        link: '/contact',
        related_id: userId,
        related_type: 'user'
      })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
    }

    // TODO: Send email to user
    console.log(`User ${userProfile.email} has been rejected`)

    return NextResponse.json({ 
      success: true,
      message: "User rejected successfully"
    })
  } catch (error) {
    console.error("Error rejecting user:", error)
    return NextResponse.json(
      { error: "Failed to reject user" },
      { status: 500 }
    )
  }
}


