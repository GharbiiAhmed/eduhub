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
import { Link } from '@/i18n/routing'
import { MeetingsCalendar } from "@/components/meetings/meetings-calendar"
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('meetings')
  const tCommon = useTranslations('common')

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
      title: t('linkCopied'),
      description: t('linkCopiedDesc'),
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">{t('scheduled')}</Badge>
      case 'live':
        return <Badge variant="default" className="bg-green-600">{t('live')}</Badge>
      case 'ended':
        return <Badge variant="outline">{t('ended')}</Badge>
      case 'cancelled':
        return <Badge variant="destructive">{t('cancelled')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return <div className="p-8">{tCommon('loading')}</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('joinLiveVideoMeetings')}
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {t('calendar')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            {t('list')}
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
                        {t('ends')}: {new Date(meeting.end_time).toLocaleString()}
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
                      {t('joinMeeting')}
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
            <h3 className="text-lg font-semibold mb-2">{t('noMeetingsAvailable')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('noMeetingsAvailableDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


