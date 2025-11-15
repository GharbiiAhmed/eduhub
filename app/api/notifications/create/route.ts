import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// POST - Create a notification (system endpoint using service role)
// This endpoint can be called from server-side code to create notifications
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userIds, type, title, message, link, relatedId, relatedType } = body

    // Support both single userId and array of userIds
    const targetUserIds = userIds || (userId ? [userId] : [])

    if (targetUserIds.length === 0 || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: userId/userIds, type, title, message" },
        { status: 400 }
      )
    }

    // Check user notification preferences before creating notifications
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get notification settings for all target users
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("user_id, email_notifications, push_notifications, course_updates, new_messages, meeting_reminders, forum_notifications")
      .in("user_id", targetUserIds)

    // Filter users based on notification preferences
    const usersToNotify: string[] = []
    const settingsMap: Record<string, any> = {}

    // Create a map of user settings
    userSettings?.forEach((settings) => {
      settingsMap[settings.user_id] = settings
    })

    // Check each target user
    targetUserIds.forEach((userId) => {
      const settings = settingsMap[userId]
      let shouldNotify = true

      // If user has settings, check their preferences
      if (settings) {
        // Check specific notification type preferences
        if (type === 'course_published' || type === 'lesson_added' || type === 'course_added') {
          shouldNotify = settings.course_updates !== false
        } else if (type === 'message_received') {
          shouldNotify = settings.new_messages !== false
        } else if (type === 'meeting_scheduled') {
          shouldNotify = settings.meeting_reminders !== false
        } else if (type === 'forum_reply' || type === 'announcement') {
          shouldNotify = settings.forum_notifications !== false
        } else if (type === 'assignment_feedback' || type === 'quiz_graded') {
          shouldNotify = settings.achievement_alerts !== false
        } else if (type === 'subscription_expiring' || type === 'subscription_renewal') {
          shouldNotify = settings.reminder_emails !== false
        }

        // General email notifications check
        if (shouldNotify && settings.email_notifications === false) {
          shouldNotify = false
        }
      }
      // If user has no settings, default to true (notify them)

      if (shouldNotify) {
        usersToNotify.push(userId)
      }
    })

    // If no users should be notified, return early
    if (usersToNotify.length === 0) {
      return NextResponse.json({ 
        notifications: [],
        count: 0,
        message: "No users to notify based on notification preferences"
      })
    }

    // Create notifications only for users who should receive them
    const notifications = usersToNotify.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      link: link || null,
      related_id: relatedId || null,
      related_type: relatedType || null,
    }))

    const { data: createdNotifications, error } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select()

    if (error) {
      console.error("Error creating notifications:", error)
      return NextResponse.json({ error: "Failed to create notifications" }, { status: 500 })
    }

    return NextResponse.json({ 
      notifications: createdNotifications,
      count: createdNotifications?.length || 0
    })
  } catch (error: unknown) {
    console.error("Error in create notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

