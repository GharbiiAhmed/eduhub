import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch single assignment
export async function GET(
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

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get assignment with course details
    const { data: assignment, error } = await supabase
      .from("assignments")
      .select(`
        *,
        courses(id, title, instructor_id),
        modules(id, title)
      `)
      .eq("id", assignmentId)
      .single()

    if (error || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Check permissions
    if (profile.role === "instructor") {
      // Instructor can view if they own the course
      if (assignment.courses.instructor_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else {
      // Student can view if published and enrolled
      if (!assignment.is_published) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
      }

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", assignment.course_id)
        .eq("student_id", user.id)
        .single()

      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Get submission if student
    if (profile.role === "student") {
      const { data: submission } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .single()

      return NextResponse.json({ assignment, submission: submission || null })
    }

    // Get all submissions if instructor (no profiles join to avoid RLS 500 on profiles)
    const { data: submissions } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false })

    // Attach student names using service role (instructor already verified above)
    let submissionsWithProfiles = submissions || []
    if (submissionsWithProfiles.length > 0) {
      const studentIds = [...new Set(submissionsWithProfiles.map((s: { student_id: string }) => s.student_id))]
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        const supabaseAdmin = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds)
        const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]))
        submissionsWithProfiles = submissionsWithProfiles.map((s: { student_id: string }) => ({
          ...s,
          profiles: profileMap.get(s.student_id) ?? null,
        }))
      }
    }

    return NextResponse.json({ assignment, submissions: submissionsWithProfiles })
  } catch (error: any) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update assignment (instructor only)
export async function PATCH(
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

    // Get assignment to verify ownership
    const { data: assignment } = await supabase
      .from("assignments")
      .select("*, courses!inner(instructor_id)")
      .eq("id", assignmentId)
      .single()

    if (!assignment || assignment.courses.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from("assignments")
      .update({
        title: body.title,
        description: body.description,
        instructions: body.instructions,
        due_date: body.dueDate,
        max_points: body.maxPoints,
        assignment_type: body.assignmentType,
        allowed_file_types: body.allowedFileTypes,
        max_file_size_mb: body.maxFileSizeMb,
        is_published: body.isPublished,
      })
      .eq("id", assignmentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If just published, notify enrolled students
    if (body.isPublished && !assignment.is_published) {
      try {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", assignment.course_id)

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.student_id)
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: studentIds,
              type: 'course_published',
              title: 'New Assignment Available! 📝',
              message: `A new assignment "${updatedAssignment.title}" has been added to your course.`,
              link: `/student/assignments/${assignmentId}`,
              relatedId: assignmentId,
              relatedType: 'assignment'
            })
          }).catch(err => console.error('Failed to create assignment notifications:', err))
        }
      } catch (notifError) {
        console.error('Error creating assignment notifications:', notifError)
      }
    }

    return NextResponse.json({ assignment: updatedAssignment })
  } catch (error: any) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete assignment (instructor only)
export async function DELETE(
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

    // Get assignment to verify ownership
    const { data: assignment } = await supabase
      .from("assignments")
      .select("*, courses!inner(instructor_id)")
      .eq("id", assignmentId)
      .single()

    if (!assignment || assignment.courses.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete assignment (cascade will delete submissions)
    const { error: deleteError } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


















