import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch assignments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const role = searchParams.get("role") // 'instructor' or 'student'

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (role === "instructor" || profile.role === "instructor") {
      // Instructor view - all assignments for their courses
      let query = supabase
        .from("assignments")
        .select(`
          *,
          courses!inner(id, title, instructor_id),
          assignment_submissions(count)
        `)
        .eq("courses.instructor_id", user.id)

      if (courseId) {
        query = query.eq("course_id", courseId)
      }

      const { data: assignments, error } = await query.order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ assignments: assignments || [] })
    } else {
      // Student view - published assignments for enrolled courses
      // First, get enrolled course IDs
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError)
        return NextResponse.json({ error: enrollmentsError.message }, { status: 500 })
      }

      const enrolledCourseIds = enrollments?.map(e => e.course_id) || []

      if (enrolledCourseIds.length === 0) {
        return NextResponse.json({ assignments: [] })
      }

      // Then fetch assignments for enrolled courses
      let query = supabase
        .from("assignments")
        .select(`
          *,
          courses!inner(id, title),
          assignment_submissions!left(
            id,
            status,
            score,
            submitted_at
          )
        `)
        .eq("is_published", true)
        .in("course_id", enrolledCourseIds)

      if (courseId) {
        // Verify the courseId is in enrolled courses
        if (!enrolledCourseIds.includes(courseId)) {
          return NextResponse.json({ assignments: [] })
        }
        query = query.eq("course_id", courseId)
      }

      const { data: assignments, error } = await query
        .order("due_date", { ascending: true })

      if (error) {
        console.error("Error fetching assignments:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ assignments: assignments || [] })
    }
  } catch (error: any) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create assignment (instructor only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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
    const {
      courseId,
      moduleId,
      title,
      description,
      instructions,
      dueDate,
      maxPoints,
      assignmentType,
      allowedFileTypes,
      maxFileSizeMb,
      isPublished
    } = body

    if (!courseId || !title || !description) {
      return NextResponse.json(
        { error: "Course ID, title, and description are required" },
        { status: 400 }
      )
    }

    // Verify instructor owns the course
    const { data: course } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", courseId)
      .single()

    if (!course || course.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        course_id: courseId,
        module_id: moduleId || null,
        instructor_id: user.id,
        title,
        description,
        instructions: instructions || null,
        due_date: dueDate || null,
        max_points: maxPoints || 100,
        assignment_type: assignmentType || "essay",
        allowed_file_types: allowedFileTypes || null,
        max_file_size_mb: maxFileSizeMb || 10,
        is_published: isPublished || false,
      })
      .select()
      .single()

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 })
    }

    // If published, notify enrolled students
    if (isPublished) {
      try {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", courseId)

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.student_id)
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: studentIds,
              type: 'course_published', // Using course_published for new assignments
              title: 'New Assignment Available! 📝',
              message: `A new assignment "${title}" has been added to your course.`,
              link: `/student/assignments/${assignment.id}`,
              relatedId: assignment.id,
              relatedType: 'assignment'
            })
          }).catch(err => console.error('Failed to create assignment notifications:', err))
        }
      } catch (notifError) {
        console.error('Error creating assignment notifications:', notifError)
      }
    }

    return NextResponse.json({ assignment })
  } catch (error: any) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}








