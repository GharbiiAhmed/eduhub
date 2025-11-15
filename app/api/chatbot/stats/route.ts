import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChatbotStats, USER_ROLES } from "@/lib/services/chatbot-service"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || USER_ROLES.STUDENT

    const stats = await getChatbotStats(userRole)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error("Get chatbot stats error:", error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ 
      error: "Failed to fetch chatbot stats" 
    }, { status: 500 })
  }
}


