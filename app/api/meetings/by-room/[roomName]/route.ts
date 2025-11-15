import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

interface RouteContext {
  params: Promise<{
    roomName: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { roomName } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Find meeting by room name
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meetings")
      .select("*")
      .eq("room_name", roomName)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role

    // If user is instructor and owns the meeting, allow
    if (userRole === 'instructor' && meeting.instructor_id === user.id) {
      return NextResponse.json({
        success: true,
        meeting
      })
    }

    // If user is student, check enrollment or invitation
    if (userRole === 'student') {
      // Check if meeting has course restriction
      if (meeting.course_id) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", meeting.course_id)
          .eq("student_id", user.id)
          .single()

        if (!enrollment) {
          return NextResponse.json(
            { error: "You must be enrolled in this course to join the meeting" },
            { status: 403 }
          )
        }
      }

      // Check participant type
      if (meeting.participant_type === 'selected') {
        const { data: participant } = await supabase
          .from("meeting_participants")
          .select("*")
          .eq("meeting_id", meeting.id)
          .eq("student_id", user.id)
          .single()

        if (!participant) {
          return NextResponse.json(
            { error: "You are not invited to this meeting" },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        meeting
      })
    }

    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  } catch (error: any) {
    console.error("Error fetching meeting:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


