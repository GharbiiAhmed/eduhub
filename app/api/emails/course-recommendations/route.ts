import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendCourseRecommendationsEmail } from "@/lib/email"

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
    const { userId, courseIds } = body

    if (!userId || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: "User ID and Course IDs array are required" }, { status: 400 })
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

    // Get recommended courses
    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, title, price, instructor_id")
      .in("id", courseIds)
      .eq("status", "published")

    if (!courses || courses.length === 0) {
      return NextResponse.json({ error: "No courses found" }, { status: 404 })
    }

    // Get instructor names
    const instructorIds = [...new Set(courses.map(c => c.instructor_id).filter(Boolean))]
    const { data: instructors } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", instructorIds)

    const instructorMap = new Map(instructors?.map(i => [i.id, i.full_name || 'Instructor']) || [])

    // Format courses for email
    const courseList = courses.map(course => ({
      id: course.id,
      title: course.title,
      instructor: instructorMap.get(course.instructor_id) || 'Instructor',
      price: course.price || 0
    }))

    // Send recommendations email
    const emailResult = await sendCourseRecommendationsEmail(
      profile.email,
      profile.full_name || 'Student',
      courseList
    )

    if (emailResult.success) {
      console.log(`✅ Course recommendations email sent to ${profile.email}`)
      return NextResponse.json({ success: true })
    } else {
      console.error(`❌ Failed to send course recommendations email:`, emailResult.error)
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error sending course recommendations email:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}























