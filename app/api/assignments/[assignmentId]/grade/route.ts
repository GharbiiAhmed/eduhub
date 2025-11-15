import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { assignmentId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden - Instructor only" }, { status: 403 })
    }

    const body = await request.json()
    const { submissionId, score, feedback } = body

    if (!submissionId || score === undefined) {
      return NextResponse.json(
        { error: "Submission ID and score are required" },
        { status: 400 }
      )
    }

    // Get submission and verify instructor owns the course
    const { data: submission, error: subError } = await supabase
      .from("assignment_submissions")
      .select(`
        *,
        assignments!inner(
          id,
          course_id,
          title,
          courses!inner(instructor_id)
        )
      `)
      .eq("id", submissionId)
      .eq("assignment_id", assignmentId)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Verify instructor owns the course
    if (submission.assignments.courses.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update submission with grade and feedback
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("assignment_submissions")
      .update({
        score: Math.max(0, Math.min(score, submission.assignments.max_points || 100)),
        feedback: feedback || null,
        status: "graded",
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq("id", submissionId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify student about assignment feedback
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: submission.student_id,
          type: 'assignment_feedback',
          title: 'Assignment Graded! 📝',
          message: `Your assignment "${submission.assignments.title}" has been graded. You received ${score} points.`,
          link: `/student/assignments/${assignmentId}`,
          relatedId: submissionId,
          relatedType: 'assignment_submission'
        })
      }).catch(err => console.error('Failed to create assignment feedback notification:', err))
    } catch (notifError) {
      console.error('Error creating assignment feedback notification:', notifError)
    }

    return NextResponse.json({ submission: updatedSubmission })
  } catch (error: any) {
    console.error("Error grading assignment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

















