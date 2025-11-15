"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
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

export default function InstructorMeetingsPage() {
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
          title: "Meeting created",
          description: "Your meeting has been created successfully.",
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
        title: "Error",
        description: error.message || "Failed to create meeting.",
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
            Create and manage live video meetings for your courses
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Meeting</DialogTitle>
              <DialogDescription>
                Schedule a live video meeting for your course
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="course">Course (Optional)</Label>
                  <Select value={formData.courseId || "none"} onValueChange={(value) => {
                    if (value === "none") {
                      handleCourseChange("")
                    } else {
                      handleCourseChange(value)
                    }
                  }}>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select a course (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific course</SelectItem>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter meeting title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter meeting description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="participantType">Participants</Label>
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
                      <SelectItem value="all">All Course Participants</SelectItem>
                      <SelectItem value="selected">Selected Participants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.participantType === 'selected' && formData.courseId && (
                  <div>
                    <Label>Select Participants</Label>
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
                        <p className="text-sm text-gray-500">No students enrolled in this course</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Meeting"}
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
                        Ends: {new Date(meeting.end_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {meeting.participant_type === 'all' ? 'All participants' : 'Selected participants'}
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
            <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first live meeting to start engaging with your students
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Meeting
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

