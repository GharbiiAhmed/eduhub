import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Cron job endpoint for sending weekly progress emails
 * Called by GitHub Actions on schedule (every Monday at 9 AM UTC)
 * 
 * GitHub Actions workflow: .github/workflows/engagement-emails.yml
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (required for GitHub Actions)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Call the weekly progress email endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/emails/weekly-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || ''
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: result.error || "Failed to send weekly progress emails" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Weekly progress emails sent",
      ...result
    })
  } catch (error: any) {
    console.error("Error in weekly progress cron job:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


