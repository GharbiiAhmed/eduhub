"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Settings,
  Maximize2,
  Minimize2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface VideoMeetingProps {
  roomName: string
  isHost: boolean
  userName: string
}

export function VideoMeeting({ roomName, isHost, userName }: VideoMeetingProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isJoined, setIsJoined] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [jitsiApi, setJitsiApi] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // Get user role for navigation
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role) {
          setUserRole(profile.role)
        }
      }
    }
    getUserRole()
  }, [])

  useEffect(() => {
    // Initialize Jitsi Meet (free alternative)
    if (roomName && !isJoined) {
      initializeJitsi()
    }

    return () => {
      cleanup()
    }
  }, [roomName])

  const initializeJitsi = async () => {
    try {
      console.log('🔄 Initializing Jitsi Meet for room:', roomName)
      
      // Wait for Jitsi API to load
      let JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI
      if (!JitsiMeetExternalAPI) {
        // Load Jitsi Meet API script
        const script = document.createElement('script')
        script.src = 'https://8x8.vc/external_api.js'
        script.async = true
        document.head.appendChild(script)
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = () => {
            JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI
            if (JitsiMeetExternalAPI) {
              console.log('✅ Jitsi Meet API loaded')
              resolve(true)
            } else {
              reject(new Error('Jitsi API not available'))
            }
          }
          script.onerror = () => reject(new Error('Failed to load Jitsi script'))
          setTimeout(() => reject(new Error('Timeout loading Jitsi script')), 10000)
        })
      }

      // Create container for Jitsi iframe
      const container = document.getElementById('daily-container')
      if (!container) {
        console.error('Container not found')
        return
      }

      // Clean container and ensure proper sizing
      container.innerHTML = ''
      container.style.width = '100%'
      container.style.height = '100%'
      container.style.position = 'relative'
      container.style.overflow = 'hidden'

      // Generate a clean room name (Jitsi doesn't like special characters)
      const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

      // Create Jitsi Meet iframe
      const domain = 'meet.jit.si' // Free public Jitsi instance
      const options = {
        roomName: cleanRoomName,
        width: '100%',
        height: '100%',
        parentNode: container,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'settings', 'raisehand', 'videoquality', 'filmstrip',
            'invite', 'feedback', 'stats', 'shortcuts', 'tileview', 'videobackgroundblur',
            'download', 'help', 'mute-everyone', 'security'
          ],
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          APP_NAME: 'EduHub',
          NATIVE_APP_NAME: 'EduHub',
          PROVIDER_NAME: 'EduHub',
        },
        userInfo: {
          displayName: userName,
        },
      }

      const api = new JitsiMeetExternalAPI(domain, options)
      
      console.log('✅ Jitsi Meet iframe created')

      // Store API reference
      setJitsiApi(api)
      setIsJoined(true)

      // Listen for participant events
      api.addEventListener('participantJoined', (event: any) => {
        console.log('Participant joined:', event)
        if (event.participant && !event.participant.local) {
          setParticipants(prev => {
            const exists = prev.find(p => p.id === event.participant.id)
            if (!exists) {
              return [...prev, event.participant]
            }
            return prev
          })
        }
      })

      api.addEventListener('participantLeft', (event: any) => {
        console.log('Participant left:', event)
        setParticipants(prev => prev.filter(p => p.id !== event.participant.id))
      })

      api.addEventListener('videoConferenceJoined', () => {
        console.log('✅ Successfully joined Jitsi conference')
        toast({
          title: "Connected",
          description: "You've joined the meeting successfully.",
        })
      })

      api.addEventListener('videoConferenceLeft', async () => {
        console.log('Left Jitsi conference')
        setParticipants([])
        setIsJoined(false)
        // Navigate back to appropriate meetings page
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          setTimeout(() => {
            if (profile?.role === 'instructor') {
              router.push('/instructor/meetings')
            } else if (profile?.role === 'student') {
              router.push('/student/meetings')
            } else {
              router.push('/dashboard')
            }
          }, 500)
        } else {
          router.push('/dashboard')
        }
      })

      api.addEventListener('readyToClose', async () => {
        console.log('Jitsi ready to close')
        cleanup()
        // Navigate back to appropriate meetings page
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          setTimeout(() => {
            if (profile?.role === 'instructor') {
              router.push('/instructor/meetings')
            } else if (profile?.role === 'student') {
              router.push('/student/meetings')
            } else {
              router.push('/dashboard')
            }
          }, 500)
        } else {
          router.push('/dashboard')
        }
      })

      api.addEventListener('error', (error: any) => {
        console.error('Jitsi error:', error)
        toast({
          title: "Meeting error",
          description: error.error || "An error occurred in the meeting.",
          variant: "destructive",
        })
      })

    } catch (error) {
      console.error('Error initializing Jitsi Meet:', error)
      toast({
        title: "Error",
        description: "Failed to initialize video meeting.",
        variant: "destructive",
      })
    }
  }

  const toggleVideo = async () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleVideo')
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  const toggleAudio = async () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio')
      setIsAudioEnabled(!isAudioEnabled)
    }
  }

  const leaveMeeting = async () => {
    try {
      if (jitsiApi) {
        jitsiApi.dispose()
      } else if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      cleanup()
      
      // Navigate back to appropriate meetings page
      if (userRole === 'instructor') {
        router.push('/instructor/meetings')
      } else if (userRole === 'student') {
        router.push('/student/meetings')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error leaving meeting:', error)
      // Navigate anyway
      if (userRole === 'instructor') {
        router.push('/instructor/meetings')
      } else if (userRole === 'student') {
        router.push('/student/meetings')
      } else {
        router.push('/dashboard')
      }
    }
  }

  const openSettings = () => {
    // Jitsi Meet doesn't support toggleSettings command
    // The settings are accessible via the toolbar button in the Jitsi interface
    toast({
      title: "Settings",
      description: "Click the settings button (gear icon) in the Jitsi Meet toolbar below to access audio, video, and other settings.",
      duration: 5000,
    })
    
    // Try to focus and scroll to the Jitsi iframe so users can easily access the settings
    try {
      const container = document.getElementById('daily-container')
      if (container) {
        const iframe = container.querySelector('iframe') as HTMLIFrameElement
        if (iframe) {
          iframe.focus()
          // Scroll to the iframe to make it more visible
          iframe.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    } catch (error) {
      // Cross-origin restrictions might prevent this
      console.log('Could not interact with Jitsi iframe directly')
    }
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (jitsiApi) {
      jitsiApi.dispose()
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Meeting Room: {roomName}</h1>
            {isHost && (
              <Badge variant="default" className="mt-2">Host</Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openSettings}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Video Grid - Jitsi Meet Full Screen Container */}
        <div className="mb-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 relative" style={{ width: '100%', height: '70vh', minHeight: '600px' }}>
              <div 
                id="daily-container" 
                className="w-full h-full" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  minHeight: '600px',
                  position: 'relative'
                }} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-14 h-14"
              >
                {isVideoEnabled ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </Button>

              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full w-14 h-14"
              >
                {isAudioEnabled ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={leaveMeeting}
                className="rounded-full w-14 h-14"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-4 text-center text-sm text-gray-400">
          <p>Meeting Room: {roomName}</p>
          {jitsiApi ? (
            <p className="mt-1">
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''} in the meeting
            </p>
          ) : (
            <p className="mt-1">Connecting...</p>
          )}
          <p className="mt-2 text-green-400 text-xs">
            ✅ Powered by Jitsi Meet (Free & Open Source)
          </p>
        </div>
      </div>
    </div>
  )
}
