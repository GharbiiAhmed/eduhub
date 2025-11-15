import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userRole = profile?.role

    let meetings

    if (userRole === 'instructor') {
      // Instructors see their own meetings
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          courses (
            id,
            title
          )
        `)
        .eq("instructor_id", user.id)
        .order("start_time", { ascending: false })

      if (error) throw error
      meetings = data
    } else if (userRole === 'student') {
      // Students see meetings for their enrolled courses
      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)

      const courseIds = enrollments?.map(e => e.course_id) || []

      // Get meetings for enrolled courses
      let courseMeetings: any[] = []
      if (courseIds.length > 0) {
        const { data, error } = await supabase
          .from("meetings")
          .select(`
            *,
            courses (
              id,
              title
            )
          `)
          .in("course_id", courseIds)
          .order("start_time", { ascending: false })

        if (error) throw error
        courseMeetings = data || []
      }

      // Get all-participant meetings (no course restriction)
      const { data: allMeetings, error: allError } = await supabase
        .from("meetings")
        .select(`
          *,
          courses (
            id,
            title
          )
        `)
        .is("course_id", null)
        .eq("participant_type", "all")
        .order("start_time", { ascending: false })

      if (allError) throw allError

      // Combine and deduplicate
      const allMeetingsList = [...courseMeetings, ...(allMeetings || [])]
      const uniqueMeetings = Array.from(
        new Map(allMeetingsList.map(m => [m.id, m])).values()
      )

      // For selected-participant meetings, check if student is invited
      const { data: participantMeetings } = await supabase
        .from("meeting_participants")
        .select("meeting_id")
        .eq("student_id", user.id)

      const participantMeetingIds = participantMeetings?.map(p => p.meeting_id) || []

      // Filter meetings
      meetings = uniqueMeetings.filter(meeting => {
        if (meeting.participant_type === 'selected') {
          return participantMeetingIds.includes(meeting.id)
        }
        return true
      })
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      meetings
    })
  } catch (error: any) {
    console.error("Error fetching meetings:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

