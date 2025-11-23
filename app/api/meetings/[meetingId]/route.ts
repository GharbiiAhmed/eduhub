import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendMeetingCancelledEmail } from "@/lib/email"

interface RouteContext {
  params: Promise<{
    meetingId: string
  }>
}

// PATCH - Update meeting (cancel, update status, etc.)
export async function PATCH(
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

    const body = await request.json()
    const { status, reason } = body

    // Use service role client if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meetings")
      .select("*")
      .eq("id", meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    // Check if user is the instructor
    if (meeting.instructor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden - Only instructor can update meeting" }, { status: 403 })
    }

    // Update meeting
    const updateData: any = {}
    if (status) updateData.status = status
    if (reason) updateData.description = reason

    const { data: updatedMeeting, error: updateError } = await supabaseAdmin
      .from("meetings")
      .update(updateData)
      .eq("id", meetingId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If meeting was cancelled, send cancellation emails to participants
    if (status === 'cancelled') {
      try {
        // Get all participants
        let participantIds: string[] = []
        
        if (meeting.participant_type === 'selected') {
          const { data: participants } = await supabaseAdmin
            .from("meeting_participants")
            .select("student_id")
            .eq("meeting_id", meetingId)
          
          if (participants) {
            participantIds = participants.map(p => p.student_id)
          }
        } else if (meeting.course_id) {
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("course_id", meeting.course_id)
          
          if (enrollments) {
            participantIds = enrollments.map(e => e.student_id)
          }
        }

        // Get participant profiles for emails
        if (participantIds.length > 0) {
          const { data: participantProfiles } = await supabaseAdmin
            .from("profiles")
            .select("id, email, full_name")
            .in("id", participantIds)

          if (participantProfiles) {
            for (const participant of participantProfiles) {
              if (participant.email) {
                try {
                  const emailResult = await sendMeetingCancelledEmail(
                    participant.email,
                    participant.full_name || 'Student',
                    meeting.title,
                    meeting.start_time,
                    reason
                  )
                  if (emailResult.success) {
                    console.log(`✅ Meeting cancellation email sent to ${participant.email}`)
                  } else {
                    console.error(`❌ Failed to send cancellation email:`, emailResult.error)
                  }
                } catch (emailError: any) {
                  console.error('Error sending meeting cancellation email:', emailError)
                }
              }
            }
          }
        }

        // Create in-app notifications
        if (participantIds.length > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: participantIds,
              type: 'meeting_cancelled',
              title: 'Meeting Cancelled',
              message: `The meeting "${meeting.title}" has been cancelled.`,
              link: `/student/meetings`,
              relatedId: meetingId,
              relatedType: 'meeting'
            })
          }).catch(err => console.error('Failed to create cancellation notifications:', err))
        }
      } catch (error) {
        console.error("Error sending cancellation emails:", error)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      meeting: updatedMeeting
    })
  } catch (error: any) {
    console.error("Error updating meeting:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}








