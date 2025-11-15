"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Video,
  Clock,
  Users,
  Play,
  Copy,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
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

interface MeetingsCalendarProps {
  meetings: Meeting[]
  onMeetingClick?: (meeting: Meeting) => void
  userRole?: 'instructor' | 'student'
}

export function MeetingsCalendar({ meetings, onMeetingClick, userRole = 'student' }: MeetingsCalendarProps) {
  const t = useTranslations('meetings')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const grouped: Record<string, Meeting[]> = {}
    meetings.forEach(meeting => {
      const date = format(new Date(meeting.start_time), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(meeting)
    })
    return grouped
  }, [meetings])

  // Get meetings for a specific date
  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return meetingsByDate[dateKey] || []
  }

  // Get all dates with meetings
  const datesWithMeetings = useMemo(() => {
    return Object.keys(meetingsByDate).map(date => new Date(date))
  }, [meetingsByDate])

  // Calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get previous/next month
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary" className="text-xs">{t('scheduled')}</Badge>
      case 'live':
        return <Badge variant="default" className="bg-green-600 text-xs">{t('live')}</Badge>
      case 'ended':
        return <Badge variant="outline" className="text-xs">{t('ended')}</Badge>
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">{t('cancelled')}</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>
    }
  }

  const handleCopyLink = (meetingUrl: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const fullUrl = `${window.location.origin}${meetingUrl}`
    navigator.clipboard.writeText(fullUrl)
    toast({
      title: t('linkCopied'),
      description: t('linkCopiedDesc'),
    })
  }

  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>
                {meetings.length} {meetings.length === 1 ? t('meetingScheduled') : t('meetingsScheduled')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                {t('today')}
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((day, index) => (
              <div key={index} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 p-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const dayMeetings = getMeetingsForDate(day)
              const hasMeetings = dayMeetings.length > 0
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] border rounded-lg p-1 cursor-pointer transition-colors",
                    !isCurrentMonth && "opacity-40",
                    isToday && "border-blue-500 border-2 bg-blue-50 dark:bg-blue-900/20",
                    isSelected && "border-blue-600 border-2 bg-blue-100 dark:bg-blue-900/30",
                    hasMeetings && !isSelected && "border-green-300 hover:border-green-400 bg-green-50/50 dark:bg-green-900/10",
                    !hasMeetings && !isToday && !isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  {hasMeetings && (
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 2).map(meeting => (
                        <div
                          key={meeting.id}
                          className={cn(
                            "text-xs p-1 rounded truncate",
                            meeting.status === 'live' && "bg-green-500 text-white",
                            meeting.status === 'scheduled' && "bg-blue-500 text-white",
                            meeting.status === 'ended' && "bg-gray-400 text-white",
                            meeting.status === 'cancelled' && "bg-red-500 text-white"
                          )}
                          title={meeting.title}
                        >
                          {format(new Date(meeting.start_time), 'HH:mm')} - {meeting.title}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                          +{dayMeetings.length - 2} {t('more')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Meetings */}
      {selectedDate && selectedDateMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('meetingsOn')} {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
            <CardDescription>
              {selectedDateMeetings.length} {selectedDateMeetings.length === 1 ? t('meeting') : t('meetings')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedDateMeetings.map(meeting => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{meeting.title}</CardTitle>
                        {meeting.courses && (
                          <CardDescription className="mt-1">
                            {t('course')}: {meeting.courses.title}
                          </CardDescription>
                        )}
                        {meeting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {meeting.description}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(meeting.start_time), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {meeting.end_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {t('until')} {format(new Date(meeting.end_time), 'HH:mm')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span className="capitalize">{meeting.participant_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {meeting.status === 'scheduled' || meeting.status === 'live' ? (
                        <Link href={meeting.meeting_url}>
                          <Button>
                            <Play className="w-4 h-4 mr-2" />
                            {meeting.status === 'live' ? t('joinMeeting') : t('joinNow')}
                          </Button>
                        </Link>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleCopyLink(meeting.meeting_url, e)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {t('copyLink')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No meetings for selected date */}
      {selectedDate && selectedDateMeetings.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('meetingsOn')} {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('noMeetingsScheduled')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('noMeetingsScheduledForDate')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

