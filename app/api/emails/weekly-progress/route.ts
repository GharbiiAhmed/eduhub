import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendWeeklyProgressReportEmail } from "@/lib/email"

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
    const { userId } = body

    // If userId is provided, send to that user only
    // Otherwise, send to all active students (for scheduled job)
    let userIds: string[] = []

    if (userId) {
      userIds = [userId]
    } else {
      // Get all active students
      const { data: students } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .in("status", ["active", "approved"])

      if (students) {
        userIds = students.map(s => s.id)
      }
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, message: "No users to notify" })
    }

    let successCount = 0
    let errorCount = 0

    // Calculate date range for the past week
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    for (const userId of userIds) {
      try {
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single()

        if (!profile?.email) continue

        // Get user's progress stats for the past week
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("course_id, progress_percentage")
          .eq("student_id", userId)

        // Get completed courses this week
        const coursesCompleted = enrollments?.filter(e => e.progress_percentage === 100).length || 0

        // Get lesson progress for the week
        const { data: lessonProgress } = await supabaseAdmin
          .from("lesson_progress")
          .select("lesson_id")
          .eq("student_id", userId)
          .eq("completed", true)
          .gte("completed_at", weekAgo.toISOString())

        const lessonsCompleted = lessonProgress?.length || 0

        // Get certificates earned this week
        const { data: certificates } = await supabaseAdmin
          .from("certificates")
          .select("id")
          .eq("student_id", userId)
          .gte("created_at", weekAgo.toISOString())

        const certificatesEarned = certificates?.length || 0

        // Estimate time spent (this is a simplified calculation)
        // In a real system, you'd track actual time spent
        const timeSpent = lessonsCompleted * 30 // Assume 30 minutes per lesson

        // Get courses in progress
        const coursesInProgress = enrollments?.filter(e => e.progress_percentage > 0 && e.progress_percentage < 100).length || 0

        const stats = {
          coursesCompleted,
          lessonsCompleted,
          certificatesEarned,
          timeSpent,
          coursesInProgress
        }

        // Send email
        const emailResult = await sendWeeklyProgressReportEmail(
          profile.email,
          profile.full_name || 'Student',
          stats
        )

        if (emailResult.success) {
          successCount++
          console.log(`✅ Weekly progress email sent to ${profile.email}`)
        } else {
          errorCount++
          console.error(`❌ Failed to send weekly progress email:`, emailResult.error)
        }
      } catch (error: any) {
        errorCount++
        console.error(`Error sending weekly progress email to user ${userId}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: userIds.length
    })
  } catch (error: any) {
    console.error("Error sending weekly progress emails:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
















