"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { VideoMeeting } from "@/components/meeting/video-meeting"
import { toast } from "@/hooks/use-toast"

export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomName = params.roomName as string
  const [meeting, setMeeting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [userName, setUserName] = useState("")
  const supabase = createClient()

  useEffect(() => {
    joinMeeting()
  }, [roomName])

  const joinMeeting = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()

      setUserName(profile?.full_name || profile?.email?.split('@')[0] || "User")

      // Find meeting by room name via API
      const meetingResponse = await fetch(`/api/meetings/by-room/${roomName}`)
      const meetingResult = await meetingResponse.json()

      if (!meetingResult.success || !meetingResult.meeting) {
        toast({
          title: "Meeting not found",
          description: meetingResult.error || "This meeting does not exist or you don't have access to it.",
          variant: "destructive",
        })
        setLoading(false)
        router.push("/dashboard")
        return
      }

      const meetingData = meetingResult.meeting
      setMeeting(meetingData)

      if (meetingData.instructor_id === user.id) {
        setIsHost(true)
      }

      // Join meeting via API
      const response = await fetch(`/api/meetings/${meetingData.id}/join`, {
        method: "POST",
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to join meeting")
      }

      // Jitsi Meet is free and doesn't need tokens
      // Just use the room name directly
      setLoading(false)
    } catch (error: any) {
      console.error("Error joining meeting:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to join meeting.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining meeting...</p>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return null
  }

  return (
    <VideoMeeting
      roomName={roomName}
      isHost={isHost}
      userName={userName}
    />
  )
}
