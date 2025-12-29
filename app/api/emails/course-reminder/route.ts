import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendCourseReminderEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected with an API key or admin auth
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    const body = await request.json()
    const { userId, courseId, daysInactive } = body

    if (!userId || !courseId || !daysInactive) {
      return NextResponse.json({ error: "User ID, Course ID, and Days Inactive are required" }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get course details
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Send reminder email
    const emailResult = await sendCourseReminderEmail(
      profile.email,
      profile.full_name || 'Student',
      course.title,
      courseId,
      daysInactive
    )

    if (emailResult.success) {
      console.log(`✅ Course reminder email sent to ${profile.email}`)
      return NextResponse.json({ success: true })
    } else {
      console.error(`❌ Failed to send course reminder email:`, emailResult.error)
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error sending course reminder email:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


















