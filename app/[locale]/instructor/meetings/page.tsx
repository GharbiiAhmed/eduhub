"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  Play,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
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

export default function InstructorMeetingsPage() {
  const t = useTranslations('meetings')
  const tCommon = useTranslations('common')

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    participantType: "all",
    maxParticipants: 50,
    recordingEnabled: false
  })
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [courseStudents, setCourseStudents] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMeetings()
    fetchCourses()
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

  const fetchCourses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false })

    if (coursesData) {
      setCourses(coursesData)
    }
  }

  const fetchCourseStudents = async (courseId: string) => {
    if (!courseId) {
      setCourseStudents([])
      return
    }

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        profiles!inner (
          id,
          email,
          full_name
        )
      `)
      .eq("course_id", courseId)

    if (enrollments) {
      const students = enrollments.map((e: any) => ({
        id: e.student_id,
        ...e.profiles
      }))
      setCourseStudents(students)
    }
  }

  const handleCourseChange = (courseId: string) => {
    setFormData(prev => ({ ...prev, courseId }))
    setSelectedParticipants([])
    fetchCourseStudents(courseId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          courseId: formData.courseId || null,
          selectedParticipants: formData.participantType === 'selected' ? selectedParticipants : []
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('meetingCreated'),
          description: t('meetingCreatedSuccessfully'),
        })
        setIsDialogOpen(false)
        setFormData({
          courseId: "",
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          participantType: "all",
          maxParticipants: 50,
          recordingEnabled: false
        })
        setSelectedParticipants([])
        fetchMeetings()
      } else {
        throw new Error(data.error || "Failed to create meeting")
      }
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToCreateMeeting'),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('joinLiveVideoMeetings')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('createAndManageLiveVideoMeetings')}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('createMeeting')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('createNewMeeting')}</DialogTitle>
              <DialogDescription>
                {t('scheduleLiveVideoMeetingForCourse')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="course">{t('courseOptional')}</Label>
                  <Select value={formData.courseId || "none"} onValueChange={(value) => {
                    if (value === "none") {
                      handleCourseChange("")
                    } else {
                      handleCourseChange(value)
                    }
                  }}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder={t('selectCourseOptional')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noSpecificCourse')}</SelectItem>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">{t('meetingTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('enterMeetingTitle')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('enterMeetingDescription')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">{t('startTime')} *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">{t('endTime')}</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="participantType">{t('participants')}</Label>
                  <Select
                    value={formData.participantType}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, participantType: value }))
                      if (value === 'all') {
                        setSelectedParticipants([])
                      }
                    }}
                  >
                    <SelectTrigger id="participantType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCourseParticipants')}</SelectItem>
                      <SelectItem value="selected">{t('selectedParticipants')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.participantType === 'selected' && formData.courseId && (
                  <div>
                    <Label>{t('selectParticipants')}</Label>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                      {courseStudents.length > 0 ? (
                        courseStudents.map(student => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`student-${student.id}`}
                              checked={selectedParticipants.includes(student.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants(prev => [...prev, student.id])
                                } else {
                                  setSelectedParticipants(prev => prev.filter(id => id !== student.id))
                                }
                              }}
                            />
                            <label htmlFor={`student-${student.id}`} className="text-sm cursor-pointer">
                              {student.full_name || student.email}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">{t('noStudentsEnrolledInCourse')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="maxParticipants">{t('maxParticipants')}</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 50 }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('creating') : t('createMeeting')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <MeetingsCalendar meetings={meetings} userRole="instructor" />
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
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {meeting.participant_type === 'all' ? t('allParticipants') : t('selectedParticipants')}
                    </span>
                  </div>
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
            <h3 className="text-lg font-semibold mb-2">{t('noMeetingsYet')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('createFirstLiveMeetingToStartEngaging')}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('createMeeting')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

