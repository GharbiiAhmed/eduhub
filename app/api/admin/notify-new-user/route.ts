import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// POST - Notify admin about new user registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, fullName, role } = body

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get all admin users
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")

    if (!admins || admins.length === 0) {
      console.log("No admin users found to notify")
      return NextResponse.json({ success: true, notified: 0 })
    }

    // Create notifications for all admins
    // This endpoint is only called for instructors (students are auto-approved)
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'user_registration',
      title: 'New Instructor Registration - Approval Required',
      message: `New instructor registered: ${fullName} (${email}). Please review and approve their account.`,
      link: `/admin/users/${userId}`,
      related_id: userId,
      related_type: 'user'
    }))

    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)

    if (notificationError) {
      console.error("Error creating notifications:", notificationError)
    }

    // TODO: Send email to admins
    // You can integrate with Resend, SendGrid, or Supabase Email here
    // For now, we'll just log it
    console.log(`New user registration: ${fullName} (${email}) - Role: ${role}`)
    console.log(`Notified ${admins.length} admin(s)`)

    return NextResponse.json({ 
      success: true, 
      notified: admins.length 
    })
  } catch (error) {
    console.error("Error notifying admin:", error)
    return NextResponse.json(
      { error: "Failed to notify admin" },
      { status: 500 }
    )
  }
}

