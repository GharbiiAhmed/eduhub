import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendNewLessonAddedEmail } from "@/lib/email"

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
    const { lessonId, courseId, lessonTitle } = body

    if (!lessonId || !courseId || !lessonTitle) {
      return NextResponse.json({ error: "Lesson ID, Course ID, and Lesson Title are required" }, { status: 400 })
    }

    // Use service role client if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Get course details
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get enrolled students
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("course_id", courseId)

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ success: true, message: "No enrolled students to notify" })
    }

    const studentIds = enrollments.map(e => e.student_id)

    // Get student profiles for emails
    const { data: studentProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", studentIds)

    // Send emails to enrolled students
    if (studentProfiles) {
      for (const student of studentProfiles) {
        if (student.email) {
          try {
            const emailResult = await sendNewLessonAddedEmail(
              student.email,
              student.full_name || 'Student',
              course.title,
              lessonTitle,
              courseId
            )
            if (emailResult.success) {
              console.log(`✅ New lesson email sent to ${student.email}`)
            } else {
              console.error(`❌ Failed to send new lesson email:`, emailResult.error)
            }
          } catch (emailError: any) {
            console.error('Error sending new lesson email:', emailError)
          }
        }
      }
    }

    return NextResponse.json({ success: true, notified: studentIds.length })
  } catch (error: any) {
    console.error("Error notifying students about new lesson:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
























