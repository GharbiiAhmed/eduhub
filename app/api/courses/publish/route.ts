import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendCoursePublishedEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, courseTitle } = body

    if (!courseId || !courseTitle) {
      return NextResponse.json({ error: "Course ID and Course Title are required" }, { status: 400 })
    }

    // Use service role client if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Get course details and instructor
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title, instructor_id")
      .eq("id", courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get instructor profile
    const { data: instructorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", course.instructor_id)
      .single()

    const instructorName = instructorProfile?.full_name || 'Instructor'

    // Get all students (for course discovery) - you might want to limit this to students interested in this category
    // For now, we'll notify enrolled students
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)

    const studentIds = enrollments ? enrollments.map(e => e.student_id) : []

    // Get student profiles for emails
    if (studentIds.length > 0) {
      const { data: studentProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", studentIds)

      // Send emails to enrolled students
      if (studentProfiles) {
        for (const student of studentProfiles) {
          if (student.email) {
            try {
              const emailResult = await sendCoursePublishedEmail(
                student.email,
                student.full_name || 'Student',
                course.title,
                courseId,
                instructorName
              )
              if (emailResult.success) {
                console.log(`✅ Course published email sent to ${student.email}`)
              } else {
                console.error(`❌ Failed to send course published email:`, emailResult.error)
              }
            } catch (emailError: any) {
              console.error('Error sending course published email:', emailError)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, notified: studentIds.length })
  } catch (error: any) {
    console.error("Error notifying students about course publication:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


















