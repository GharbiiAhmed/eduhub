import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { courseId, title, description } = await request.json()

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "Course ID and title are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to create a forum" },
        { status: 403 }
      )
    }

    // Check if course is published
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, status")
      .eq("id", courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    if (course.status !== "published") {
      return NextResponse.json(
        { error: "Can only create forums for published courses" },
        { status: 403 }
      )
    }

    // Check if forum already exists for this course
    const { data: existingForum } = await supabase
      .from("forums")
      .select("id")
      .eq("course_id", courseId)
      .maybeSingle()

    if (existingForum) {
      return NextResponse.json({ forum: existingForum })
    }

    // Use service role client to bypass RLS for forum creation
    // If service role key is not available, use regular client (will fail if no RLS policy)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Create the forum
    const { data: forum, error: forumError } = await supabaseAdmin
      .from("forums")
      .insert({
        course_id: courseId,
        title: title || `${course.title} Discussion`,
        description: description || `Discussion forum for ${course.title}`,
      })
      .select()
      .single()

    if (forumError) {
      console.error("Error creating forum:", forumError)
      return NextResponse.json(
        { error: "Failed to create forum", details: forumError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ forum })
  } catch (error: any) {
    console.error("Error in create forum API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

