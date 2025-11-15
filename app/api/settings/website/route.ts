import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch website settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const publicOnly = searchParams.get("public") === "true"

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if user is admin
    let isAdmin = false
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      isAdmin = profile?.role === "admin"
    }

    // Build query
    let query = supabase.from("website_settings").select("*").order("category", { ascending: true }).order("setting_key", { ascending: true })

    // Filter by category
    if (category) {
      query = query.eq("category", category)
    }

    // Filter by public if not admin
    if (!isAdmin && publicOnly) {
      query = query.eq("is_public", true)
    }

    const { data: settings, error } = await query

    if (error) {
      console.error("Error fetching website settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert array to object for easier access
    const settingsObject: Record<string, any> = {}
    settings?.forEach((setting) => {
      let value: any = setting.setting_value
      
      // Parse value based on type
      if (setting.setting_type === "boolean") {
        value = value === "true" || value === true
      } else if (setting.setting_type === "number") {
        value = Number(value)
      } else if (setting.setting_type === "json") {
        try {
          value = JSON.parse(value || "{}")
        } catch {
          value = {}
        }
      }

      settingsObject[setting.setting_key] = value
    })

    return NextResponse.json({ settings: settingsObject, raw: settings })
  } catch (error: any) {
    console.error("Error in GET /api/settings/website:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST/PATCH - Update website settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body // Expecting { settings: { key: value, ... } }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 })
    }

    // Update each setting
    const updates = Object.entries(settings).map(async ([key, value]) => {
      // Get setting type
      const { data: existingSetting } = await supabase
        .from("website_settings")
        .select("setting_type")
        .eq("setting_key", key)
        .single()

      if (!existingSetting) {
        return { key, error: "Setting not found" }
      }

      // Convert value to string based on type
      let stringValue: string
      if (existingSetting.setting_type === "boolean") {
        stringValue = value ? "true" : "false"
      } else if (existingSetting.setting_type === "json") {
        stringValue = JSON.stringify(value)
      } else {
        stringValue = String(value)
      }

      const { error: updateError } = await supabase
        .from("website_settings")
        .update({ setting_value: stringValue })
        .eq("setting_key", key)

      if (updateError) {
        console.error(`Error updating setting ${key}:`, updateError)
        return { key, error: updateError.message }
      }

      return { key, success: true }
    })

    const results = await Promise.all(updates)
    const errors = results.filter((r) => r.error)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: errors,
          message: "Some settings failed to update",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: "Settings updated successfully" })
  } catch (error: any) {
    console.error("Error in POST /api/settings/website:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



















