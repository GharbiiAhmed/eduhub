import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendEnrollmentEmail, sendNewStudentEnrolledEmail } from "@/lib/email"

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

      // Get user profile for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single()

      // Send enrollment email to student
      if (profile?.email && course?.title) {
        try {
          const emailResult = await sendEnrollmentEmail(
            profile.email,
            profile.full_name || 'Student',
            course.title,
            `/student/courses/${courseId}`
          )
          if (emailResult.success) {
            console.log(`✅ Enrollment email sent to ${profile.email}`)
          } else {
            console.error(`❌ Failed to send enrollment email:`, emailResult.error)
          }
        } catch (emailError: any) {
          console.error('Error sending enrollment email:', emailError)
        }
      }

      // Send email to instructor about new student enrollment
      try {
        const { data: courseData } = await supabase
          .from("courses")
          .select("instructor_id, title")
          .eq("id", courseId)
          .single()

        if (courseData?.instructor_id) {
          const { data: instructorProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", courseData.instructor_id)
            .single()

          if (instructorProfile?.email) {
            try {
              const emailResult = await sendNewStudentEnrolledEmail(
                instructorProfile.email,
                instructorProfile.full_name || 'Instructor',
                profile?.full_name || 'A new student',
                courseData.title,
                courseId
              )
              if (emailResult.success) {
                console.log(`✅ New student enrollment email sent to instructor ${instructorProfile.email}`)
              } else {
                console.error(`❌ Failed to send instructor email:`, emailResult.error)
              }
            } catch (emailError: any) {
              console.error('Error sending instructor email:', emailError)
            }
          }
        }
      } catch (instructorEmailError) {
        console.error('Error sending instructor enrollment email:', instructorEmailError)
      }

      // Create in-app notification
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
