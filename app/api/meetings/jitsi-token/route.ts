import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
    const { roomName, userName, isHost } = body

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      )
    }

    // Jitsi Meet is completely free - no API key needed!
    // We'll use the public Jitsi Meet instance or a custom domain
    const jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si'
    
    // Create room URL - Jitsi uses room names directly in the URL
    // Sanitize room name to be URL-safe
    const sanitizedRoomName = roomName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const roomUrl = `https://${jitsiDomain}/${sanitizedRoomName}`

    return NextResponse.json({
      success: true,
      roomUrl: roomUrl,
      roomName: sanitizedRoomName,
      userName: userName || "User",
      isHost: isHost || false,
      useJitsi: true
    })
  } catch (error: any) {
    console.error("Error generating Jitsi room:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate meeting room" },
      { status: 500 }
    )
  }
}

