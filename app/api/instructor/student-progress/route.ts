import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const courseId = searchParams.get("courseId")

    if (!studentId || !courseId) {
      return NextResponse.json({ error: "studentId and courseId are required" }, { status: 400 })
    }

    // Verify the instructor teaches this course
    const { data: course } = await supabase
      .from("courses")
      .select("id, instructor_id")
      .eq("id", courseId)
      .single()

    if (!course || course.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden - Not your course" }, { status: 403 })
    }

    // Get modules for this course
    const { data: modules } = await supabase
      .from("modules")
      .select("id")
      .eq("course_id", courseId)

    if (!modules || modules.length === 0) {
      return NextResponse.json({
        totalLessons: 0,
        completedLessons: 0,
        progress: 0
      })
    }

    const moduleIds = modules.map(m => m.id)

    // Get lessons for all modules
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds)

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({
        totalLessons: 0,
        completedLessons: 0,
        progress: 0
      })
    }

    const lessonIds = lessons.map(l => l.id)

    // Use service role client if available to bypass RLS for lesson_progress query
    // If service role key is not available, use regular client (will work if RLS policy allows)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Get completed lessons - using service role client if available to bypass RLS
    const { data: completedLessons } = await supabaseAdmin
      .from("lesson_progress")
      .select("id")
      .eq("student_id", studentId)
      .eq("completed", true)
      .in("lesson_id", lessonIds)

    const completedCount = completedLessons?.length || 0
    const totalCount = lessonIds.length
    const progress = totalCount > 0 
      ? Math.round((completedCount / totalCount) * 100)
      : 0

    return NextResponse.json({
      totalLessons: totalCount,
      completedLessons: completedCount,
      progress,
      lessonIds,
      completedLessonIds: completedLessons?.map(c => c.id) || []
    })
  } catch (error: any) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

