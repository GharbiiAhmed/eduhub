"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import {
  Plus, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  Edit, 
  Trash2,
  Eye,
  GraduationCap,
  AlertCircle
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string | null
  max_points: number
  assignment_type: string
  is_published: boolean
  created_at: string
  courses: {
    id: string
    title: string
  }
  assignment_submissions: Array<{
    count: number
  }>
}

export default function InstructorAssignmentsPage() {
  const t = useTranslations('assignments')
  const tCommon = useTranslations('common')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    courseId: '',
    moduleId: '',
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    maxPoints: 100,
    assignmentType: 'essay',
    allowedFileTypes: [] as string[],
    maxFileSizeMb: 10,
    isPublished: false
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch assignments
      const assignmentsResponse = await fetch(`${window.location.origin}/api/assignments?role=instructor`)
      const assignmentsData = await assignmentsResponse.json()
      if (assignmentsData.assignments) {
        setAssignments(assignmentsData.assignments)
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
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: tCommon('error'),
        description: t('failedToLoadAssignments'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`${window.location.origin}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: formData.courseId,
          moduleId: formData.moduleId || null,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          dueDate: formData.dueDate || null,
          maxPoints: formData.maxPoints,
          assignmentType: formData.assignmentType,
          allowedFileTypes: formData.allowedFileTypes,
          maxFileSizeMb: formData.maxFileSizeMb,
          isPublished: formData.isPublished
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assignment')
      }

      toast({
        title: tCommon('success'),
        description: t('assignmentCreated'),
      })

      setIsCreateDialogOpen(false)
      setFormData({
        courseId: '',
        moduleId: '',
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        maxPoints: 100,
        assignmentType: 'essay',
        allowedFileTypes: [],
        maxFileSizeMb: 10,
        isPublished: false
      })
      fetchData()
    } catch (error: any) {
      console.error('Error creating assignment:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToCreateAssignment'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      const response = await fetch(`${window.location.origin}/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(tCommon('error'))
      }

      toast({
        title: tCommon('success'),
        description: t('assignmentDeleted'),
      })

      fetchData()
    } catch (error: any) {
      console.error('Error deleting assignment:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToDeleteAssignment'),
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('dueDate')
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('createAndManageAssignments')}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('createAssignment')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('createAssignment')}</DialogTitle>
                <DialogDescription>
                  {t('createNewAssignmentForCourse')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="courseId">{t('course')} *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectCourse')} />
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
                  <Label htmlFor="title">{t('assignmentTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('assignmentTitlePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('description')} *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('describeWhatStudentsNeedToDo')}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">{t('instructions')}</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder={t('detailedInstructions')}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">{t('dueDate')}</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPoints">{t('maxPoints')}</Label>
                    <Input
                      id="maxPoints"
                      type="number"
                      min="1"
                      value={formData.maxPoints}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxPoints: parseInt(e.target.value) || 100 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignmentType">{t('assignmentType')}</Label>
                  <Select
                    value={formData.assignmentType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignmentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essay">{t('essay')}</SelectItem>
                      <SelectItem value="project">{t('project')}</SelectItem>
                      <SelectItem value="file_upload">{t('fileUpload')}</SelectItem>
                      <SelectItem value="text">{t('text')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                  />
                  <Label htmlFor="isPublished">{t('publishImmediately')}</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('creating') : t('createAssignment')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('noAssignments')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('createFirstAssignmentToGetStarted')}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('createAssignment')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{assignment.title}</CardTitle>
                        {assignment.is_published ? (
                          <Badge variant="default">{t('published')}</Badge>
                        ) : (
                          <Badge variant="secondary">{tCommon('draft')}</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {assignment.courses.title}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/instructor/assignments/${assignment.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {tCommon('view')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/instructor/assignments/${assignment.id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {assignment.description}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(assignment.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{assignment.max_points} {t('points')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        {assignment.assignment_submissions?.[0]?.count || 0} {t('submissions')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="capitalize">{assignment.assignment_type}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  )
}

