import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { courseId } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has completed the course
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (!enrollment || enrollment.progress_percentage < 100) {
      return NextResponse.json({ error: "Course not completed" }, { status: 400 })
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("*")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (existingCert) {
      return NextResponse.json({ certificate: existingCert })
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create certificate
    const { data: certificate, error } = await supabase
      .from("certificates")
      .insert({
        student_id: user.id,
        course_id: courseId,
        certificate_number: certificateNumber,
      })
      .select()
      .single()

    if (error) throw error

    // Get course details for notification
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()

    // Notify student about certificate
    try {
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
      console.error('Error creating certificate notification:', notifError)
    }

    return NextResponse.json({ certificate })
  } catch (error: unknown) {
    console.error("Certificate generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
