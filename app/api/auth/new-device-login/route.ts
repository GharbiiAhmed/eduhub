import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { sendNewDeviceLoginEmail } from "@/lib/email"

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
    const { deviceInfo, location } = body

    if (!deviceInfo) {
      return NextResponse.json({ error: "Device info is required" }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single()

    if (profile?.email) {
      try {
        const emailResult = await sendNewDeviceLoginEmail(
          profile.email,
          profile.full_name || 'User',
          deviceInfo,
          location || 'Unknown location',
          new Date().toISOString()
        )
        if (emailResult.success) {
          console.log(`✅ New device login email sent to ${profile.email}`)
        } else {
          console.error(`❌ Failed to send new device login email:`, emailResult.error)
        }
      } catch (emailError: any) {
        console.error('Error sending new device login email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending new device login email:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}









