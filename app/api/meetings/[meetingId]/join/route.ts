import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

interface RouteContext {
  params: Promise<{
    meetingId: string
  }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { meetingId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Check if user is the instructor
    if (meeting.instructor_id === user.id) {
      return NextResponse.json({
        success: true,
        meeting,
        token: meeting.meeting_token,
        isHost: true
      })
    }

    // Check if user is enrolled in the course (if meeting is course-specific)
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
        .eq("meeting_id", meetingId)
        .eq("student_id", user.id)
        .single()

      if (!participant) {
        return NextResponse.json(
          { error: "You are not invited to this meeting" },
          { status: 403 }
        )
      }
    }

    // Use service role client if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Update or create participant record
    const { data: participant, error: participantError } = await supabaseAdmin
      .from("meeting_participants")
      .upsert({
        meeting_id: meetingId,
        student_id: user.id,
        joined_at: new Date().toISOString(),
        status: 'joined'
      }, {
        onConflict: 'meeting_id,student_id'
      })
      .select()
      .single()

    if (participantError) {
      console.error("Error updating participant:", participantError)
    }

    return NextResponse.json({
      success: true,
      meeting,
      token: meeting.meeting_token,
      isHost: false
    })
  } catch (error: any) {
    console.error("Error joining meeting:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


