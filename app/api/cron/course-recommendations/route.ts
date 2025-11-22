import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Cron job endpoint for sending course recommendation emails
 * Called by GitHub Actions on schedule (every Sunday at 11 AM UTC)
 * 
 * GitHub Actions workflow: .github/workflows/course-recommendations.yml
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

    // Get all active students
    const { data: students } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "student")
      .in("status", ["active", "approved"])

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, message: "No students found" })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let successCount = 0
    let errorCount = 0

    for (const student of students) {
      try {
        // Get student's enrolled courses to find similar ones
        const { data: enrollments } = await supabaseAdmin
          .from("enrollments")
          .select("course_id")
          .eq("student_id", student.id)

        const enrolledCourseIds = enrollments?.map(e => e.course_id) || []

        // Get courses in same categories as enrolled courses
        let recommendedCourseIds: string[] = []

        if (enrolledCourseIds.length > 0) {
          const { data: enrolledCourses } = await supabaseAdmin
            .from("courses")
            .select("category")
            .in("id", enrolledCourseIds)

          const categories = [...new Set(enrolledCourses?.map(c => c.category).filter(Boolean) || [])]

          if (categories.length > 0) {
            const { data: recommendedCourses } = await supabaseAdmin
              .from("courses")
              .select("id")
              .in("category", categories)
              .eq("status", "published")
              .not("id", "in", `(${enrolledCourseIds.join(',')})`)
              .limit(5)

            if (recommendedCourses) {
              recommendedCourseIds = recommendedCourses.map(c => c.id)
            }
          }
        }

        // If no category-based recommendations, get popular courses
        if (recommendedCourseIds.length === 0) {
          const { data: popularCourses } = await supabaseAdmin
            .from("courses")
            .select("id")
            .eq("status", "published")
            .not("id", "in", `(${enrolledCourseIds.length > 0 ? enrolledCourseIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
            .limit(5)

          if (popularCourses) {
            recommendedCourseIds = popularCourses.map(c => c.id)
          }
        }

        // Send recommendations if we have any
        if (recommendedCourseIds.length > 0) {
          const response = await fetch(`${baseUrl}/api/emails/course-recommendations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.INTERNAL_API_KEY || ''
            },
            body: JSON.stringify({
              userId: student.id,
              courseIds: recommendedCourseIds
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        }
      } catch (error) {
        errorCount++
        console.error(`Error sending recommendations to user ${student.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Course recommendation emails processed",
      sent: successCount,
      errors: errorCount,
      total: students.length
    })
  } catch (error: any) {
    console.error("Error in course recommendations cron job:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


