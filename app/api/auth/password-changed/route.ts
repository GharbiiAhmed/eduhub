import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { sendPasswordChangedEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single()

    if (profile?.email) {
      try {
        const emailResult = await sendPasswordChangedEmail(
          profile.email,
          profile.full_name || 'User',
          new Date().toISOString()
        )
        if (emailResult.success) {
          console.log(`✅ Password changed email sent to ${profile.email}`)
        } else {
          console.error(`❌ Failed to send password changed email:`, emailResult.error)
        }
      } catch (emailError: any) {
        console.error('Error sending password changed email:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending password changed email:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}







