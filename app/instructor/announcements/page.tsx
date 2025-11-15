"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { 
  Plus, 
  Megaphone, 
  Calendar, 
  Edit, 
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  priority: string
  target_audience: string
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
  courses: {
    id: string
    title: string
  } | null
}

export default function InstructorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    courseId: '',
    isPublished: false,
    expiresAt: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch announcements for instructor's courses
      const response = await fetch('/api/announcements')
      const data = await response.json()
      if (data.announcements) {
        // Filter to only show announcements for instructor's courses
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: instructorCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('instructor_id', user.id)
          
          const courseIds = instructorCourses?.map(c => c.id) || []
          const filtered = data.announcements.filter((a: Announcement) => 
            a.courses && courseIds.includes(a.courses.id)
          )
          setAnnouncements(filtered)
        }
      }

      // Fetch instructor's courses
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('instructor_id', user.id)
          .order('created_at', { ascending: false })
        
        if (coursesData) {
          setCourses(coursesData)
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load announcements.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.courseId) {
      toast({
        title: "Error",
        description: "Please select a course.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
          targetAudience: 'course_students',
          courseId: formData.courseId,
          isPublished: formData.isPublished,
          expiresAt: formData.expiresAt || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create announcement')
      }

      toast({
        title: "Success",
        description: "Announcement created successfully.",
      })

      setIsCreateDialogOpen(false)
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        courseId: '',
        isPublished: false,
        expiresAt: ''
      })
      fetchData()
    } catch (error: any) {
      console.error('Error creating announcement:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete announcement')
      }

      toast({
        title: "Success",
        description: "Announcement deleted successfully.",
      })

      fetchData()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete announcement.",
      })
    }
  }

  const handlePublishAnnouncement = async (announcementId: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/publish`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to publish announcement')
      }

      toast({
        title: "Success",
        description: "Announcement published successfully.",
      })

      fetchData()
    } catch (error: any) {
      console.error('Error publishing announcement:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to publish announcement.",
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'default'
      case 'normal':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Announcements</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage announcements for your courses
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
                <DialogDescription>
                  Create a new announcement for your course students
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Important Course Update"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your announcement content here..."
                    rows={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                  />
                  <Label htmlFor="isPublished">Publish immediately</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Announcement'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No announcements yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first announcement to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        <Badge variant={getPriorityColor(announcement.priority) as any}>
                          {announcement.priority}
                        </Badge>
                        {announcement.is_published ? (
                          <Badge variant="default">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {announcement.courses?.title || 'Course Announcement'} • Published: {formatDate(announcement.published_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!announcement.is_published && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishAnnouncement(announcement.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Publish
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/instructor/announcements/${announcement.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.expires_at && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Expires: {formatDate(announcement.expires_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  )
}

