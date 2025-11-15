import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// to check for expiring subscriptions and send notifications
export async function POST(request: Request) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get subscriptions expiring in the next 7 days
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const sevenDaysFromNowISO = sevenDaysFromNow.toISOString()

    // Get subscriptions expiring in the next 3 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysFromNowISO = threeDaysFromNow.toISOString()

    // Get subscriptions expiring in the next 7 days
    const { data: expiringSubscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*, courses(id, title), books(id, title)")
      .eq("status", "active")
      .lte("current_period_end", sevenDaysFromNowISO)
      .gt("current_period_end", new Date().toISOString())

    if (error) {
      console.error("Error fetching expiring subscriptions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return NextResponse.json({ 
        message: "No expiring subscriptions found",
        count: 0
      })
    }

    // Send notifications for expiring subscriptions
    const notificationsSent: string[] = []
    const notificationsFailed: string[] = []

    for (const subscription of expiringSubscriptions) {
      try {
        const daysUntilExpiry = Math.ceil(
          (new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )

        const productName = subscription.course_id
          ? subscription.courses?.title
          : subscription.books?.title

        const productType = subscription.course_id ? "course" : "book"
        const productId = subscription.course_id || subscription.book_id

        let message = ""
        if (daysUntilExpiry <= 1) {
          message = `Your subscription for "${productName || 'your subscription'}" expires today! Renew now to continue access.`
        } else if (daysUntilExpiry <= 3) {
          message = `Your subscription for "${productName || 'your subscription'}" expires in ${daysUntilExpiry} days. Renew now to continue access.`
        } else {
          message = `Your subscription for "${productName || 'your subscription'}" expires in ${daysUntilExpiry} days.`
        }

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: subscription.user_id,
            type: 'subscription_expiring',
            title: 'Subscription Expiring Soon ⏰',
            message,
            link: '/subscriptions',
            relatedId: subscription.id,
            relatedType: 'subscription'
          })
        })

        notificationsSent.push(subscription.id)
      } catch (notifError) {
        console.error(`Error sending notification for subscription ${subscription.id}:`, notifError)
        notificationsFailed.push(subscription.id)
      }
    }

    return NextResponse.json({
      message: "Subscription expiring check completed",
      total: expiringSubscriptions.length,
      notificationsSent: notificationsSent.length,
      notificationsFailed: notificationsFailed.length,
      sent: notificationsSent,
      failed: notificationsFailed
    })
  } catch (error: any) {
    console.error("Error in subscription expiring check:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}


















