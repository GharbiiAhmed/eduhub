"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Calendar,
  Users,
  Clock,
  Play,
  Copy,
  CheckCircle,
  List,
  CalendarDays
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { MeetingsCalendar } from "@/components/meetings/meetings-calendar"

interface Meeting {
  id: string
  title: string
  description: string | null
  course_id: string | null
  courses: { id: string; title: string } | null
  start_time: string
  end_time: string | null
  status: string
  participant_type: string
  meeting_url: string
  created_at: string
}

export default function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings/list")
      const data = await response.json()

      if (data.success) {
        setMeetings(data.meetings || [])
      }
    } catch (error) {
      console.error("Error fetching meetings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = (meetingUrl: string) => {
    const fullUrl = `${window.location.origin}${meetingUrl}`
    navigator.clipboard.writeText(fullUrl)
    toast({
      title: "Link copied",
      description: "Meeting link has been copied to clipboard.",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'live':
        return <Badge variant="default" className="bg-green-600">Live</Badge>
      case 'ended':
        return <Badge variant="outline">Ended</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Meetings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join live video meetings for your enrolled courses
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <MeetingsCalendar meetings={meetings} userRole="student" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map(meeting => (
          <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                  {meeting.courses && (
                    <CardDescription className="mt-1">
                      {meeting.courses.title}
                    </CardDescription>
                  )}
                </div>
                {getStatusBadge(meeting.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meeting.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {meeting.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>
                      {new Date(meeting.start_time).toLocaleString()}
                    </span>
                  </div>
                  {meeting.end_time && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>
                        Ends: {new Date(meeting.end_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <Link href={meeting.meeting_url}>
                      <Play className="w-4 h-4 mr-2" />
                      Join Meeting
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(meeting.meeting_url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {meetings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings available</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any scheduled meetings yet. Check back later or contact your instructor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


