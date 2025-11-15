import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 })
    }

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert({
        student_id: user.id,
        course_id: courseId,
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Notify user about successful enrollment
    try {
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single()

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'course_added',
          title: 'Enrollment Successful! 🎓',
          message: `You've successfully enrolled in "${course?.title || 'the course'}". Start learning now!`,
          link: `/student/courses/${courseId}`,
          relatedId: courseId,
          relatedType: 'course'
        })
      }).catch(err => console.error('Failed to create enrollment notification:', err))
    } catch (notifError) {
      console.error('Error creating enrollment notification:', notifError)
    }

    return NextResponse.json({ success: true, enrollment }, { status: 201 })
  } catch (error) {
    console.error("[v0] Enrollment error:", error)
    return NextResponse.json({ error: "Failed to enroll in course" }, { status: 500 })
  }
}
