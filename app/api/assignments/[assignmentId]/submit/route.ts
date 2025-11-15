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

    // Check if user is student
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "student") {
      return NextResponse.json({ error: "Forbidden - Students only" }, { status: 403 })
    }

    const body = await request.json()
    const { submissionText, fileUrl } = body

    // Get assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("*, courses!inner(id)")
      .eq("id", assignmentId)
      .eq("is_published", true)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Check if student is enrolled
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", assignment.course_id)
      .eq("student_id", user.id)
      .single()

    if (!enrollment) {
      return NextResponse.json({ error: "You must be enrolled in this course" }, { status: 403 })
    }

    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from("assignment_submissions")
      .select("id, status")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single()

    if (existingSubmission && existingSubmission.status === "graded") {
      return NextResponse.json({ error: "Cannot resubmit graded assignment" }, { status: 400 })
    }

    // Create or update submission
    const submissionData: any = {
      assignment_id: assignmentId,
      student_id: user.id,
      submission_text: submissionText || null,
      file_url: fileUrl || null,
      status: "submitted",
    }

    if (existingSubmission) {
      // Update existing submission
      const { data: updatedSubmission, error: updateError } = await supabase
        .from("assignment_submissions")
        .update(submissionData)
        .eq("id", existingSubmission.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ submission: updatedSubmission })
    } else {
      // Create new submission
      const { data: newSubmission, error: insertError } = await supabase
        .from("assignment_submissions")
        .insert(submissionData)
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ submission: newSubmission })
    }
  } catch (error: any) {
    console.error("Error submitting assignment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

















