import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user settings
    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - we'll create default settings
      console.error("Error fetching settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no settings exist, return default values
    if (!settings) {
      return NextResponse.json({
        settings: {
          email_notifications: true,
          push_notifications: true,
          course_updates: true,
          new_messages: true,
          marketing_emails: false,
          weekly_digest: true,
          achievement_alerts: true,
          reminder_emails: true,
          meeting_reminders: true,
          forum_notifications: true,
          profile_visibility: "public",
          show_email: false,
          show_phone: false,
          show_location: true,
          allow_messages: true,
          show_progress: true,
          show_certificates: true,
          data_sharing: false,
          language: "en",
          timezone: "UTC",
          theme: "system",
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error("Error in GET /api/settings/user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST/PATCH - Update user settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .single()

    let settings
    if (existingSettings) {
      // Update existing settings
      const { data: updatedSettings, error: updateError } = await supabase
        .from("user_settings")
        .update({
          ...body,
          user_id: user.id, // Ensure user_id is set
        })
        .eq("user_id", user.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating settings:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      settings = updatedSettings
    } else {
      // Create new settings
      const { data: newSettings, error: insertError } = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          ...body,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating settings:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      settings = newSettings
    }

    return NextResponse.json({ settings, success: true })
  } catch (error: any) {
    console.error("Error in POST /api/settings/user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}





















