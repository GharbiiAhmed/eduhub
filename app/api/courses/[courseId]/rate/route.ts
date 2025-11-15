import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient()
    const { courseId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rating, review } = await request.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Check if course is completed
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("progress_percentage")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (!enrollment || enrollment.progress_percentage < 100) {
      return NextResponse.json(
        { error: "You must complete the course before rating it" },
        { status: 400 }
      )
    }

    // Upsert rating
    const { data, error } = await supabase.from("course_ratings").upsert(
      {
        student_id: user.id,
        course_id: courseId,
        rating,
        review: review?.trim() || null,
      },
      { onConflict: "student_id,course_id" }
    ).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, rating: data })
  } catch (error: any) {
    console.error("Error submitting rating:", error)
    return NextResponse.json({ error: error.message || "Failed to submit rating" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const supabase = await createClient()
    const { courseId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's rating for this course
    const { data, error } = await supabase
      .from("course_ratings")
      .select("rating, review")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is fine
      throw error
    }

    return NextResponse.json({ rating: data || null })
  } catch (error: any) {
    console.error("Error fetching rating:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch rating" }, { status: 500 })
  }
}


