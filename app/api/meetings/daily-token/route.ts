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
    const { roomName, isOwner } = body

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      )
    }

    // Check if Daily.co API key is configured
    const dailyApiKey = process.env.DAILY_API_KEY
    if (!dailyApiKey) {
      // Fallback: Return without Daily.co
      return NextResponse.json({
        success: false,
        useDaily: false,
        error: "Daily.co API key not configured"
      })
    }

    // Get or create Daily.co room - ensure same room for all participants
    let roomData
    const getRoomResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${dailyApiKey}`
      }
    })

    if (getRoomResponse.ok) {
      roomData = await getRoomResponse.json()
      console.log('Found existing Daily.co room:', roomData.url)
    } else {
      // Room doesn't exist, create it
      console.log('Creating new Daily.co room:', roomName)
      const createRoomResponse = await fetch(`https://api.daily.co/v1/rooms`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${dailyApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            enable_knocking: false,
            enable_recording: "cloud",
            max_participants: 50
          }
        })
      })

      if (!createRoomResponse.ok) {
        const errorText = await createRoomResponse.text()
        console.error('Failed to create Daily.co room:', errorText)
        throw new Error(`Failed to create Daily.co room: ${errorText}`)
      }

      roomData = await createRoomResponse.json()
      console.log('Created Daily.co room:', roomData.url)
    }

    // Generate meeting token
    const tokenResponse = await fetch(`https://api.daily.co/v1/meeting-tokens`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isOwner || false,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        }
      })
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to generate Daily.co token")
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      roomUrl: roomData.url,
      useDaily: true
    })
  } catch (error: any) {
    console.error("Error generating Daily.co token:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate meeting token" },
      { status: 500 }
    )
  }
}
