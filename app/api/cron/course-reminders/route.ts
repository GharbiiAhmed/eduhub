import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Cron job endpoint for sending course reminder emails to inactive students
 * Called by GitHub Actions on schedule (every day at 10 AM UTC)
 * 
 * GitHub Actions workflow: .github/workflows/course-reminders.yml
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (required for GitHub Actions)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // Get all active students with enrollments
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, course_id, progress_percentage, updated_at")
      .lt("progress_percentage", 100) // Only incomplete courses

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ success: true, message: "No inactive enrollments found" })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let successCount = 0
    let errorCount = 0

    // Group by student and course, find inactive ones
    for (const enrollment of enrollments) {
      const lastActivity = new Date(enrollment.updated_at || enrollment.student_id) // Fallback if updated_at is null
      const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

      // Send reminder if inactive for 3, 7, or 14 days
      if (daysInactive >= 3 && (daysInactive === 3 || daysInactive === 7 || daysInactive === 14)) {
        try {
          const response = await fetch(`${baseUrl}/api/emails/course-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.INTERNAL_API_KEY || ''
            },
            body: JSON.stringify({
              userId: enrollment.student_id,
              courseId: enrollment.course_id,
              daysInactive: daysInactive
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
          console.error(`Error sending reminder to user ${enrollment.student_id}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Course reminder emails processed",
      sent: successCount,
      errors: errorCount,
      total: enrollments.length
    })
  } catch (error: any) {
    console.error("Error in course reminders cron job:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


