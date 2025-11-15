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

    const { courseId, lessonId, completed } = await request.json()

    console.log("🔄 Progress update request:", { courseId, lessonId, completed, userId: user.id })

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: "Course ID and Lesson ID are required" }, { status: 400 })
    }

    // Update lesson progress
    const { error: progressError } = await supabase.from("lesson_progress").upsert(
      {
        student_id: user.id,
        lesson_id: lessonId,
        completed: completed || false,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "student_id,lesson_id" },
    )

    if (progressError) {
      console.error("❌ Progress error:", progressError)
      throw progressError
    }

    console.log("✅ Lesson progress updated successfully")

    // Get modules for this course
    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("id")
      .eq("course_id", courseId)

    console.log("📦 Modules:", modules)
    console.log("❌ Modules Error:", modulesError)

    if (modulesError) throw modulesError

    if (!modules || modules.length === 0) {
      console.log("⚠️ No modules found for course")
      return NextResponse.json({ success: true, progressPercentage: 0, message: "No modules found" }, { status: 200 })
    }

    // Get lessons for all modules
    const moduleIds = modules.map(m => m.id)
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds)

    console.log("📖 Lessons:", lessons)
    console.log("❌ Lessons Error:", lessonsError)

    if (lessonsError) throw lessonsError

    if (!lessons || lessons.length === 0) {
      console.log("⚠️ No lessons found for course")
      return NextResponse.json({ success: true, progressPercentage: 0, message: "No lessons found" }, { status: 200 })
    }

    // Get completed lessons
    const lessonIds = lessons.map(l => l.id)
    const { data: completedLessons, error: completedError } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("student_id", user.id)
      .eq("completed", true)
      .in("lesson_id", lessonIds)

    console.log("✅ Completed Lessons:", completedLessons)
    console.log("❌ Completed Error:", completedError)

    if (completedError) throw completedError

    // Calculate progress percentage
    const progressPercentage = Math.round(((completedLessons?.length || 0) / lessons.length) * 100)

    console.log(`📊 Progress: ${completedLessons?.length || 0}/${lessons.length} = ${progressPercentage}%`)

    // Update enrollment progress
    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .update({ progress_percentage: progressPercentage })
      .eq("student_id", user.id)
      .eq("course_id", courseId)

    if (enrollmentError) {
      console.error("❌ Enrollment update error:", enrollmentError)
      throw enrollmentError
    }

    console.log("✅ Enrollment progress updated successfully")

    // Automatically generate certificate if course is completed (100%)
    let certificateGenerated = false
    if (progressPercentage === 100) {
      try {
        // Check if certificate already exists
        const { data: existingCert } = await supabase
          .from("certificates")
          .select("*")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .single()

        if (!existingCert) {
          // Generate certificate number
          const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

          // Create certificate
          const { data: certificate, error: certError } = await supabase
            .from("certificates")
            .insert({
              student_id: user.id,
              course_id: courseId,
              certificate_number: certificateNumber,
            })
            .select()
            .single()

          if (certError) {
            console.error("❌ Certificate generation error:", certError)
            // Don't throw - certificate generation failure shouldn't break progress update
          } else {
            console.log("🎓 Certificate automatically generated:", certificate.certificate_number)
            certificateGenerated = true

            // Get course details for notification
            const { data: course } = await supabase
              .from("courses")
              .select("title")
              .eq("id", courseId)
              .single()

            // Notify student about course completion and certificate
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  type: 'course_completed',
                  title: 'Course Completed! 🎉',
                  message: `Congratulations! You've completed "${course?.title || 'the course'}".`,
                  link: `/student/courses/${courseId}`,
                  relatedId: courseId,
                  relatedType: 'course'
                })
              }).catch(err => console.error('Failed to create course completed notification:', err))

              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  type: 'certificate_earned',
                  title: 'Certificate Earned! 🏆',
                  message: `You've earned a certificate for completing "${course?.title || 'the course'}". View your certificate now!`,
                  link: `/certificates/${certificate.certificate_number}`,
                  relatedId: certificate.id,
                  relatedType: 'certificate'
                })
              }).catch(err => console.error('Failed to create certificate notification:', err))
            } catch (notifError) {
              console.error('Error creating notifications:', notifError)
            }
          }
        } else {
          console.log("✅ Certificate already exists for this course")
        }
      } catch (certError) {
        console.error("❌ Error during certificate generation:", certError)
        // Don't throw - certificate generation failure shouldn't break progress update
      }
    }

    return NextResponse.json({ 
      success: true, 
      progressPercentage,
      certificateGenerated,
      details: {
        totalLessons: lessons.length,
        completedLessons: completedLessons?.length || 0,
        modules: modules.length
      }
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Progress update error:", error)
    return NextResponse.json({ error: "Failed to update progress", details: error }, { status: 500 })
  }
}
