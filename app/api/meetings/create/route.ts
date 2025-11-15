import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

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
      title,
      description,
      startTime,
      endTime,
      participantType,
      selectedParticipants,
      maxParticipants,
      recordingEnabled
    } = body

    if (!title || !startTime) {
      return NextResponse.json(
        { error: "Title and start time are required" },
        { status: 400 }
      )
    }

    // Generate unique room name
    const roomName = `room-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create Daily.co room if API key is available
    let meetingUrl = `/meetings/${roomName}`
    let meetingToken = `token-${Date.now()}-${Math.random().toString(36).substring(7)}`
    let dailyRoomUrl = null

    const dailyApiKey = process.env.DAILY_API_KEY
    if (dailyApiKey) {
      try {
        const dailyResponse = await fetch(`https://api.daily.co/v1/rooms`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${dailyApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: roomName,
            privacy: "private",
            properties: {
              enable_screenshare: true,
              enable_chat: true,
              enable_knocking: false,
              enable_recording: "cloud"
            }
          })
        })

        if (dailyResponse.ok) {
          const dailyRoom = await dailyResponse.json()
          dailyRoomUrl = dailyRoom.url
        }
      } catch (error) {
        console.error("Error creating Daily.co room:", error)
        // Continue without Daily.co
      }
    }

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Create meeting
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meetings")
      .insert({
        instructor_id: user.id,
        course_id: courseId || null,
        title,
        description: description || null,
        meeting_url: meetingUrl,
        meeting_token: meetingToken,
        room_name: roomName,
        start_time: startTime,
        end_time: endTime || null,
        participant_type: participantType || 'all',
        max_participants: maxParticipants || 50,
        recording_enabled: recordingEnabled || false,
        status: 'scheduled',
        daily_room_url: dailyRoomUrl
      })
      .select()
      .single()

    if (meetingError) {
      console.error("Error creating meeting:", meetingError)
      return NextResponse.json(
        { error: meetingError.message || "Failed to create meeting" },
        { status: 500 }
      )
    }

    // If participant type is 'selected', add participants
    let participantIds: string[] = []
    if (participantType === 'selected' && selectedParticipants && selectedParticipants.length > 0) {
      const participants = selectedParticipants.map((studentId: string) => ({
        meeting_id: meeting.id,
        student_id: studentId,
        status: 'invited'
      }))

      participantIds = selectedParticipants

      const { error: participantsError } = await supabaseAdmin
        .from("meeting_participants")
        .insert(participants)

      if (participantsError) {
        console.error("Error adding participants:", participantsError)
        // Don't fail the request, just log the error
      }
    } else if (participantType === 'all' && courseId) {
      // Get all enrolled students for the course
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)

      if (enrollments) {
        participantIds = enrollments.map(e => e.student_id)
      }
    }

    // Notify participants about the meeting
    if (participantIds.length > 0) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: participantIds,
            type: 'meeting_scheduled',
            title: 'New Meeting Scheduled',
            message: `A new meeting "${title}" has been scheduled.`,
            link: `/student/meetings`,
            relatedId: meeting.id,
            relatedType: 'meeting'
          })
        })
      } catch (error) {
        console.error("Error creating meeting notifications:", error)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      meeting
    })
  } catch (error: any) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

