import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { announcementId } = await params
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get announcement
    const { data: announcement, error } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles(id, full_name, email),
        courses(id, title)
      `)
      .eq("id", announcementId)
      .single()

    if (error || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    // Check if published
    if (!announcement.is_published) {
      // Get user role to check permissions
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "admin" && announcement.author_id !== user.id) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
      }
    }

    // Mark as viewed
    await supabase
      .from("announcement_views")
      .upsert({
        announcement_id: announcementId,
        user_id: user.id,
      }, {
        onConflict: "announcement_id,user_id"
      })

    return NextResponse.json({ announcement })
  } catch (error: any) {
    console.error("Error fetching announcement:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update announcement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { announcementId } = await params
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

    // Get announcement
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    // Check permissions
    if (announcement.course_id && profile.role !== "instructor" && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!announcement.course_id && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can edit global announcements" }, { status: 403 })
    }

    if (announcement.course_id && announcement.author_id !== user.id && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Update announcement
    const { data: updatedAnnouncement, error: updateError } = await supabase
      .from("announcements")
      .update({
        title: body.title,
        content: body.content,
        priority: body.priority,
        target_audience: body.targetAudience,
        is_published: body.isPublished,
        published_at: body.isPublished && !announcement.is_published ? new Date().toISOString() : announcement.published_at,
        expires_at: body.expiresAt || null,
      })
      .eq("id", announcementId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If just published, notify target audience
    if (body.isPublished && !announcement.is_published) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const { createClient: createServiceClient } = await import("@supabase/supabase-js")
        const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        let userIds: string[] = []

        if (updatedAnnouncement.target_audience === "all" || !updatedAnnouncement.target_audience) {
          const { data: allUsers } = await supabaseAdmin
            .from("profiles")
            .select("id")
          userIds = allUsers?.map((u) => u.id) || []
        } else if (updatedAnnouncement.target_audience === "students") {
          const { data: students } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "student")
          userIds = students?.map((u) => u.id) || []
        } else if (updatedAnnouncement.target_audience === "instructors") {
          const { data: instructors } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("role", "instructor")
          userIds = instructors?.map((u) => u.id) || []
        } else if (updatedAnnouncement.target_audience === "course_students" && updatedAnnouncement.course_id) {
          const { data: enrollments } = await supabaseAdmin
            .from("enrollments")
            .select("student_id")
            .eq("course_id", updatedAnnouncement.course_id)
          userIds = enrollments?.map((e) => e.student_id) || []
        }

        if (userIds.length > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds,
              type: 'announcement',
              title: `📢 ${updatedAnnouncement.title}`,
              message: updatedAnnouncement.content.substring(0, 200) + (updatedAnnouncement.content.length > 200 ? '...' : ''),
              link: updatedAnnouncement.course_id ? `/student/courses/${updatedAnnouncement.course_id}` : '/announcements',
              relatedId: updatedAnnouncement.id,
              relatedType: 'announcement'
            })
          }).catch(err => console.error('Failed to create announcement notifications:', err))
        }
      } catch (notifError) {
        console.error('Error creating announcement notifications:', notifError)
      }
    }

    return NextResponse.json({ announcement: updatedAnnouncement })
  } catch (error: any) {
    console.error("Error updating announcement:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  try {
    const supabase = await createClient()
    const { announcementId } = await params
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

    // Get announcement
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    // Check permissions
    if (announcement.course_id && profile.role !== "instructor" && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!announcement.course_id && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete global announcements" }, { status: 403 })
    }

    if (announcement.course_id && announcement.author_id !== user.id && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete announcement (cascade will delete views)
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting announcement:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

















