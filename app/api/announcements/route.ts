import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch announcements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    // Build query for published announcements
    let query = supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("published_at", { ascending: false })

    // Filter by course if provided
    if (courseId) {
      query = query.eq("course_id", courseId)
    }

    const { data: announcements, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter announcements based on target audience
    const filteredAnnouncements = announcements?.filter((announcement) => {
      if (announcement.target_audience === "all") return true
      if (announcement.target_audience === "students" && profile?.role === "student") return true
      if (announcement.target_audience === "instructors" && profile?.role === "instructor") return true
      if (announcement.target_audience === "admins" && profile?.role === "admin") return true
      if (announcement.target_audience === "course_students" && courseId) {
        // Check if user is enrolled in the course
        // This would need to be checked separately
        return true // Simplified for now
      }
      return false
    })

    return NextResponse.json({ announcements: filteredAnnouncements || [] })
  } catch (error: any) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create announcement
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const body = await request.json()
    const { title, content, priority, targetAudience, courseId, isPublished, expiresAt } = body

    // Check permissions
    if (courseId && profile.role !== "instructor" && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!courseId && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create global announcements" }, { status: 403 })
    }

    // Create announcement
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .insert({
        author_id: user.id,
        course_id: courseId || null,
        title,
        content,
        priority: priority || "normal",
        target_audience: targetAudience || (courseId ? "course_students" : "all"),
        is_published: isPublished || false,
        published_at: isPublished ? new Date().toISOString() : null,
        expires_at: expiresAt || null,
      })
      .select()
      .single()

    if (announcementError) {
      return NextResponse.json({ error: announcementError.message }, { status: 500 })
    }

    // If published, notify target audience
    if (isPublished) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        let userIds: string[] = []

        if (targetAudience === "all" || !targetAudience) {
          // Get all users
          const { data: allUsers } = await supabaseAdmin
            .from("profiles")
            .select("id")
          userIds = allUsers?.map((u) => u.id) || []
        } else if (targetAudience === "students") {
          const { data: students } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "student")
          userIds = students?.map((u) => u.id) || []
        } else if (targetAudience === "instructors") {
          const { data: instructors } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "instructor")
          userIds = instructors?.map((u) => u.id) || []
        } else if (targetAudience === "course_students" && courseId) {
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("course_id", courseId)
          userIds = enrollments?.map((e) => e.student_id) || []
        }

        if (userIds.length > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds,
              type: 'announcement',
              title: `📢 ${title}`,
              message: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
              link: courseId ? `/student/courses/${courseId}` : '/announcements',
              relatedId: announcement.id,
              relatedType: 'announcement'
            })
          }).catch(err => console.error('Failed to create announcement notifications:', err))
        }
      } catch (notifError) {
        console.error('Error creating announcement notifications:', notifError)
      }
    }

    return NextResponse.json({ announcement })
  } catch (error: any) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


















